/**
 * Edge Function `invitar-miembro` — el dueño suma un empleado a su complejo.
 *
 * Crear un usuario exige la Admin API, que necesita `service_role`. Esa clave no
 * puede vivir en el navegador, así que la operación pasa por acá.
 *
 * La regla que sostiene todo: el complejo NO viene en el cuerpo del pedido. Se
 * deduce del token de quien llama, después de verificarlo. Si viniera del
 * cliente, cualquier dueño podría agregarse empleados en el complejo de otro.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { error, json, preflight } from '../_shared/http.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 10;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(req, 'Método no permitido.', 405);

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: auth, error: errAuth } = await admin.auth.getUser(token);
    if (errAuth || !auth?.user) return error(req, 'No autorizado.', 401);

    const { email, password, nombre } = await req.json().catch(() => ({}));

    if (!EMAIL_RE.test(email ?? '')) return error(req, 'El email no es válido.');
    if ((password ?? '').length < MIN_PASSWORD) {
      return error(req, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    }

    const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // La cuenta la crea el dueño en persona: no hace falta confirmar.
      user_metadata: { nombre: nombre ?? '' },
    });

    if (errCrear) {
      const yaExiste = /already|registered|exists/i.test(errCrear.message ?? '');
      return error(req, yaExiste ? 'Ya existe un usuario con ese email.' : 'No se pudo crear el usuario.');
    }

    // El complejo sale del token verificado, no del cuerpo del pedido. La función
    // también verifica que quien llama sea efectivamente el dueño.
    const { error: errMiembro } = await admin.rpc('agregar_miembro', {
      p_dueno_id: auth.user.id,
      p_user_id: creado.user.id,
      p_nombre: nombre ?? email.split('@')[0],
    });

    if (errMiembro) {
      // Si la membresía falla, el usuario suelto no sirve para nada y encima
      // ocuparía el email: se borra para no dejar basura a medio crear.
      await admin.auth.admin.deleteUser(creado.user.id);
      const sinPermiso = errMiembro.code === '42501';
      return error(
        req,
        sinPermiso ? 'Solo el dueño puede agregar usuarios.' : 'No se pudo agregar al equipo.',
        sinPermiso ? 403 : 500
      );
    }

    return json(req, { ok: true, userId: creado.user.id });
  } catch (err) {
    console.error('[invitar-miembro]', err);
    return error(req, 'Error interno.', 500);
  }
});
