/**
 * n8n.mjs — leer, editar y depurar el bot directo contra la instancia de n8n.
 *
 * Sin esto, cada ajuste al prompt o a un nodo es: editar el JSON acá, importar
 * a mano, volver a elegir las credenciales, probar, repetir. Con esto el
 * archivo del repo y la instancia son la misma cosa, y las ejecuciones fallidas
 * se leen desde la terminal en vez de ir clickeando nodo por nodo.
 *
 * ─── Uso ───────────────────────────────────────────────────────────────────
 *   node tools/n8n.mjs list                      workflows de la instancia
 *   node tools/n8n.mjs pull [id]                 baja el workflow al repo
 *   node tools/n8n.mjs push [archivo]            sube el del repo a la instancia
 *   node tools/n8n.mjs diff                      qué cambiaría un push
 *   node tools/n8n.mjs execs [--n 15] [--malas]  últimas ejecuciones
 *   node tools/n8n.mjs exec [id|--ultima]        el detalle de una: qué falló
 *   node tools/n8n.mjs chat [id|--ultima]        la conversación y las tools que usó
 *   node tools/n8n.mjs prompt                    imprime el system prompt vigente
 *   node tools/n8n.mjs activar | desactivar [id]
 *
 * ─── Credenciales ──────────────────────────────────────────────────────────
 * En `.env.local` (ignorado por git):
 *
 *   N8N_URL=https://n8n.codearg.ar
 *   N8N_API_KEY=<Settings → n8n API → Create an API key>
 *
 * Esa clave abre la instancia ENTERA de n8n, no solo este bot: puede leer y
 * modificar todos los workflows. Se cuida igual que la `service_role`. Sin
 * prefijo `VITE_` a propósito, para que Vite no pueda meterla en el bundle.
 *
 * Lo que la API NO devuelve son los valores de las credenciales: quedan
 * cifrados del lado de n8n. Se pueden ver los nodos y a qué credencial apuntan,
 * nunca el token que hay adentro.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { cargarEnv } from './sesionPrueba.mjs';

const env = { ...cargarEnv(), ...process.env };
const BASE = (env.N8N_URL ?? '').replace(/\/+$/, '');
const KEY = env.N8N_API_KEY;

const ARCHIVO = new URL('../n8n/Canchas - Bot de Reservas V1.json', import.meta.url);
// Se guarda al bajar, para que `push` no pise cambios que alguien hizo en el
// editor sin que nos enteremos.
const ARCHIVO_REMOTO = new URL('../n8n/.ultimo-pull.json', import.meta.url);

const salir = (msg) => { console.error(`\n  ✕ ${msg}\n`); process.exit(1); };

if (!BASE || !KEY) {
  salir(
    'Faltan N8N_URL y/o N8N_API_KEY en .env.local\n\n' +
      '      N8N_URL=https://n8n.codearg.ar\n' +
      '      N8N_API_KEY=<Settings → n8n API → Create an API key>\n'
  );
}

// ─── cliente ──────────────────────────────────────────────────────────────────

async function api(ruta, opciones = {}) {
  const res = await fetch(`${BASE}/api/v1${ruta}`, {
    ...opciones,
    headers: {
      'X-N8N-API-KEY': KEY,
      'Content-Type': 'application/json',
      ...(opciones.headers ?? {}),
    },
  });

  const texto = await res.text();
  let cuerpo;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }

  if (!res.ok) {
    const detalle = typeof cuerpo === 'string' ? cuerpo : (cuerpo?.message ?? JSON.stringify(cuerpo));
    if (res.status === 401) salir(`n8n rechazó la API key (401). Revisá N8N_API_KEY.\n    ${detalle}`);
    salir(`${opciones.method ?? 'GET'} ${ruta} → ${res.status}\n    ${detalle}`);
  }
  return cuerpo;
}

const leerLocal = (ruta = ARCHIVO) => JSON.parse(readFileSync(ruta, 'utf8'));

/** El workflow del repo, o el primero cuyo nombre tenga "Canchas". */
async function resolverId(argId) {
  if (argId) return argId;
  const { data } = await api('/workflows?limit=100');
  const local = leerLocal();
  const porNombre = data.find((w) => w.name === local.name)
    ?? data.find((w) => /cancha/i.test(w.name));
  if (!porNombre) {
    salir(
      `No encontré un workflow llamado "${local.name}" en la instancia.\n` +
        '    Pasá el id a mano: node tools/n8n.mjs <comando> <id>\n' +
        '    O mirá cuáles hay: node tools/n8n.mjs list'
    );
  }
  return porNombre.id;
}

