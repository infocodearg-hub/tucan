/**
 * poblar-demo.mjs — llena la cuenta con datos realistas de un complejo en uso.
 *
 * Para mostrar la app sin que se vea vacía: clientes con historial, turnos
 * repartidos en el pasado y el futuro, señas cobradas, ventas de cantina,
 * gastos y turnos fijos.
 *
 *   node tools/poblar-demo.mjs
 *
 * ⚠ Borra y rehace los datos de operación (turnos, clientes, productos, ventas,
 *   gastos, turnos fijos) para que se pueda correr las veces que haga falta sin
 *   duplicar nada. NO toca las canchas ni la configuración del complejo, salvo
 *   que falten datos de contacto: eso se completa porque la app los muestra en
 *   el encabezado y en los mensajes de WhatsApp.
 *
 * Las fechas son SIEMPRE relativas a hoy. Un seed con fechas fijas se ve vacío
 * la semana siguiente, que es justo cuando uno lo va a mostrar.
 */

import { createClient } from '@supabase/supabase-js';
import { cargarEnv } from './sesionPrueba.mjs';

const env = cargarEnv();
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// ─── utilidades ───────────────────────────────────────────────────────────────

const ALFABETO = '0123456789abcdefghijklmnopqrstuvwxyz';
const id = (p) => {
  let s = '';
  for (const b of crypto.getRandomValues(new Uint8Array(10))) s += ALFABETO[b % 36];
  return `${p}_${s}`;
};

const hoyISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba' }).format(new Date());

const dia = (offset) => {
  const [y, m, d] = hoyISO().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
};

const diaSemana = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
};

const ts = (fecha, hora) => `${fecha}T${hora}:00.000Z`;
const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p) => Math.random() < p;

// ─── datos base ───────────────────────────────────────────────────────────────

const CLIENTES = [
  ['Martín Suárez', '+5493514412233', 9.4, 'Juega todos los martes. Siempre paga con transferencia.'],
  ['Los Pumas FC', '+5493515578899', 9.8, 'Equipo de amigos, 8 años viniendo.'],
  ['Nicolás Ferreyra', '+5493516621144', 8.2, ''],
  ['Deportivo Colón', '+5493513390077', 7.5, 'A veces cancelan sobre la hora.'],
  ['Julián Ávila', '+5493514455662', 9.0, ''],
  ['Los Cardales', '+5493517788341', 8.8, 'Piden pecheras siempre.'],
  ['Federico Moyano', '+5493512234908', 6.4, 'Debe una fecha de marzo.'],
  ['Ramiro Ledesma', '+5493516674521', 9.6, 'Cliente VIP, trae gente nueva.'],
  ['Estudiantes del Sur', '+5493514098876', 8.0, ''],
  ['Lucas Bustos', '+5493515512340', 7.8, ''],
  ['Gonzalo Peralta', '+5493513367742', 8.6, ''],
  ['Barrio Norte FC', '+5493517701298', 9.2, 'Turno fijo de los jueves.'],
  ['Emiliano Rossi', '+5493514789003', 7.1, ''],
  ['Sebastián Ovejero', '+5493516120945', 8.9, 'Prefiere que le avisen por WhatsApp.'],
];

const PRODUCTOS = [
  ['Agua mineral 500ml', 'bebidas', 1200, 48, 'agua'],
  ['Gatorade 500ml', 'bebidas', 2500, 30, 'bebida'],
  ['Coca-Cola 500ml', 'bebidas', 2200, 36, 'bebida'],
  ['Cerveza en lata', 'bebidas', 3200, 24, 'cerveza'],
  ['Fernet con Coca', 'tragos', 5500, 20, 'trago'],
  ['Vaso de Gancia', 'tragos', 4800, 15, 'trago'],
  ['Papas fritas', 'snacks', 2800, 25, 'snack'],
  ['Alfajor triple', 'snacks', 1500, 40, 'snack'],
  ['Barra de cereal', 'snacks', 1300, 30, 'snack'],
  ['Sándwich de milanesa', 'snacks', 6500, 12, 'snack'],
  ['Alquiler de pecheras', 'servicios', 3000, 0, 'servicio'],
  ['Alquiler de pelota', 'servicios', 2000, 0, 'servicio'],
  ['Alquiler de paletas (par)', 'servicios', 4500, 0, 'servicio'],
  ['Tubo de pelotitas', 'servicios', 7000, 10, 'servicio'],
];

