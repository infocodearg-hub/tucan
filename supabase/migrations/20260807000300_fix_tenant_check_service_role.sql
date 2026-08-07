-- ═══════════════════════════════════════════════════════════════════════════
-- Corrige el chequeo de tenant agregado en 20260807000200: `current_tenant_id()`
-- depende de `auth.uid()`, que es NULL cuando quien llama es `service_role`
-- (la Edge Function del bot, o `tools/test-bot.mjs` contra el proyecto real).
-- Con el chequeo tal como quedó, CUALQUIER llamada de service_role a
-- reactivar_bot/mutear_bot/desmutear_bot pasaba `p_tenant IS DISTINCT FROM
-- NULL` → siempre verdadero → siempre "No autorizado", incluida la que ya
-- usaba el propio proyecto.
--
-- El caso a cubrir es doble: el panel (usuario autenticado, tiene que
-- coincidir con SU tenant) y el service_role (ya bypassea RLS por diseño en
-- toda la base — acá se lo deja pasar explícito, porque esto es un chequeo
-- de aplicación adentro de la función, no una policy).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.reactivar_bot(p_tenant uuid, p_telefono_clave text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role'
     and (p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos')) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  update public.bot_sesiones
     set pausado_hasta = null,
         session_suffix = session_suffix + 1
   where tenant_id = p_tenant
     and telefono_clave = p_telefono_clave;
end;
$$;

create or replace function public.mutear_bot(p_tenant uuid, p_telefono text, p_nombre text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clave text;
begin
  if auth.role() <> 'service_role'
     and (p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos')) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

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
  if auth.role() <> 'service_role'
     and (p_tenant is distinct from public.current_tenant_id() or not public.has_perm('gestionar_turnos')) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  update public.bot_sesiones
     set muteado = false
   where tenant_id = p_tenant
     and telefono_clave = p_telefono_clave;
end;
$$;
