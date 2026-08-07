-- ═══════════════════════════════════════════════════════════════════════════
-- TuCan — esquema multi-tenant inicial
--
-- Un "tenant" es un complejo deportivo. Cada complejo ve exclusivamente sus
-- propios datos, y ese aislamiento se hace cumplir en la base (RLS), no en la
-- interfaz: aunque alguien se arme un cliente propio con la anon key, no puede
-- leer ni escribir una fila de otro complejo.
--
-- Los ids de las entidades de negocio son TEXT y los genera el cliente
-- (src/lib/id.js, formato `bkg_k3f9a2xq7m`). Eso permite que el reducer aplique
-- el cambio de forma optimista sin esperar un id del servidor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────── tenants y membresías

create table public.tenants (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique
                       check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  nombre               text not null,
  activo               boolean not null default true,
  onboarding_completo  boolean not null default false,
  created_at           timestamptz not null default now()
);

comment on column public.tenants.slug is
  'Identificador público del complejo. Se usa en /reserva/<slug>; nunca expone el uuid.';

create type public.rol_miembro as enum ('dueno', 'empleado');

-- Permisos por defecto de un empleado nuevo: puede operar el día a día, no
-- puede ver plata agregada ni borrar nada. El dueño los ajusta desde
-- Configuración → Usuarios y permisos.
create table public.memberships (
  user_id          uuid not null references auth.users (id) on delete cascade,
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  rol              public.rol_miembro not null default 'empleado',
  permisos         jsonb not null default jsonb_build_object(
                     'gestionar_turnos',       true,
                     'gestionar_turnos_fijos', true,
                     'vender_cantina',         true,
                     'gestionar_clientes',     true,
                     'gestionar_productos',    false,
                     'gestionar_gastos',       false,
                     'ver_reportes',           false,
                     'eliminar_registros',     false
                   ),
  nombre_mostrado  text,
  created_at       timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index memberships_tenant_idx on public.memberships (tenant_id);

-- ─────────────────────────────────────────────────── helpers de autorización
--
-- SECURITY DEFINER a propósito: estas funciones leen `memberships`, que tiene
-- RLS. Si no saltearan RLS, la política de `memberships` se llamaría a sí misma
-- (recursión infinita). `search_path` fijo para que no se las pueda secuestrar
-- con un schema temporal.

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Hoy cada usuario pertenece a un solo complejo. Si algún día uno maneja
  -- varios, acá entra el "tenant activo" (claim del JWT o tabla de sesión).
  select m.tenant_id
    from public.memberships m
   where m.user_id = auth.uid()
   order by m.created_at
   limit 1;
$$;

create or replace function public.is_dueno()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.memberships m
     where m.user_id = auth.uid()
       and m.rol = 'dueno'
  );
$$;

-- El dueño tiene todo por definición. El empleado, solo lo que el dueño le
-- haya prendido explícitamente (ausente = denegado, nunca al revés).
create or replace function public.has_perm(p text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.memberships m
     where m.user_id = auth.uid()
       and (m.rol = 'dueno' or coalesce((m.permisos ->> p)::boolean, false))
  );
$$;

revoke execute on function public.current_tenant_id() from anon;
revoke execute on function public.is_dueno()          from anon;
revoke execute on function public.has_perm(text)      from anon;

-- ─────────────────────────────────────────────────── configuración del complejo