const GASTOS = [
  ['Sueldo cuidador de cancha', 'sueldos', 145000, -1],
  ['Factura de luz', 'servicios', 186000, -3],
  ['Reposición de bebidas', 'insumos', 92000, -4],
  ['Reparación de red cancha 2', 'mantenimiento', 34000, -5],
  ['Pastas para reflectores LED', 'mantenimiento', 28500, -7],
  ['Sueldo encargado', 'sueldos', 210000, -8],
  ['Compra de pelotas nuevas', 'insumos', 76000, -9],
  ['Factura de agua', 'servicios', 41000, -11],
  ['Corte de césped sintético', 'mantenimiento', 55000, -12],
  ['Reposición de snacks', 'insumos', 63000, -14],
  ['Internet y teléfono', 'servicios', 38000, -15],
  ['Service del portón', 'otro', 22000, -18],
  ['Sueldo cuidador de cancha', 'sueldos', 145000, -16],
  ['Bolsas y descartables', 'insumos', 18500, -20],
];

const METODOS = ['efectivo', 'mercadopago', 'transferencia', 'tarjeta'];
const CANALES = ['mostrador', 'mostrador', 'mostrador', 'web', 'bot_wa', 'bot_wa'];

// ─── main ─────────────────────────────────────────────────────────────────────

const salir = (m) => { console.error(`\n  ✕ ${m}\n`); process.exit(1); };

const { error: errLogin } = await db.auth.signInWithPassword({
  email: env.TEST_EMAIL, password: env.TEST_PASSWORD,
});
if (errLogin) salir(`login: ${errLogin.message}`);

const { data: tenantId } = await db.rpc('current_tenant_id');
if (!tenantId) salir('el usuario no tiene complejo asignado');

const { data: canchas } = await db.from('canchas').select('*').eq('activa', true).order('orden');
if (!canchas?.length) salir('el complejo no tiene canchas. Completá el alta primero.');

const { data: cfg } = await db.from('tenant_config').select('*').maybeSingle();
const slots = cfg?.operacion?.slots?.length
  ? cfg.operacion.slots
  : ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const nocheDesde = cfg?.operacion?.horaNocturnaDesde ?? '19:00';

const precioDe = (cancha, hora) =>
  Number(hora >= nocheDesde ? cancha.precio_noche : cancha.precio_dia) || 0;

console.log(`\n  Complejo  : ${cfg?.complejo?.nombre || '(sin nombre)'}`);
console.log(`  Canchas   : ${canchas.map((c) => c.nombre).join(', ')}`);
console.log(`  Horarios  : ${slots.length} turnos por día\n`);

// ── limpieza de lo transaccional ─────────────────────────────────────────────
// Orden inverso a las claves foráneas: primero lo que apunta, después lo apuntado.
for (const t of ['payments', 'sales', 'bookings', 'turnos_fijos', 'expenses', 'clients', 'products']) {
  const { error } = await db.from(t).delete().neq('id', '');
  if (error) salir(`limpiando ${t}: ${error.message}`);
}
console.log('  · datos de operación anteriores borrados');

// ── datos de contacto del complejo, si faltan ────────────────────────────────
const complejoActual = cfg?.complejo ?? {};
// `Complejo E2E` es el nombre que deja el test end-to-end: se pisa siempre.
const NOMBRE_DEMO = process.env.NOMBRE_COMPLEJO || 'Complejo La Plata';
const esDeTest = !complejoActual.nombre || complejoActual.nombre === 'Complejo E2E';
if (esDeTest || !complejoActual.telefono) {
  await db.from('tenant_config').update({
    complejo: {
      nombre: esDeTest ? NOMBRE_DEMO : complejoActual.nombre,
      ciudad: complejoActual.ciudad || 'La Plata',
      direccion: complejoActual.direccion || 'Calle 13 y 44',
      telefono: complejoActual.telefono || '+5492214412200',
    },
    pagos: {
      ...(cfg?.pagos ?? {}),
      alias: cfg?.pagos?.alias || 'maracana.canchas',
      cbu: cfg?.pagos?.cbu || '0070199530004512345678',
      senaMinimaPorcentaje: cfg?.pagos?.senaMinimaPorcentaje ?? 50,
    },
  }).eq('tenant_id', tenantId);
  console.log('  · datos de contacto y cobro completados');
}

// El nombre del dueño: sin esto la lista de Usuarios y Permisos muestra
// "Sin nombre", que en una demo queda mal y no dice quién es quién.
const nombreDueno = process.env.NOMBRE_DUENO || 'Rodrigo';
await db.from('memberships')
  .update({ nombre_mostrado: nombreDueno })
  .eq('tenant_id', tenantId)
  .eq('rol', 'dueno')
  .is('nombre_mostrado', null);

