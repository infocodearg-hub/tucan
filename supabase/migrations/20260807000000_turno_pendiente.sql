-- ═══════════════════════════════════════════════════════════════════════════
-- Turno "pendiente de confirmación".
--
-- Hasta acá, reservar desde la web pública creaba un turno idéntico al que
-- carga el mostrador: confirmado, sin cobrar y sin verificar. Un desconocido
-- ocupaba un sábado a la noche gratis y sin dejar rastro.
--
-- Se agrega UN estado nuevo: `pendiente`. El turno nace ahí, ocupa el slot,
-- y vence. `reservado` sigue significando "confirmado" en todo el resto del
-- código, así que la superficie del cambio es la mínima posible.
--
-- El índice `bookings_slot_unico` NO se toca: su `where estado <> 'cancelado'`
-- ya hace que un pendiente bloquee la doble reserva. Era exactamente el punto
-- de haberlo escrito así y no como `where estado = 'reservado'`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────── bookings

alter table public.bookings drop constraint bookings_estado_check;
alter table public.bookings add constraint bookings_estado_check
  check (estado in ('reservado', 'pendiente', 'cancelado', 'bloqueado'));

alter table public.bookings
  add column expira_at          timestamptz,
  add column codigo             text,
  add column motivo_cancelacion text;

comment on column public.bookings.expira_at is
  'Solo para estado = pendiente: cuándo se libera el slot si nadie confirma. '
  'Null en cualquier otro estado.';
comment on column public.bookings.codigo is
  'Código corto que el jugador lleva al WhatsApp del bot. Es el único vínculo '
  'confiable entre la reserva web y el chat: el teléfono del formulario es '
  'opcional y casi nunca coincide con el número desde el que escribe.';
comment on column public.bookings.motivo_cancelacion is
  'vencimiento | cliente_wa | mostrador. Distingue el pendiente que se venció '
  'solo (recuperable, ver confirmar_pendiente) del que canceló una persona.';

-- Dos turnos del mismo complejo no pueden compartir código mientras estén
-- vivos. Los cancelados quedan afuera: sus códigos se pueden reciclar.
create unique index bookings_codigo_unico
  on public.bookings (tenant_id, codigo)
  where codigo is not null and estado in ('pendiente', 'reservado');

-- El barrido de vencidos corre cada 5 minutos sobre TODOS los complejos. Sin
-- este índice parcial sería un seq scan de la tabla entera, 288 veces por día.
create index bookings_pendientes_idx
  on public.bookings (expira_at)
  where estado = 'pendiente';

-- ─────────────────────────────────────────────────── teléfono normalizado
--
-- `+543416123456` (lo que devuelve normalizarTelefono sobre un fijo con 0) y
-- `+5493416123456` (lo que manda WhatsApp) son la misma persona y no matchean
-- nunca por igualdad. Los últimos 10 dígitos sí: característica + número.
-- Columna generada y no un índice funcional para que el bot pueda filtrar por
-- ella desde PostgREST, que no sabe escribir expresiones.

alter table public.clients
  add column telefono_clave text
  generated always as (
    nullif(right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 10), '')
  ) stored;

alter table public.bookings
  add column cliente_telefono_clave text
  generated always as (
    nullif(right(regexp_replace(coalesce(cliente_telefono, ''), '\D', '', 'g'), 10), '')
  ) stored;

create index clients_tel_clave_idx
  on public.clients (tenant_id, telefono_clave)
  where telefono_clave is not null;

create index bookings_tel_clave_idx
  on public.bookings (tenant_id, cliente_telefono_clave, fecha)
  where estado in ('pendiente', 'reservado');

-- ─────────────────────────────────────────────────── payments: seña sin validar
--
-- El bot confirma el turno apenas llega el comprobante, pero nadie miró esa
-- foto todavía. `validado = false` es lo que hace que el dueño vea la
-- diferencia entre plata que contó y plata que alguien dijo que mandó.