// ─── comandos ─────────────────────────────────────────────────────────────────

async function cmdList() {
  const { data } = await api('/workflows?limit=100');
  console.log();
  for (const w of data) {
    const estado = w.active ? '● activo ' : '○ apagado';
    console.log(`  ${estado}  ${String(w.id).padEnd(20)} ${w.name}`);
  }
  console.log(`\n  ${data.length} workflows\n`);
}

async function cmdPull(argId) {
  const id = await resolverId(argId);
  const w = await api(`/workflows/${id}`);

  // Se guardan las dos cosas: el archivo de trabajo y una copia intacta de lo
  // que había en la instancia, que es contra lo que después compara `diff`.
  const limpio = {
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: w.settings ?? {},
    id: w.id,
    meta: w.meta,
    tags: [],
    pinData: w.pinData ?? {},
    active: w.active,
    versionId: w.versionId,
  };

  writeFileSync(ARCHIVO, JSON.stringify(limpio, null, 2) + '\n', 'utf8');
  writeFileSync(ARCHIVO_REMOTO, JSON.stringify(limpio, null, 2) + '\n', 'utf8');
  console.log(`\n  ✓ "${w.name}" (${w.nodes.length} nodos) bajado al repo`);
  console.log(`    id ${w.id} · ${w.active ? 'activo' : 'apagado'}\n`);
}

/**
 * La API pública solo acepta estos cuatro campos en un PUT. Mandar `id`,
 * `active`, `tags` o `versionId` la hace devolver 400 sin explicar cuál sobra.
 *
 * Y `settings` tiene su propia lista blanca: el editor guarda ahí claves que su
 * propia API después rechaza —`timeSavedMode`, `availableInMCP`— con un
 * "settings must NOT have additional properties" que tampoco dice cuál sobra.
 * O sea que un `pull` seguido de un `push`, sin tocar nada, fallaba.
 */
const SETTINGS_OK = [
  'executionOrder', 'timezone', 'errorWorkflow', 'executionTimeout', 'callerPolicy',
  'saveExecutionProgress', 'saveManualExecutions', 'saveDataErrorExecution', 'saveDataSuccessExecution',
];

const soloLoQueAcepta = (w) => ({
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: Object.fromEntries(
    Object.entries(w.settings ?? {}).filter(([k]) => SETTINGS_OK.includes(k))
  ),
});

async function cmdPush(argRuta) {
  const local = leerLocal(argRuta ? new URL(argRuta, `file://${process.cwd()}/`) : ARCHIVO);
  const id = await resolverId(local.id);

  const antes = await api(`/workflows/${id}`);
  await api(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(soloLoQueAcepta(local)) });

  console.log(`\n  ✓ "${local.name}" subido (${local.nodes.length} nodos)`);
  if (antes.nodes.length !== local.nodes.length) {
    console.log(`    nodos: ${antes.nodes.length} → ${local.nodes.length}`);
  }

  // Las credenciales viven en la instancia, no en el archivo. Si el push las
  // borra sin avisar, el bot queda dando 401 y nada lo dice.
  const sinCred = local.nodes.filter(
    (n) => !n.credentials && (n.type.includes('httpRequest') || n.type.includes('redis') || n.type.includes('memoryRedis'))
  );
  if (sinCred.length) {
    console.log(`\n  ⚠ ${sinCred.length} nodos quedaron SIN credencial. Elegilas en el editor:`);
    for (const n of sinCred) console.log(`      · ${n.name}`);
  }

  if (!antes.active) console.log('\n  El workflow está apagado. `node tools/n8n.mjs activar` para prenderlo.');
  console.log();
}

async function cmdDiff() {
  const local = leerLocal();
  const id = await resolverId(local.id);
  const remoto = await api(`/workflows/${id}`);

  const porNombre = (ws) => new Map(ws.map((n) => [n.name, n]));
  const a = porNombre(remoto.nodes);
  const b = porNombre(local.nodes);

  const nuevos = [...b.keys()].filter((k) => !a.has(k));
  const borrados = [...a.keys()].filter((k) => !b.has(k));
  const cambiados = [...b.keys()].filter(
    (k) => a.has(k) && JSON.stringify(a.get(k).parameters) !== JSON.stringify(b.get(k).parameters)
  );

  console.log();
  if (remoto.name !== local.name) console.log(`  nombre: "${remoto.name}" → "${local.name}"`);
  for (const n of nuevos) console.log(`  + ${n}`);
  for (const n of borrados) console.log(`  - ${n}`);
  for (const n of cambiados) console.log(`  ~ ${n}`);

  // Aviso: las credenciales que están puestas en la instancia y no en el
  // archivo se pierden con un push.
  const perderianCred = [...b.keys()].filter((k) => a.get(k)?.credentials && !b.get(k)?.credentials);
  if (perderianCred.length) {
    console.log(`\n  ⚠ Un push BORRARÍA la credencial de ${perderianCred.length} nodos:`);
    for (const n of perderianCred) console.log(`      · ${n}`);
    console.log('    Corré `pull` primero si las credenciales ya están puestas en el editor.');
  }

  if (!nuevos.length && !borrados.length && !cambiados.length && remoto.name === local.name) {
    console.log('  Sin diferencias.');
  }
  console.log();
}

