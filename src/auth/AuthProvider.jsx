/**
 * AuthProvider — sesión, complejo activo y permisos.
 *
 * Vive por FUERA de `StoreProvider` (ver `main.jsx`): el store necesita saber a
 * qué complejo pertenecen los datos antes de cargar nada, así que la identidad
 * se resuelve primero y los datos después.
 *
 * Todo lo que este provider expone es para decidir QUÉ MOSTRAR. La seguridad de
 * verdad está en las políticas RLS de la base — si alguien falsea el estado de
 * React, la base sigue diciendo que no.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigurado } from '../lib/supabase.js';
import { PERMISOS_DUENO, puede } from './permisos.js';

const AuthContext = createContext(null);

/** Traduce los errores de Supabase Auth a algo que un encargado pueda entender. */
function mensajeDeError(error) {
  const code = error?.code ?? '';
  const msg = error?.message ?? '';
  if (code === 'invalid_credentials' || /invalid login/i.test(msg)) {
    return 'Email o contraseña incorrectos.';
  }
  if (code === 'email_not_confirmed') return 'La cuenta todavía no está confirmada.';
  if (code === 'over_request_rate_limit' || /rate limit/i.test(msg)) {
    return 'Demasiados intentos. Esperá un minuto y probá de nuevo.';
  }
  if (/fetch|network/i.test(msg)) return 'Sin conexión con el servidor. Revisá internet.';
  return 'No se pudo iniciar sesión. Probá de nuevo en un momento.';
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [membership, setMembership] = useState(null);
  const [tenant, setTenant] = useState(null);
  // `cargando` cubre los dos tramos: recuperar la sesión guardada y resolver a
  // qué complejo pertenece. Mostrar la app entre medio daría un parpadeo del
  // login en cada F5 de un usuario que ya estaba adentro.
  const [cargando, setCargando] = useState(true);
  const [errorMembership, setErrorMembership] = useState(null);

  // ─── sesión ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false);
      return;
    }

    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session ?? null);
      if (!data.session) setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion ?? null);
      if (!nuevaSesion) {
        setMembership(null);
        setTenant(null);
        setCargando(false);
      }
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ─── membresía + complejo ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return;

    let vivo = true;
    setCargando(true);
    setErrorMembership(null);

    (async () => {
      // RLS ya limita esto a la membresía del usuario logueado: no hace falta
      // (ni sirve de nada) filtrar por user_id desde el cliente.
      const { data, error } = await supabase
        .from('memberships')
        .select('user_id, tenant_id, rol, permisos, nombre_mostrado, tenants(id, slug, nombre, activo, onboarding_completo)')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!vivo) return;

      if (error) {
        console.error('[tucan:auth] no se pudo resolver la membresía', error);
        setErrorMembership('No se pudo cargar tu complejo. Probá cerrar sesión y volver a entrar.');
      } else if (!data) {
        setErrorMembership(
          'Tu usuario todavía no tiene un complejo asignado. Escribinos para que lo activemos.'
        );
      } else if (data.tenants && data.tenants.activo === false) {
        setErrorMembership('Esta cuenta está suspendida. Contactate con nosotros.');
      } else {
        setMembership(data);
        setTenant(data.tenants ?? null);
      }
      setCargando(false);
    })();

    return () => {
      vivo = false;
    };
  }, [session?.user?.id]);

  // ─── acciones ──────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    if (!supabaseConfigurado) {
      return { ok: false, error: 'La app no está conectada al servidor todavía.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? { ok: false, error: mensajeDeError(error) } : { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    // La caché local de datos se purga acá y no en el componente: cerrar sesión
    // tiene que dejar la máquina limpia aunque el logout se dispare desde otro
    // lado (sesión vencida, botón de otro menú, etc.).
    purgarCacheLocal();
    if (supabaseConfigurado) await supabase.auth.signOut();
  }, []);

  const recuperarPassword = useCallback(async (email) => {
    if (!supabaseConfigurado) {
      return { ok: false, error: 'La app no está conectada al servidor todavía.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/recuperar`,
    });
    // A propósito no se distingue "el mail no existe": decirlo permitiría
    // averiguar qué direcciones tienen cuenta.
    return error ? { ok: false, error: mensajeDeError(error) } : { ok: true };
  }, []);

  const refrescarMembership = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('memberships')
      .select('user_id, tenant_id, rol, permisos, nombre_mostrado, tenants(id, slug, nombre, activo, onboarding_completo)')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) {
      setMembership(data);
      setTenant(data.tenants ?? null);
    }
  }, [session?.user?.id]);

  const value = useMemo(() => {
    const esDueno = membership?.rol === 'dueno';
    const permisos = esDueno ? PERMISOS_DUENO : (membership?.permisos ?? {});
    return {
      session,
      user: session?.user ?? null,
      tenantId: membership?.tenant_id ?? null,
      tenant,
      rol: membership?.rol ?? null,
      esDueno,
      permisos,
      puede: (key) => (esDueno ? true : puede(permisos, key)),
      nombreMostrado:
        membership?.nombre_mostrado ?? session?.user?.email?.split('@')[0] ?? 'Usuario',
      cargando,
      errorMembership,
      signIn,
      signOut,
      recuperarPassword,
      refrescarMembership,
    };
  }, [
    session,
    membership,
    tenant,
    cargando,
    errorMembership,
    signIn,
    signOut,
    recuperarPassword,
    refrescarMembership,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Atajo para el gating de la UI: `usePuede('ver_reportes')`. */
export function usePuede(key) {
  return useAuth().puede(key);
}

/**
 * Borra toda la caché de datos del navegador.
 *
 * Es una medida de seguridad, no una limpieza cosmética: en una computadora
 * compartida, lo que quedara guardado del complejo anterior sería visible para
 * la siguiente persona que entre.
 */
export function purgarCacheLocal() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('tucan:cache:') || key.startsWith('tucan:state:')) {
        window.localStorage.removeItem(key);
      }
    }
    // Restos del login local de la etapa demo.
    window.localStorage.removeItem('tucan_session_v1');
  } catch {
    /* localStorage bloqueado: no hay nada que purgar */
  }
}
