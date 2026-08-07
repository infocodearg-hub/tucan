-- ═══════════════════════════════════════════════════════════════════════════
-- Estado del bot de WhatsApp: pausa, memoria y bandeja de derivaciones.
--
-- El bot de n8n necesita saber tres cosas en cada mensaje: si está pausado
-- (porque una persona tomó la conversación), con qué sufijo de sesión arrancar
-- la memoria, y quién es el que escribe. En el bot de seguros eso lo resolvía
-- una API externa; acá vive en la misma base que los turnos, que es donde
-- tiene que estar.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.bot_sesiones (
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  telefono_clave     text not null,
  telefono           text not null,
  pausado_hasta      timestamptz,
  -- Cambia con cada derivación. La memoria del agente cuelga de
  -- `<telefono>:<session_suffix>`, así que incrementarlo equivale a que la
  -- conversación arranque limpia sin borrar nada de Redis.
  session_suffix     integer not null default 0,
  cliente_id         text,
  ultimo_mensaje_at  timestamptz,
  created_at         timestamptz not null default now(),
  primary key (tenant_id, telefono_clave),
  foreign key (tenant_id, cliente_id) references public.clients (tenant_id, id)
    on delete set null (cliente_id)
);

create table public.bot_derivaciones (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  telefono      text not null,
  nombre        text,
  motivo        text not null,
  booking_id    text,
  estado        text not null default 'abierta' check (estado in ('abierta', 'atendida')),
  created_at    timestamptz not null default now(),
  atendida_at   timestamptz,
  atendida_por  uuid references auth.users (id) on delete set null,
  foreign key (tenant_id, booking_id) references public.bookings (tenant_id, id)
    on delete set null (booking_id)
);

create index bot_derivaciones_abiertas_idx
  on public.bot_derivaciones (tenant_id, created_at desc)
  where estado = 'abierta';

-- ─────────────────────────────────────────────────── RLS

alter table public.bot_sesiones     enable row level security;
alter table public.bot_derivaciones enable row level security;
alter table public.bot_sesiones     force  row level security;
alter table public.bot_derivaciones force  row level security;

-- `bot_sesiones` a propósito SIN políticas: nadie con una sesión de usuario
-- tiene por qué leer los teléfonos de todas las conversaciones. La toca solo la
-- Edge Function con service_role, que saltea RLS.

-- La bandeja sí la ve el equipo: es el trabajo pendiente del mostrador.
create policy bot_derivaciones_select on public.bot_derivaciones
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

-- Marcar "atendida" y reactivar el bot. No hay insert ni delete para
-- authenticated: las derivaciones las crea el bot, y no se borran — son el
-- registro de qué pidió un cliente y si alguien lo atendió.
create policy bot_derivaciones_update on public.bot_derivaciones
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos')))
  with check (tenant_id = (select public.current_tenant_id()));

-- El badge de la navbar tiene que aparecer sin recargar.
alter publication supabase_realtime add table public.bot_derivaciones;

-- ─────────────────────────────────────────────────── reactivar

create or replace function public.reactivar_bot(p_tenant uuid, p_telefono_clave text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.bot_sesiones
     set pausado_hasta = null,
         session_suffix = session_suffix + 1
   where tenant_id = p_tenant
     and telefono_clave = p_telefono_clave;
$$;

revoke execute on function public.reactivar_bot(uuid, text) from anon;

comment on function public.reactivar_bot(uuid, text) is
  'La llama el panel al apretar "Atender y reactivar bot". Es security definer '
  'porque bot_sesiones no tiene políticas: el empleado no puede tocar la tabla '
  'directo, pero sí puede pedir esta operación acotada sobre un solo teléfono.';

-- ─────────────────────────────────────────────────── comprobantes

-- Bucket privado. 8 MB alcanza de sobra para una captura de transferencia y
-- pone un techo a lo que puede subir alguien con la clave del bot.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El primer segmento del path es el tenant_id. Es el servidor quien arma ese
-- path al emitir la URL firmada, así que n8n no puede escribir fuera de su
-- complejo ni aunque quisiera.
drop policy if exists comprobantes_select on storage.objects;
create policy comprobantes_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select public.current_tenant_id())::text
  );

-- Sin política de insert/update/delete para `authenticated` ni `anon`: los
-- archivos entran únicamente por la URL firmada que emite la Edge Function.