const HORA = (iso) =>
  iso ? new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba', hour12: false }) : '—';

async function cmdExecs(args) {
  const id = await resolverId(args.id);
  const n = Number(args.n ?? 15);
  const q = new URLSearchParams({ workflowId: id, limit: String(n) });
  if (args.malas) q.set('status', 'error');

  const { data } = await api(`/executions?${q}`);
  if (!data.length) { console.log('\n  Sin ejecuciones.\n'); return; }

  console.log();
  for (const e of data) {
    const icono = e.status === 'success' ? '✓' : e.status === 'error' ? '✕' : '·';
    const dur = e.startedAt && e.stoppedAt
      ? `${((new Date(e.stoppedAt) - new Date(e.startedAt)) / 1000).toFixed(1)}s`
      : '—';
    console.log(`  ${icono} ${String(e.id).padEnd(8)} ${HORA(e.startedAt).padEnd(20)} ${String(e.status).padEnd(9)} ${dur}`);
  }
  console.log(`\n  ${data.length} ejecuciones · detalle: node tools/n8n.mjs exec <id>\n`);
}

async function traerExec(args) {
  if (args.ultima || !args.id) {
    const id = await resolverId(null);
    const q = new URLSearchParams({ workflowId: id, limit: '1' });
    if (args.malas) q.set('status', 'error');
    const { data } = await api(`/executions?${q}`);
    if (!data.length) salir('No hay ejecuciones todavía.');
    return api(`/executions/${data[0].id}?includeData=true`);
  }
  return api(`/executions/${args.id}?includeData=true`);
}

/** Recorta cualquier cosa a algo que se pueda leer en una terminal. */
const corto = (v, max = 400) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + ` …(+${s.length - max})` : s;
};

const primerJson = (nodo) => nodo?.data?.main?.[0]?.[0]?.json ?? null;

async function cmdExec(args) {
  const e = await traerExec(args);
  const run = e.data?.resultData?.runData ?? {};
  const errorGlobal = e.data?.resultData?.error;

  console.log(`\n  Ejecución ${e.id} · ${e.status} · ${HORA(e.startedAt)}`);
  console.log(`  Último nodo: ${e.data?.resultData?.lastNodeExecuted ?? '—'}\n`);

  for (const [nombre, corridas] of Object.entries(run)) {
    for (const c of corridas) {
      const err = c.error;
      const icono = err ? '✕' : '✓';
      const ms = c.executionTime != null ? `${c.executionTime}ms` : '';
      console.log(`  ${icono} ${nombre.padEnd(28)} ${ms}`);

      if (err) {
        // Lo que importa de un error de nodo: el mensaje, el código HTTP y el
        // cuerpo que devolvió el servidor. El stack no aporta nada acá.
        console.log(`      ${err.message ?? err.description ?? corto(err)}`);
        const http = err.httpCode ?? err.context?.httpCode;
        if (http) console.log(`      HTTP ${http}`);
        const cuerpo = err.context?.data ?? err.cause?.error ?? err.cause;
        if (cuerpo) console.log(`      respuesta: ${corto(cuerpo, 300)}`);
      }
    }
  }

  if (errorGlobal) {
    console.log(`\n  ✕ Falló en "${errorGlobal.node?.name ?? '?'}": ${errorGlobal.message}`);
  }
  console.log();
}

/**
 * La vista que hace falta para pulir el bot: qué dijo el cliente, qué
 * herramientas llamó el agente con qué argumentos, qué le contestaron, y qué
 * terminó respondiendo. Todo lo demás es ruido.
 */
