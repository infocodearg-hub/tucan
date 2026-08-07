-- ═══════════════════════════════════════════════════════════════════════════
-- `provision_tenant` guarda el nombre del dueño.
--
-- Antes creaba la membresía sin `nombre_mostrado`, así que la pantalla de
-- Usuarios y Permisos listaba al dueño como "Sin nombre". Además de quedar mal
-- en una demo, con dos o tres personas en el equipo no se distingue quién es
-- quién a la hora de repartir permisos.
-- ═══════════════════════════════════════════════════════════════════════════

-- Se borra la versión vieja en vez de usar `create or replace`: agregar un
-- parámetro (aunque tenga default) crea una SOBRECARGA, no un reemplazo, y
-- después las llamadas con tres argumentos quedan ambiguas.
drop function if exists public.provision_tenant(text, text, uuid);

create function public.provision_tenant(
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
    jsonb_build_object('alias', '', 'cbu', '', 'mercadopagoConectado', false,
                       'senaMinimaPorcentaje', 50),
    jsonb_build_object('slots', '[]'::jsonb, 'horaNocturnaDesde', '19:00',
                       'permitirCargaRetroactiva', false),
    jsonb_build_object('whatsappBotActivo', false, 'modo247', false,
                       'alertasSinSena', true, 'recordatorioAutomatico', false,
                       'ocrComprobantes', false)
  );

  insert into public.memberships (user_id, tenant_id, rol, nombre_mostrado)
  values (p_user_id, v_tenant_id, 'dueno', coalesce(nullif(trim(p_nombre_dueno), ''), 'Dueño'));

  return v_tenant_id;
end;
$$;

revoke execute on function public.provision_tenant(text, text, uuid, text) from anon, authenticated;