alter table public.payments
  add column comprobante_path text,
  add column validado         boolean not null default false,
  add column validado_at      timestamptz,
  add column validado_por     uuid references auth.users (id) on delete set null,
  add column ref_externa      text;

comment on column public.payments.ref_externa is
  'Identidad del pago en el sistema de origen: `wa:<message_id>` de Chatwoot. '
  'El índice único de abajo es lo que hace idempotente el reenvío del mismo '
  'comprobante: el mismo mensaje no puede insertar dos pagos.';

create unique index payments_ref_externa_unica
  on public.payments (tenant_id, ref_externa)
  where ref_externa is not null;

-- Los pagos cargados a mano quedan validados: los contó una persona.
update public.payments set validado = true where ref_externa is null;

-- ─────────────────────────────────────────────────── configuración nueva
--
-- `jsonb ||` mergea a nivel superficial y el operando derecho gana, así que se
-- pone la configuración vieja a la derecha: los defaults solo rellenan lo que
-- falta y nunca pisan lo que el dueño ya configuró.

update public.tenant_config
   set operacion = jsonb_build_object(
         'minutosExpiracionPendiente', 60,
         'horasMinimasCancelacion', 12,
         'horarioAtencion', jsonb_build_object('desde', '09:00', 'hasta', '23:59')
       ) || operacion,
       pagos = jsonb_build_object(
         'titular', '',
         'politicaSena', 'credito'
       ) || pagos,
       integraciones = jsonb_build_object(
         'maxTurnosActivosPorTelefono', 2,
         'exigirValidacionManual', false
       ) || integraciones;

