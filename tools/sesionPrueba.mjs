/**
 * sesionPrueba.mjs — inicia sesión de verdad contra Supabase y devuelve la
 * sesión lista para inyectar en `localStorage` antes de que cargue la app.
 *
 * Lo usan `shot.mjs` y `test-persist.mjs` para saltarse la pantalla de login sin
 * simular nada: la sesión es real, así que el `AuthProvider` resuelve la
 * membresía y las policies RLS se aplican igual que con un usuario sentado
 * adelante. Inventar un token falso haría que todas las consultas fallen.
 *
 * Necesita en `.env.local`:
 *   VITE_SUPABASE_URL / SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   TEST_EMAIL
 *   TEST_PASSWORD
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/** Clave de storage que fija `src/lib/supabase.js`. Si cambia allá, cambia acá. */
export const STORAGE_KEY = 'tucan-auth';

export function cargarEnv() {
  const env = {};
  for (const archivo of ['.env', '.env.local']) {
    let texto;
    try {
      texto = readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8');
    } catch {
      continue;
    }
    for (const linea of texto.split('\n')) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const i = limpia.indexOf('=');
      if (i === -1) continue;
      env[limpia.slice(0, i).trim()] = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...env, ...process.env };
}

export async function obtenerSesion() {
  const env = cargarEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
  }
  if (!env.TEST_EMAIL || !env.TEST_PASSWORD) {
    throw new Error(
      'Faltan TEST_EMAIL y TEST_PASSWORD en .env.local (el usuario con el que se prueba).'
    );
  }

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
  });
  if (error) throw new Error(`No se pudo iniciar sesión de prueba: ${error.message}`);

  return { session: data.session, env };
}
