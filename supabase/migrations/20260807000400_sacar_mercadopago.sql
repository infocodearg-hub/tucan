-- Saca el campo `mercadopagoConectado` de `tenant_config.pagos`, tanto de los
-- tenants ya provisionados como del default que arma `provision_tenant` para
-- los nuevos de acá en adelante. Nunca hubo una integración real detrás (ver
-- `ConfiguracionComplejo.jsx` y `bot/index.ts`, ambos actualizados en el
-- mismo cambio) — era un badge estático que decía "Integrado / ONLINE" sin
-- que nada lo prendiera. El cobro es 100% transferencia + verificación
-- manual (OCR/Visión IA del bot + revisión del empleado/dueño), así que el
-- campo queda sin sentido.

update public.tenant_config
set pagos = pagos - 'mercadopagoConectado'
where pagos ? 'mercadopagoConectado';

-- Copia exacta de `provision_tenant` tal como quedó en
-- 20260807000000_turno_pendiente.sql, sin la clave `mercadopagoConectado`
-- del jsonb de `pagos`. Nada más cambia.
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
    jsonb_build_object('alias', '', 'cbu', '', 'titular', '',
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