-- Y lo mismo para los complejos que se den de alta de acá en adelante.
create or replace function public.provision_tenant(
  p_nombre       text,
  p_slug         text,
  p_user_id      uuid,
  p_nombre_dueno text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
begin
  insert into public.tenants (nombre, slug)
  values (p_nombre, p_slug)
  returning id into v_tenant_id;

  insert into public.tenant_config (tenant_id, complejo, pagos, operacion, integraciones)
  values (
    v_tenant_id,
    jsonb_build_object('nombre', p_nombre, 'ciudad', '', 'direccion', '', 'telefono', ''),
    jsonb_build_object('alias', '', 'cbu', '', 'titular', '', 'mercadopagoConectado', false,
                       'senaMinimaPorcentaje', 50, 'politicaSena', 'credito'),
    jsonb_build_object('slots', '[]'::jsonb, 'horaNocturnaDesde', '19:00',
                       'permitirCargaRetroactiva', false,
                       'minutosExpiracionPendiente', 60, 'horasMinimasCancelacion', 12,
                       'horarioAtencion', jsonb_build_object('desde', '09:00', 'hasta', '23:59')),
    jsonb_build_object('whatsappBotActivo', false, 'modo247', false,
                       'alertasSinSena', true, 'recordatorioAutomatico', false,
                       'ocrComprobantes', false,
                       'maxTurnosActivosPorTelefono', 2, 'exigirValidacionManual', false)
  );

  insert into public.memberships (user_id, tenant_id, rol, nombre_mostrado)
  values (p_user_id, v_tenant_id, 'dueno', coalesce(nullif(trim(p_nombre_dueno), ''), 'Dueño'));

  return v_tenant_id;
end;
$$;

revoke execute on function public.provision_tenant(text, text, uuid, text) from anon, authenticated;

-- ─────────────────────────────────────────────────── vencimiento de pendientes
--
-- `p_tenant null` barre todos los complejos: así lo llama el cron. Con un
-- tenant concreto lo llama cada acción del bot antes de mirar disponibilidad,
-- para que nadie vea como ocupado un slot que ya venció.

create or replace function public.expirar_pendientes(p_tenant uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cuantos integer;
begin
  update public.bookings
     set estado = 'cancelado',
         motivo_cancelacion = 'vencimiento',
         updated_at = now()
   where estado = 'pendiente'
     and expira_at is not null
     and expira_at < now()
     and (p_tenant is null or tenant_id = p_tenant);

  get diagnostics v_cuantos = row_count;
  return v_cuantos;
end;
$$;

revoke execute on function public.expirar_pendientes(uuid) from anon, authenticated;

comment on function public.expirar_pendientes(uuid) is
  'Cancela los pendientes vencidos y libera el slot. El panel es Realtime: sin '
  'el cron, un slot vencido seguiría pintado como ocupado en la pantalla del '
  'dueño hasta que alguien consultara disponibilidad. El UPDATE dispara el '
  'evento y el slot se libera solo.';

-- ─────────────────────────────────────────────────── confirmar sin carrera
--
-- La carrera más probable de todas: el cliente transfiere en el minuto 58 y el
-- comprobante llega cuando el cron ya pasó. Esto NO se puede resolver leyendo
-- y después escribiendo — entre las dos operaciones cabe todo.
--
--   confirmado       el UPDATE agarró un pendiente vivo
--   ya_confirmado    llegó dos veces el mismo comprobante, o dos fotos del mismo pago
--   revivido         estaba vencido, nadie tomó el slot, vuelve
--   slot_tomado      estaba vencido y otro lo agarró: el pago queda pegado al cancelado
--   cancelado_manual lo canceló una persona; el bot no revive eso
--   no_existe        id inventado o de otro complejo

create or replace function public.confirmar_pendiente(
  p_tenant  uuid,
  p_booking text,
  p_gracia  interval default '30 minutes'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado text;
  v_motivo text;
  v_expira timestamptz;
  v_ok     boolean;
begin
  -- Camino feliz: compare-and-swap. El `where estado = 'pendiente'` es la
  -- condición y la escritura en la misma sentencia, o sea atómico.
  update public.bookings
     set estado = 'reservado',
         expira_at = null,
         updated_at = now()
   where tenant_id = p_tenant
     and id = p_booking
     and estado = 'pendiente';

  if found then return 'confirmado'; end if;

  select estado, motivo_cancelacion, expira_at
    into v_estado, v_motivo, v_expira
    from public.bookings
   where tenant_id = p_tenant and id = p_booking;

  if not found                      then return 'no_existe';       end if;
  if v_estado = 'reservado'         then return 'ya_confirmado';   end if;
  if v_estado <> 'cancelado'        then return 'no_existe';       end if;
  if v_motivo is distinct from 'vencimiento' then return 'cancelado_manual'; end if;

  -- Venció, pero hace poco. Se intenta revivir y decide el índice único
  -- parcial: si nadie tomó el slot pasa, y si alguien lo tomó tira 23505.
  if v_expira is null or v_expira < now() - p_gracia then
    return 'slot_tomado';
  end if;

  begin
    update public.bookings
       set estado = 'reservado',
           expira_at = null,
           motivo_cancelacion = null,
           updated_at = now()
     where tenant_id = p_tenant and id = p_booking and estado = 'cancelado';
    v_ok := found;
  exception when unique_violation then
    return 'slot_tomado';
  end;

  return case when v_ok then 'revivido' else 'slot_tomado' end;
end;
$$;

revoke execute on function public.confirmar_pendiente(uuid, text, interval) from anon, authenticated;

-- ─────────────────────────────────────────────────── barrido programado
--
-- pg_cron puede no estar habilitado (plan, permisos, entorno local). Si falla,
-- la migración sigue: la expiración perezosa de cada acción del bot cubre la
-- corrección de los datos; lo que se pierde sin cron es que el slot se libere
-- solo en la pantalla del dueño.

do $$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('expirar-pendientes')
    where exists (select 1 from cron.job where jobname = 'expirar-pendientes');

  perform cron.schedule(
    'expirar-pendientes',
    '*/5 * * * *',
    $cron$ select public.expirar_pendientes() $cron$
  );
exception when others then
  raise warning 'pg_cron no disponible (%). Los pendientes vencidos se van a '
                'cancelar igual en la próxima acción del bot, pero el slot no '
                'se va a liberar solo en la grilla. Programalo a mano.', sqlerrm;
end;
$$;