// ── clientes ─────────────────────────────────────────────────────────────────
const clientes = CLIENTES.map(([nombre, telefono, score, notas]) => ({
  id: id('cli'),
  tenant_id: tenantId,
  nombre, telefono, score, notas,
  email: null,
  etiquetas: [],
  historico_previo: {
    partidos: entre(4, 60),
    cancelaciones: entre(0, 4),
    gastado: entre(60000, 900000),
  },
  created_at: ts(dia(-entre(60, 400)), '12:00'),
  updated_at: ts(dia(-entre(1, 30)), '12:00'),
}));
await db.from('clients').insert(clientes).then(({ error }) => error && salir('clientes: ' + error.message));
console.log(`  · ${clientes.length} clientes`);

// ── productos ────────────────────────────────────────────────────────────────
const productos = PRODUCTOS.map(([nombre, categoria, precio, stock, iconKey]) => ({
  id: id('prd'),
  tenant_id: tenantId,
  nombre, categoria, precio, stock,
  stock_minimo: categoria === 'servicios' ? 0 : 6,
  controla_stock: categoria !== 'servicios',
  icon_key: iconKey,
  activo: true,
}));
await db.from('products').insert(productos).then(({ error }) => error && salir('productos: ' + error.message));
console.log(`  · ${productos.length} productos de cantina`);

// ── turnos fijos ─────────────────────────────────────────────────────────────
const EQUIPOS_FIJOS = [
  ['Los Pumas FC', 'Martín Suárez', 2],
  ['Barrio Norte FC', 'Ramiro Ledesma', 4],
  ['Deportivo Colón', 'Gonzalo Peralta', 3],
  ['Estudiantes del Sur', 'Julián Ávila', 6],
];
const mesKey = hoyISO().slice(0, 7);
const turnosFijos = EQUIPOS_FIJOS.map(([equipo, capitan, dow], i) => {
  const cliente = clientes.find((c) => c.nombre === equipo) ?? clientes[i];
  return {
    id: id('tf'),
    tenant_id: tenantId,
    cancha_id: canchas[i % canchas.length].id,
    dia_semana: dow,
    hora: slots[Math.min(slots.length - 1, slots.length - 3 + (i % 2))],
    cliente_id: cliente.id,
    equipo_nombre: equipo,
    capitan_nombre: capitan,
    telefono: cliente.telefono,
    vigente_desde: dia(-120),
    vigente_hasta: null,
    activo: true,
    precio_mensual_override: null,
    estado_por_mes: { [mesKey]: i === 2 ? 'pendiente' : 'al_dia' },
    excepciones: [],
    created_at: ts(dia(-120), '12:00'),
    updated_at: ts(dia(-3), '12:00'),
  };
});
await db.from('turnos_fijos').insert(turnosFijos).then(({ error }) => error && salir('fijos: ' + error.message));
console.log(`  · ${turnosFijos.length} turnos fijos`);

// ── turnos ───────────────────────────────────────────────────────────────────
// Del pasado (con su plata cobrada) al futuro (con seña o sin nada todavía).
const bookings = [];
const pagos = [];
const ocupados = new Set();

// -60 en vez de -21: el rango por defecto de Reportes → General mira 56 días
// atrás (RANGO_POR_DEFECTO_DIAS en ReportesAnalytics.jsx) — con menos
// historial los gráficos de tendencia semanal arrancan con semanas vacías.
for (let offset = -60; offset <= 10; offset++) {
  const fecha = dia(offset);
  const dow = diaSemana(fecha);
  const finde = dow >= 5;
  const pasado = offset < 0;

  // Un complejo real no se llena parejo: el finde y la noche son los que venden.
  // Tampoco se llena del todo: una grilla 100% ocupada se ve inventada. Con
  // estos números queda cerca de la mitad de los lugares tomados, que es lo que
  // muestra un complejo que anda bien.
  const cuantos = finde ? entre(15, 22) : entre(9, 15);

  for (let n = 0; n < cuantos; n++) {
    const cancha = elegir(canchas);
    // Sesgo hacia la franja de la tarde-noche, que es cuando se juega.
    const hora = elegir(slots.slice(Math.floor(slots.length * 0.45)));
    const clave = `${cancha.id}|${fecha}|${hora}`;
    if (ocupados.has(clave)) continue;
    ocupados.add(clave);

    const cliente = elegir(clientes);
    const precio = precioDe(cancha, hora);
    const cancelado = chance(0.06);
    const bookingId = id('bkg');

    bookings.push({
      id: bookingId,
      tenant_id: tenantId,
      fecha,
      hora,
      cancha_id: cancha.id,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      estado: cancelado ? 'cancelado' : 'reservado',
      origen_fijo_id: null,
      precio_cancha: precio,
      notas: chance(0.12) ? elegir(['Pidieron pecheras.', 'Cumpleaños, llevan torta.', 'Avisan si llueve.']) : '',
      canal: elegir(CANALES),
      created_at: ts(dia(offset - entre(1, 6)), '10:00'),
      updated_at: ts(fecha, hora),
    });

    if (cancelado) continue;

    // Los turnos que ya se jugaron están cobrados. Los que vienen, algunos con
    // seña y otros sin nada — que es como se ve una grilla de verdad.
    if (pasado) {
      pagos.push({
        id: id('pay'), tenant_id: tenantId, booking_id: bookingId,
        monto: precio, metodo: elegir(METODOS), fecha: ts(fecha, hora), nota: '',
      });
    } else if (chance(0.55)) {
      pagos.push({
        id: id('pay'), tenant_id: tenantId, booking_id: bookingId,
        monto: Math.round(precio / 2), metodo: elegir(METODOS),
        fecha: ts(dia(offset - entre(0, 3)), '11:00'), nota: 'Seña',
      });
    }
  }
}

