/**
 * provision.mjs — da de alta un complejo con su cuenta de dueño.
 *
 * No hay registro público en la app: las cuentas se crean con este script, desde
 * una máquina nuestra. Es la única forma de que exista el primer usuario.
 *
 * Uso:
 *   node tools/provision.mjs --email dueno@complejo.com --password "..." \
 *                            --nombre "Complejo El Maracaná" --slug maracana
 *
 * Lee las credenciales de `.env.local` (ignorado por git):
 *   SUPABASE_URL=https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role>
 *
 * Los nombres NO llevan el prefijo `VITE_` a propósito: Vite solo expone al
 * navegador las variables que empiezan con eso, así que la `service_role` no
 * puede terminar en el bundle ni por accidente. Esa clave saltea RLS entera —
 * quien la tiene lee y escribe los datos de TODOS los complejos.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ─── .env.local ───────────────────────────────────────────────────────────────
// Parser mínimo en vez de una dependencia: son dos variables y así el script
// corre igual en cualquier versión de Node.
function cargarEnv(ruta = '.env.local') {
  const env = {};
  let texto;
  try {
    texto = readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
  } catch {
    return env;
  }
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const i = limpia.indexOf('=');
    if (i === -1) continue;
    env[limpia.slice(0, i).trim()] = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

// ─── argumentos ───────────────────────────────────────────────────────────────
function parsearArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    args[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
  }
  return args;
}

const salir = (msg) => {
  console.error(`\n  ✕ ${msg}\n`);
  process.exit(1);
};

const env = { ...cargarEnv(), ...process.env };
const args = parsearArgs(process.argv.slice(2));

// El email y la contraseña se pueden pasar por argumento o dejarlos en
// `.env.local` como TEST_EMAIL / TEST_PASSWORD. Lo segundo evita que la
// contraseña quede en el historial de la terminal.
const email = args.email ?? env.TEST_EMAIL;
const password = args.password ?? env.TEST_PASSWORD;
const { nombre, slug } = args;

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  salir(
    'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n' +
      '    Creá un archivo .env.local en la raíz del proyecto con:\n\n' +
      '      SUPABASE_URL=https://<ref>.supabase.co\n' +
      '      SUPABASE_SERVICE_ROLE_KEY=<service_role key>\n\n' +
      '    Las dos salen del panel: Settings → API.'
  );
}

if (!email || !password || !nombre || !slug) {
  salir(
    'Uso:\n' +
      '      node tools/provision.mjs --nombre "<nombre del complejo>" --slug <slug> \\\n' +
      '                               [--email <email>] [--password <pass>]\n\n' +
      '    Si no pasás --email/--password, se usan TEST_EMAIL y TEST_PASSWORD\n' +
      '    de .env.local (así la contraseña no queda en el historial de la terminal).'
  );
}

// El slug va en la URL pública `/reserva/<slug>`. Mismo formato que valida el
// CHECK de la tabla `tenants`: si no coincide, la base rechaza el alta.
if (!/^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) {
  salir(
    `Slug inválido: "${slug}".\n` +
      '    Solo minúsculas, números y guiones. Entre 3 y 50 caracteres, sin empezar\n' +
      '    ni terminar con guion. Ejemplos: maracana, el-potrero, canchas-del-sur'
  );
}

if (password.length < 10) salir('La contraseña tiene que tener al menos 10 caracteres.');

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Busca un usuario por email. La Admin API no tiene búsqueda directa, se pagina. */
async function buscarUsuarioPorEmail(mail) {
  const objetivo = mail.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === objetivo);
    if (encontrado) return encontrado;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const emailLimpio = email.trim().toLowerCase();

  console.log(`\n  Complejo : ${nombre}`);
  console.log(`  Slug     : ${slug}`);
  console.log(`  Dueño    : ${emailLimpio}\n`);

  // ── 1. Usuario ──────────────────────────────────────────────────────────────
  // `email_confirm: true`: la cuenta la crea un administrador en persona, no hay
  // nada que verificar por mail.
  let usuario;
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email: emailLimpio,
    password,
    email_confirm: true,
  });

  if (errCrear) {
    const yaExiste = /already|registered|exists/i.test(errCrear.message ?? '');
    if (!yaExiste) salir(`No se pudo crear el usuario: ${errCrear.message}`);

    // Reusarlo en vez de fallar: es lo que uno quiere al re-correr el script
    // porque el alta del complejo falló en el paso siguiente.
    usuario = await buscarUsuarioPorEmail(emailLimpio);
    if (!usuario) salir('El email ya está tomado pero no se pudo recuperar ese usuario.');
    console.log('  · El usuario ya existía, se reutiliza (no se cambió la contraseña).');
  } else {
    usuario = creado.user;
    console.log('  · Usuario creado.');
  }

  // ── 2. Complejo + config + membresía de dueño ───────────────────────────────
  // Las tres cosas las hace `provision_tenant` en una sola transacción: si algo
  // falla, no queda un complejo sin dueño ni un dueño sin complejo.
  const { data: tenantId, error: errTenant } = await admin.rpc('provision_tenant', {
    p_nombre: nombre,
    p_slug: slug,
    p_user_id: usuario.id,
    // Sin esto la pantalla de Usuarios y Permisos lista al dueño como
    // "Sin nombre". Si no se pasa, se deduce de la parte del email.
    p_nombre_dueno: args.dueno ?? emailLimpio.split('@')[0],
  });

  if (errTenant) {
    if (errTenant.code === '23505') {
      salir(`Ya existe un complejo con el slug "${slug}". Elegí otro.`);
    }
    salir(`No se pudo crear el complejo: ${errTenant.message}`);
  }

  console.log('  · Complejo, configuración y membresía de dueño creados.\n');
  console.log(`  tenant_id      ${tenantId}`);
  console.log(`  Panel          http://localhost:5173`);
  console.log(`  Reserva web    http://localhost:5173/reserva/${slug}\n`);
  console.log('  Entrá al panel con ese email y contraseña: te va a recibir el');
  console.log('  asistente de alta para cargar canchas y horarios.\n');
}

main().catch((err) => salir(err.message ?? String(err)));