create table public.tenant_config (
  tenant_id      uuid primary key references public.tenants (id) on delete cascade,
  complejo       jsonb not null default '{}'::jsonb,
  pagos          jsonb not null default '{}'::jsonb,
  operacion      jsonb not null default '{}'::jsonb,
  integraciones  jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

comment on table public.tenant_config is
  'Espejo del slice `config`. NO existe una sección `acceso`: las credenciales '
  'viven en auth.users, nunca en datos de la aplicación.';

-- ─────────────────────────────────────────────────── entidades de negocio

create table public.canchas (
  id            text not null,
  tenant_id     uuid not null default public.current_tenant_id()
                references public.tenants (id) on delete cascade,
  nombre        text not null,
  subtitulo     text,
  deporte       text not null default 'futbol5',
  precio_dia    numeric(12,2) not null default 0,
  precio_noche  numeric(12,2) not null default 0,
  color         text,
  activa        boolean not null default true,
  orden         integer not null default 0,
  primary key (tenant_id, id)
);

-- La PK (tenant_id, id) ya es el índice único al que apuntan las FKs compuestas
-- del resto de las tablas: no hace falta un índice extra sobre las mismas
-- columnas.

create table public.clients (
  id                text not null,
  tenant_id         uuid not null default public.current_tenant_id()
                    references public.tenants (id) on delete cascade,
  nombre            text not null,
  telefono          text,
  email             text,
  score             numeric(4,2),
  etiquetas         jsonb not null default '[]'::jsonb,
  notas             text not null default '',
  historico_previo  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index clients_telefono_idx on public.clients (tenant_id, telefono);

create table public.products (
  id             text not null,
  tenant_id      uuid not null default public.current_tenant_id()
                 references public.tenants (id) on delete cascade,
  nombre         text not null,
  categoria      text not null default 'bebidas',
  precio         numeric(12,2) not null default 0,
  stock          integer not null default 0,
  stock_minimo   integer not null default 0,
  controla_stock boolean not null default true,
  icon_key       text,
  activo         boolean not null default true,
  primary key (tenant_id, id)
);

create table public.turnos_fijos (
  id                        text not null,
  tenant_id                 uuid not null default public.current_tenant_id()
                            references public.tenants (id) on delete cascade,
  cancha_id                 text not null,
  dia_semana                smallint not null check (dia_semana between 1 and 7),
  hora                      text not null,
  cliente_id                text,
  equipo_nombre             text,
  capitan_nombre            text,
  telefono                  text,
  vigente_desde             date,
  vigente_hasta             date,
  activo                    boolean not null default true,
  precio_mensual_override   numeric(12,2),
  estado_por_mes            jsonb not null default '{}'::jsonb,
  excepciones               jsonb not null default '[]'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  primary key (tenant_id, id),
  -- FK compuesta: es estructuralmente imposible apuntar a una cancha de otro
  -- complejo, aunque alguien mande el id a mano.
  foreign key (tenant_id, cancha_id) references public.canchas (tenant_id, id) on delete restrict,
  -- `set null (columna)` es sintaxis de PG 15+ y acá no es opcional: un
  -- `on delete set null` a secas intentaría anular TAMBIÉN `tenant_id`, que es
  -- NOT NULL, y el borrado del cliente fallaría con un error incomprensible.
  foreign key (tenant_id, cliente_id) references public.clients (tenant_id, id)
    on delete set null (cliente_id)
);

create table public.bookings (
  id                text not null,
  tenant_id         uuid not null default public.current_tenant_id()
                    references public.tenants (id) on delete cascade,
  fecha             date not null,
  hora              text not null,
  cancha_id         text not null,
  cliente_id        text,
  cliente_nombre    text,
  cliente_telefono  text,
  estado            text not null default 'reservado'
                    check (estado in ('reservado', 'cancelado', 'bloqueado')),
  origen_fijo_id    text,
  precio_cancha     numeric(12,2) not null default 0,
  notas             text not null default '',
  canal             text not null default 'mostrador',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, cancha_id)  references public.canchas (tenant_id, id) on delete restrict,
  foreign key (tenant_id, cliente_id) references public.clients (tenant_id, id)
    on delete set null (cliente_id),
  foreign key (tenant_id, origen_fijo_id) references public.turnos_fijos (tenant_id, id)
    on delete set null (origen_fijo_id)
);

create index bookings_fecha_idx on public.bookings (tenant_id, fecha);

-- ESTA es la defensa real contra la doble reserva. El guard de crossSlice.js es
-- de cliente: no protege cuando el panel, la página pública y el bot de n8n
-- escriben al mismo tiempo. Acá gana uno solo y el resto recibe un 23505.
create unique index bookings_slot_unico
  on public.bookings (tenant_id, cancha_id, fecha, hora)
  where estado <> 'cancelado';

create table public.payments (
  id          text not null,
  tenant_id   uuid not null default public.current_tenant_id()
              references public.tenants (id) on delete cascade,
  booking_id  text not null,
  monto       numeric(12,2) not null,
  metodo      text not null default 'efectivo',
  fecha       timestamptz not null default now(),
  nota        text not null default '',
  primary key (tenant_id, id),
  foreign key (tenant_id, booking_id) references public.bookings (tenant_id, id) on delete cascade
);

comment on table public.payments is
  'Los pagos de un turno (booking.pagos[] en el cliente). Es plata: merece filas '
  'reales, no un JSON adentro del turno. El mapper los re-anida al leer.';

create index payments_fecha_idx   on public.payments (tenant_id, fecha);
create index payments_booking_idx on public.payments (tenant_id, booking_id);

create table public.sales (
  id           text not null,
  tenant_id    uuid not null default public.current_tenant_id()
               references public.tenants (id) on delete cascade,
  fecha_hora   timestamptz not null default now(),
  items        jsonb not null default '[]'::jsonb,
  total        numeric(12,2) not null default 0,
  metodo_pago  text not null default 'efectivo',
  booking_id   text,
  cliente_id   text,
  cancha_id    text,
  anulada      boolean not null default false,
  primary key (tenant_id, id),
  foreign key (tenant_id, booking_id) references public.bookings (tenant_id, id)
    on delete set null (booking_id),
  foreign key (tenant_id, cliente_id) references public.clients (tenant_id, id)
    on delete set null (cliente_id),
  foreign key (tenant_id, cancha_id) references public.canchas (tenant_id, id)
    on delete set null (cancha_id)
);

comment on column public.sales.items is
  'Snapshot inmutable del ticket (nombre y precio unitario al momento de vender). '
  'Denormalizado a propósito: cambiar el precio de un producto no debe reescribir '
  'ventas del pasado.';

create index sales_fecha_idx   on public.sales (tenant_id, fecha_hora);
create index sales_booking_idx on public.sales (tenant_id, booking_id);

create table public.expenses (
  id          text not null,
  tenant_id   uuid not null default public.current_tenant_id()
              references public.tenants (id) on delete cascade,
  fecha       date not null,
  concepto    text not null,
  monto       numeric(12,2) not null default 0,
  categoria   text not null default 'otro',
  notas       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index expenses_fecha_idx on public.expenses (tenant_id, fecha);

-- ─────────────────────────────────────────────────── claves de API (bot n8n)

create table public.tenant_api_keys (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  nombre        text not null default 'Bot de WhatsApp',
  key_hash      text not null unique,
  key_prefijo   text not null,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

comment on table public.tenant_api_keys is
  'Solo el hash SHA-256 de la clave. La clave en claro se muestra una única vez '
  'al generarla y no se puede recuperar después.';

create index tenant_api_keys_tenant_idx on public.tenant_api_keys (tenant_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- `force` incluye al dueño de la tabla: ni siquiera el rol postgres se saltea
-- las políticas por accidente desde una conexión de aplicación.
-- Todas las políticas envuelven las funciones en (select ...) para que Postgres
-- las evalúe una vez por statement en vez de una vez por fila.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tenants         enable row level security;
alter table public.memberships     enable row level security;
alter table public.tenant_config   enable row level security;
alter table public.canchas         enable row level security;
alter table public.clients         enable row level security;
alter table public.products        enable row level security;
alter table public.turnos_fijos    enable row level security;
alter table public.bookings        enable row level security;
alter table public.payments        enable row level security;
alter table public.sales           enable row level security;
alter table public.expenses        enable row level security;
alter table public.tenant_api_keys enable row level security;

alter table public.tenants         force row level security;
alter table public.memberships     force row level security;
alter table public.tenant_config   force row level security;
alter table public.canchas         force row level security;
alter table public.clients         force row level security;
alter table public.products        force row level security;
alter table public.turnos_fijos    force row level security;
alter table public.bookings        force row level security;
alter table public.payments        force row level security;
alter table public.sales           force row level security;
alter table public.expenses        force row level security;
alter table public.tenant_api_keys force row level security;

-- ── tenants: se lee el propio, lo escribe solo el dueño (y solo el nombre/slug
--    los cambia un admin nuestro con service_role, que saltea RLS).
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = (select public.current_tenant_id()));

create policy tenants_update on public.tenants
  for update to authenticated
  using (id = (select public.current_tenant_id()) and (select public.is_dueno()))
  with check (id = (select public.current_tenant_id()));

-- ── memberships: todos ven quién trabaja en su complejo (la UI muestra el
--    nombre del que cargó cada cosa); solo el dueño da de alta y edita permisos.
create policy memberships_select on public.memberships
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy memberships_write on public.memberships
  for all to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()))
  with check (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()));