for (let i = 0; i < bookings.length; i += 200) {
  const { error } = await db.from('bookings').insert(bookings.slice(i, i + 200));
  if (error) salir('turnos: ' + error.message);
}
for (let i = 0; i < pagos.length; i += 200) {
  const { error } = await db.from('payments').insert(pagos.slice(i, i + 200));
  if (error) salir('pagos: ' + error.message);
}
console.log(`  · ${bookings.length} turnos y ${pagos.length} pagos`);

// ── ventas de cantina ────────────────────────────────────────────────────────
const ventas = [];
const paraVender = productos.filter((p) => p.categoria !== 'servicios');

// Consumos cargados a un turno: quedan enlazados al booking, no sueltos.
for (const b of bookings) {
  if (b.estado === 'cancelado' || !chance(0.3)) continue;
  const items = [];
  for (let k = 0; k < entre(1, 3); k++) {
    const p = elegir(paraVender);
    items.push({ productoId: p.id, nombre: p.nombre, precioUnit: p.precio, cantidad: entre(1, 4) });
  }
  ventas.push({
    id: id('sale'), tenant_id: tenantId,
    fecha_hora: ts(b.fecha, b.hora),
    items, total: items.reduce((a, i) => a + i.precioUnit * i.cantidad, 0),
    metodo_pago: 'a_cuenta_turno',
    booking_id: b.id, cliente_id: b.cliente_id, cancha_id: b.cancha_id,
    anulada: false,
  });
}

// Ventas de mostrador: las que no van contra ningún turno.
for (let offset = -60; offset <= 0; offset++) {
  for (let n = 0; n < entre(2, 6); n++) {
    const items = [];
    for (let k = 0; k < entre(1, 3); k++) {
      const p = elegir(productos);
      items.push({ productoId: p.id, nombre: p.nombre, precioUnit: p.precio, cantidad: entre(1, 3) });
    }
    ventas.push({
      id: id('sale'), tenant_id: tenantId,
      fecha_hora: ts(dia(offset), elegir(slots)),
      items, total: items.reduce((a, i) => a + i.precioUnit * i.cantidad, 0),
      metodo_pago: elegir(METODOS),
      booking_id: null, cliente_id: null, cancha_id: null,
      anulada: chance(0.03),
    });
  }
}

for (let i = 0; i < ventas.length; i += 200) {
  const { error } = await db.from('sales').insert(ventas.slice(i, i + 200));
  if (error) salir('ventas: ' + error.message);
}
console.log(`  · ${ventas.length} ventas de cantina`);

// ── gastos ───────────────────────────────────────────────────────────────────
const gastos = GASTOS.map(([concepto, categoria, monto, off]) => ({
  id: id('gto'), tenant_id: tenantId,
  fecha: dia(off), concepto, categoria, monto, notas: '',
  created_at: ts(dia(off), '12:00'), updated_at: ts(dia(off), '12:00'),
}));
await db.from('expenses').insert(gastos).then(({ error }) => error && salir('gastos: ' + error.message));
console.log(`  · ${gastos.length} gastos`);

// ── resumen ──────────────────────────────────────────────────────────────────
const hoy = hoyISO();
const deHoy = bookings.filter((b) => b.fecha === hoy && b.estado !== 'cancelado');
const cobradoHoy = pagos
  .filter((p) => p.fecha.startsWith(hoy))
  .reduce((a, p) => a + p.monto, 0);

console.log(`\n  Hoy (${hoy}): ${deHoy.length} turnos · $${cobradoHoy.toLocaleString('es-AR')} cobrados`);
console.log('  Listo. Recargá la app.\n');