async function cmdChat(args) {
  const e = await traerExec(args);
  const run = e.data?.resultData?.runData ?? {};

  console.log(`\n  Ejecución ${e.id} · ${e.status} · ${HORA(e.startedAt)}\n`);

  const norm = primerJson(run['Normalizar Entrada']?.[0]);
  if (norm) {
    console.log(`  Cliente (${norm.pushName ?? '?'} · ${norm.phoneNumber ?? '?'}${norm.codigoReserva ? ` · #${norm.codigoReserva}` : ''})`);
    console.log(`  › ${corto(norm.content || `[${norm.type}]`, 500)}\n`);
  }

  const prep = primerJson(run['Preparar Datos']?.[0]);
  if (prep?.hoyTexto) console.log(`  Fecha que recibió el modelo: ${prep.hoyTexto.split('\n')[0]}\n`);

  const sesion = primerJson(run['Estado de Sesion']?.[0]);
  if (sesion) {
    if (sesion.error) console.log(`  ⚠ Estado de Sesion falló: ${sesion.error}\n`);
    else {
      console.log(`  Contexto: cliente ${sesion.cliente?.nombre ?? '(no lo conocemos)'} · ` +
        `${sesion.pendientes?.length ?? 0} pendientes · ${sesion.proximos?.length ?? 0} próximos · ` +
        `${sesion.pausado ? 'PAUSADO' : 'activo'}\n`);
    }
  }

  const TOOLS = ['info_complejo', 'ver_disponibilidad', 'reservar_turno', 'datos_de_pago', 'mis_turnos', 'cancelar_turno', 'derivar_a_humano'];
  const usadas = TOOLS.filter((t) => run[t]);
  if (usadas.length) {
    console.log('  Herramientas:');
    for (const t of usadas) {
      for (const c of run[t]) {
        const salida = primerJson(c);
        const marca = c.error ? '✕' : salida?.error ? '⚠' : '✓';
        console.log(`    ${marca} ${t}`);
        if (c.inputOverride) console.log(`        pidió: ${corto(c.inputOverride, 220)}`);
        if (c.error) console.log(`        ${c.error.message}`);
        else if (salida) console.log(`        volvió: ${corto(salida, 260)}`);
      }
    }
    console.log();
  } else {
    console.log('  Herramientas: NINGUNA. Si contestó algo concreto, se lo inventó.\n');
  }

  const salida = primerJson(run['Asistente Canchas']?.[0]);
  if (salida?.output) console.log(`  Bot\n  ‹ ${salida.output}\n`);

  const envio = run['Enviar Respuesta']?.[0];
  if (envio?.error) console.log(`  ✕ No se pudo mandar a Chatwoot: ${envio.error.message}\n`);
}

async function cmdPrompt(argId) {
  const id = await resolverId(argId);
  const w = await api(`/workflows/${id}`);
  const agente = w.nodes.find((n) => n.type.includes('langchain.agent'));
  if (!agente) salir('No hay ningún nodo de agente en ese workflow.');
  console.log('\n' + (agente.parameters?.options?.systemMessage ?? '(sin system message)') + '\n');
}

async function cmdActivar(argId, activo) {
  const id = await resolverId(argId);
  await api(`/workflows/${id}/${activo ? 'activate' : 'deactivate'}`, { method: 'POST' });
  console.log(`\n  ✓ Workflow ${activo ? 'activado' : 'desactivado'}\n`);
}

// ─── ruteo ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const comando = argv[0];
const args = { id: argv[1]?.startsWith('--') ? null : argv[1] };
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--ultima') args.ultima = true;
  else if (argv[i] === '--malas') args.malas = true;
  else if (argv[i] === '--n') args.n = argv[++i];
}

switch (comando) {
  case 'list':        await cmdList(); break;
  case 'pull':        await cmdPull(args.id); break;
  case 'push':        await cmdPush(args.id); break;
  case 'diff':        await cmdDiff(); break;
  case 'execs':       await cmdExecs(args); break;
  case 'exec':        await cmdExec(args); break;
  case 'chat':        await cmdChat(args); break;
  case 'prompt':      await cmdPrompt(args.id); break;
  case 'activar':     await cmdActivar(args.id, true); break;
  case 'desactivar':  await cmdActivar(args.id, false); break;
  default:
    console.log(`
  node tools/n8n.mjs <comando>

    list                      workflows de la instancia
    pull [id]                 baja el workflow al repo
    push [archivo]            sube el del repo a la instancia
    diff                      qué cambiaría un push

    execs [--n 15] [--malas]  últimas ejecuciones
    exec [id|--ultima]        detalle: qué nodo falló y con qué respuesta
    chat [id|--ultima]        la conversación: qué pidió, qué tools usó, qué contestó

    prompt                    el system prompt que está corriendo ahora
    activar | desactivar [id]
`);
}