-- ── configuración: la lee todo el equipo (precios y horarios hacen falta para
--    operar), la escribe solo el dueño.
create policy tenant_config_select on public.tenant_config
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy tenant_config_write on public.tenant_config
  for all to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()))
  with check (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()));

-- ── Entidades de negocio.
--
-- Nota honesta sobre el alcance de los permisos: lo que la base puede hacer
-- cumplir es el acceso a gastos, a la configuración, a la gestión de usuarios y
-- el derecho a borrar. "Ver Reportes" es gating de interfaz, porque los turnos y
-- las ventas crudas son necesarios para operar la caja — quien tiene acceso a la
-- app siempre podría sumarlos por su cuenta. No se vende como seguridad lo que
-- es una comodidad de interfaz.

-- canchas: las lee todo el equipo, las gestiona el dueño (van con los precios).
create policy canchas_select on public.canchas
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy canchas_write on public.canchas
  for all to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()))
  with check (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()));

create policy clients_select on public.clients
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy clients_insert on public.clients
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_clientes')));

create policy clients_update on public.clients
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_clientes')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy clients_delete on public.clients
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_clientes'))
         and (select public.has_perm('eliminar_registros')));

create policy products_select on public.products
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

-- El stock baja con cada venta, así que quien puede vender tiene que poder
-- actualizar el producto aunque no administre el catálogo.
create policy products_update on public.products
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and ((select public.has_perm('gestionar_productos'))
              or (select public.has_perm('vender_cantina'))))
  with check (tenant_id = (select public.current_tenant_id()));

