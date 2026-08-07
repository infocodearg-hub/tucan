-- ═══════════════════════════════════════════════════════════════════════════
-- Soporte para las Edge Functions (reserva pública y bot de n8n)
--
-- Estas tablas y funciones las usa exclusivamente el código del servidor, con
-- `service_role`. Tienen RLS habilitada y CERO políticas: `service_role` la
-- saltea por diseño, y cualquier otro rol —incluido `anon` con la clave que
-- viaja en el navegador— se queda afuera de todo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────── límite de peticiones

create table public.rate_limit_hits (
  id         bigserial primary key,
  clave      text not null,
  created_at timestamptz not null default now()
);

comment on table public.rate_limit_hits is
  'Un registro por petición a las funciones públicas. `clave` es un hash de IP '
  '(o de API key), nunca la IP en claro: alcanza para contar y no guarda un dato '
  'personal más de lo necesario.';

create index rate_limit_hits_clave_idx on public.rate_limit_hits (clave, created_at desc);

alter table public.rate_limit_hits enable row level security;

/**
 * Registra el intento y devuelve `true` si se pasó del límite.
 *
 * Se hace en una sola llamada (contar + insertar) para que dos peticiones
 * simultáneas no puedan colarse las dos leyendo el mismo conteo viejo.
 */
create or replace function public.registrar_intento(
  p_clave     text,
  p_limite    integer,
  p_ventana   interval
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cantidad integer;
begin
  insert into public.rate_limit_hits (clave) values (p_clave);

  select count(*) into v_cantidad
    from public.rate_limit_hits
   where clave = p_clave
     and created_at > now() - p_ventana;

  -- Limpieza oportunista: sin esto la tabla crece para siempre. Se corre una
  -- vez cada tanto en vez de en cada llamada para no pagar el costo siempre.
  if random() < 0.01 then
    delete from public.rate_limit_hits where created_at < now() - interval '1 day';
  end if;

  return v_cantidad > p_limite;
end;
$$;

revoke execute on function public.registrar_intento(text, integer, interval) from anon, authenticated;

-- ─────────────────────────────────────────────────── alta de miembros

/**
 * Crea la membresía de un empleado en el complejo del dueño que la pide.
 *
 * La Edge Function `invitar-miembro` crea el usuario con la Admin API y llama
 * acá. El `p_dueno_id` se toma del token verificado del que llama, jamás del
 * cuerpo de la petición: si no, cualquiera podría sumarse a un complejo ajeno.
 */
create or replace function public.agregar_miembro(
  p_dueno_id  uuid,
  p_user_id   uuid,
  p_nombre    text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id
    from public.memberships
   where user_id = p_dueno_id
     and rol = 'dueno'
   limit 1;

  if v_tenant_id is null then
    raise exception 'Solo el dueño puede agregar usuarios al complejo'
      using errcode = '42501';
  end if;

  insert into public.memberships (user_id, tenant_id, rol, nombre_mostrado)
  values (p_user_id, v_tenant_id, 'empleado', p_nombre)
  on conflict (user_id, tenant_id) do update set nombre_mostrado = excluded.nombre_mostrado;

  return v_tenant_id;
end;
$$;

revoke execute on function public.agregar_miembro(uuid, uuid, text) from anon, authenticated;
