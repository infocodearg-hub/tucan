/**
 * Cliente de Supabase — única instancia de toda la app.
 *
 * Acá solo entra la ANON KEY. No es un secreto: es una clave pública pensada
 * para vivir en el navegador, y todo lo que puede hacer está limitado por las
 * políticas RLS de la base. La `service_role` NUNCA puede aparecer en `src/`:
 * saltea RLS por diseño y solo vive dentro de las Edge Functions.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** `false` en un checkout sin `.env` — la app lo avisa en pantalla en vez de romper. */
export const supabaseConfigurado = Boolean(url && anonKey);

if (!supabaseConfigurado) {
  console.error(
    '[tucan] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env y completalas.'
  );
}

export const supabase = supabaseConfigurado
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Necesario para "olvidé mi contraseña": el mail de recuperación vuelve
        // con un código en la URL que el cliente canjea por una sesión.
        detectSessionInUrl: true,
        // PKCE en vez del flujo implícito: el token no viaja en el hash de la
        // URL, así que no queda en el historial del navegador ni en el Referer.
        flowType: 'pkce',
        storageKey: 'tucan-auth',
      },
    })
  : null;
