-- ═══════════════════════════════════════════════════════════════════════════
-- Mute manual de clientes — el dueño corta al bot para un teléfono puntual,
-- sin necesidad de una derivación de por medio y sin que expire en 24 horas
-- (a diferencia de `pausado_hasta`, que es automático y temporal).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.bot_sesiones
  add column muteado        boolean not null default false,
  add column muteado_en     timestamptz,
  -- Nombre libre, cargado a mano al mutear un teléfono que TODAVÍA no le
  -- escribió nunca al bot (por eso no hay fila en `clients` con la que
  -- cruzar) — se muestra tal cual en el listado del panel.
  add column muteado_nombre text;

-- ─────────────────────────────────────────────────── mutear / desmutear

create or replace function public.mutear_bot(p_tenant uuid, p_telefono text, p_nombre text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clave text;
begin
  -- Mismo criterio de scoping que la corrección de reactivar_bot() más abajo:
  -- sin este chequeo, cualquier usuario autenticado (de OTRO complejo) podía
  -- pasar un `p_tenant` ajeno y mutear el teléfono de un cliente que no es
  -- suyo — la función es security definer y bot_sesiones no tiene políticas.
  if p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  -- Misma normalización que claveTelefono() en supabase/functions/_shared/http.ts:
  -- se queda con los dígitos y toma los últimos 10 (o null si quedan menos de 8).
  v_clave := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 10);
  if length(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g')) < 8 then
    raise exception 'Teléfono inválido.' using errcode = '22023';
  end if;

  insert into public.bot_sesiones (tenant_id, telefono_clave, telefono, muteado, muteado_en, muteado_nombre)
  values (p_tenant, v_clave, p_telefono, true, now(), nullif(trim(coalesce(p_nombre, '')), ''))
  on conflict (tenant_id, telefono_clave) do update
    set muteado = true,
        muteado_en = now(),
        muteado_nombre = coalesce(nullif(trim(coalesce(p_nombre, '')), ''), public.bot_sesiones.muteado_nombre);
end;
$$;

create or replace function public.desmutear_bot(p_tenant uuid, p_telefono_clave text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  update public.bot_sesiones
     set muteado = false
   where tenant_id = p_tenant
     and telefono_clave = p_telefono_clave;
end;
$$;

revoke execute on function public.mutear_bot(uuid, text, text)    from anon;
revoke execute on function public.desmutear_bot(uuid, text)       from anon;

comment on function public.mutear_bot(uuid, text, text) is
  'Corta al bot para un teléfono, a mano y sin vencimiento (a diferencia de '
  'pausado_hasta). Crea la fila de bot_sesiones si el teléfono nunca escribió '
  '— se puede mutear preventivamente. Valida p_tenant = current_tenant_id() '
  'porque bot_sesiones no tiene políticas RLS propias.';

comment on function public.desmutear_bot(uuid, text) is
  'Inverso de mutear_bot(). Mismo chequeo de tenant que reactivar_bot().';

-- ─────────────────────────────────────────────────── endurecer reactivar_bot
--
-- Encontrado al escribir mutear_bot/desmutear_bot: reactivar_bot() (sesión
-- anterior) solo revocaba `anon`, no `authenticated` — y no validaba que
-- `p_tenant` fuera el propio del que llama. Como es security definer y
-- bot_sesiones no tiene políticas, CUALQUIER usuario autenticado (de
-- cualquier complejo) podía reactivar el bot de OTRO tenant pasándole su id a
-- mano. Se corrige acá, en el mismo movimiento, con el mismo criterio que las
-- dos funciones nuevas de arriba.

create or replace function public.reactivar_bot(p_tenant uuid, p_telefono_clave text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  update public.bot_sesiones
     set pausado_hasta = null,
         session_suffix = session_suffix + 1
   where tenant_id = p_tenant
     and telefono_clave = p_telefono_clave;
end;
$$;

revoke execute on function public.reactivar_bot(uuid, text) from anon;