create policy products_insert on public.products
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_productos')));

create policy products_delete on public.products
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_productos'))
         and (select public.has_perm('eliminar_registros')));

create policy turnos_fijos_select on public.turnos_fijos
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy turnos_fijos_insert on public.turnos_fijos
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_turnos_fijos')));

create policy turnos_fijos_update on public.turnos_fijos
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos_fijos')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy turnos_fijos_delete on public.turnos_fijos
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos_fijos'))
         and (select public.has_perm('eliminar_registros')));

create policy bookings_select on public.bookings
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy bookings_insert on public.bookings
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_turnos')));

create policy bookings_update on public.bookings
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy bookings_delete on public.bookings
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos'))
         and (select public.has_perm('eliminar_registros')));

-- Cobrar un turno es parte de gestionarlo. Borrar un pago, en cambio, es
-- corregir plata ya registrada: pide además el permiso de eliminar.
create policy payments_select on public.payments
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy payments_insert on public.payments
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_turnos')));

create policy payments_update on public.payments
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy payments_delete on public.payments
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_turnos'))
         and (select public.has_perm('eliminar_registros')));

create policy sales_select on public.sales
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy sales_insert on public.sales
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('vender_cantina')));

-- Anular una venta es un update (anulada = true), no un delete.
create policy sales_update on public.sales
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('vender_cantina')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy sales_delete on public.sales
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('vender_cantina'))
         and (select public.has_perm('eliminar_registros')));

-- Gastos: acá el permiso SÍ es seguridad real. Un empleado sin permiso no puede
-- ni leer la fila, así que no hay forma de reconstruir el resultado del día.
create policy expenses_select on public.expenses
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and ((select public.has_perm('gestionar_gastos'))
              or (select public.has_perm('ver_reportes'))));

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id())
              and (select public.has_perm('gestionar_gastos')));

create policy expenses_update on public.expenses
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_gastos')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy expenses_delete on public.expenses
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id())
         and (select public.has_perm('gestionar_gastos'))
         and (select public.has_perm('eliminar_registros')));

-- Claves de API: solo el dueño. El hash se ve, la clave en claro no existe acá.
create policy tenant_api_keys_all on public.tenant_api_keys
  for all to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()))
  with check (tenant_id = (select public.current_tenant_id()) and (select public.is_dueno()));

-- ═══════════════════════════════════════════════════════════════════════════
-- Provisión de cuentas
--
-- Se ejecuta con service_role (script tools/provision.mjs o el SQL editor),
-- NUNCA desde el navegador: por eso queda revocada para anon y authenticated.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.provision_tenant(
  p_nombre  text,
  p_slug    text,
  p_user_id uuid
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
    jsonb_build_object('alias', '', 'cbu', '', 'mercadopagoConectado', false,
                       'senaMinimaPorcentaje', 50),
    jsonb_build_object('slots', '[]'::jsonb, 'horaNocturnaDesde', '19:00',
                       'permitirCargaRetroactiva', false),
    jsonb_build_object('whatsappBotActivo', false, 'modo247', false,
                       'alertasSinSena', true, 'recordatorioAutomatico', false,
                       'ocrComprobantes', false)
  );

  insert into public.memberships (user_id, tenant_id, rol)
  values (p_user_id, v_tenant_id, 'dueno');

  return v_tenant_id;
end;
$$;

revoke execute on function public.provision_tenant(text, text, uuid) from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Realtime
--
-- Para que un turno cargado por el bot de n8n, por la página pública o por el
-- otro empleado aparezca en pantalla sin apretar F5. Realtime respeta RLS: cada
-- cliente solo recibe eventos de las filas que ya podría leer.
-- ═══════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table
  public.canchas,
  public.clients,
  public.products,
  public.turnos_fijos,
  public.bookings,
  public.payments,
  public.sales,
  public.expenses,
  public.tenant_config;
