/**
 * Normalización de los datos de demostración.
 *
 * `mockData.js` queda como fixture crudo y NINGÚN componente lo importa.
 * Acá se convierte al modelo real: FKs de verdad, enums consistentes,
 * teléfonos E.164, puntajes numéricos y fechas rebasadas a hoy.
 *
 * Lo de "rebasadas a hoy" no es cosmético: los seeds estaban clavados en
 * 2026-08-04, así que la grilla de demo aparecía vacía cualquier otro día.
 */

import {
  CANTINA_PRODUCTS,
  CLIENTS_DATABASE,
  COMPLEX_INFO,
  INITIAL_BOOKINGS,
  TIME_SLOTS,
  TURNOS_FIJOS_RECURRENTES,
} from './mockData.js';

import { id } from '../lib/id.js';
import { addDays, dayOfWeek, monthKey, nowISO, todayISO } from '../lib/date.js';
import { normalizePhone } from '../lib/phone.js';
import { guessIconKey } from '../lib/catalog.js';
import { CATEGORIAS_SIN_STOCK } from '../lib/catalog.js';

const DEPORTE_DESDE_TIPO = {
  'Fútbol 5': 'futbol5',
  'Fútbol 7': 'futbol7',
  'Fútbol 11': 'futbol11',
  Pádel: 'padel',
  Tenis: 'tenis',
};

const CATEGORIA_DESDE_LABEL = {
  Bebidas: 'bebidas',
  Tragos: 'tragos',
  Snacks: 'snacks',
  Servicios: 'servicios',
};

const METODO_DESDE_TEXTO = (texto = '') => {
  const t = texto.toLowerCase();
  if (t.includes('mercado')) return 'mercadopago';
  if (t.includes('transferencia')) return 'transferencia';
  if (t.includes('tarjeta')) return 'tarjeta';
  if (t.includes('efectivo')) return 'efectivo';
  return 'efectivo';
};

const DIA_DESDE_NOMBRE = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
};

/** 'Cancha 1 (Fútbol 5)' o 'Cancha 2 - Sintético B' → el id de esa cancha. */
function resolverCanchaId(texto, canchas) {
  const m = String(texto).match(/Cancha\s+(\d+)/i);
  if (m) {
    const c = canchas[Number(m[1]) - 1];
    if (c) return c.id;
  }
  // Fallar ruidosamente: un fallback silencioso acá es pérdida de datos.
  throw new Error(`No se pudo resolver la cancha desde "${texto}"`);
}

function normalizarCanchas() {
  return COMPLEX_INFO.canchas.map((c, i) => {
    const [nombre, subtitulo] = c.name.split(' - ');
    return {
      id: c.id,
      nombre: nombre.trim(),
      subtitulo: (subtitulo ?? '').trim() || null,
      deporte: DEPORTE_DESDE_TIPO[c.type] ?? 'futbol5',
      precioDia: c.priceDay,
      precioNoche: c.priceNight,
      color: c.color,
      activa: true,
      orden: i,
    };
  });
}

function normalizarClientes() {
  return CLIENTS_DATABASE.map((c) => ({
    id: c.id,
    nombre: c.name,
    telefono: normalizePhone(c.phone),
    email: null,
    // '9.8/10' era un STRING: `'10/10' >= '9'` daba false y el KPI de VIP
    // contaba 1 cliente en vez de 3.
    score: Number.parseFloat(c.score) || null,
    etiquetas: [],
    notas: '',
    historicoPrevio: {
      partidos: c.matchesPlayed ?? 0,
      cancelaciones: c.cancellations ?? 0,
      gastado: c.totalSpent ?? 0,
    },
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }));
}

function normalizarProductos() {
  return CANTINA_PRODUCTS.map((p) => {
    const categoria = CATEGORIA_DESDE_LABEL[p.category] ?? 'bebidas';
    return {
      id: p.id,
      nombre: p.name,
      categoria,
      precio: p.price,
      stock: p.stock,
      stockMinimo: categoria === 'servicios' ? 0 : 6,
      // Los alquileres vuelven: descontarles stock los dejaría en 0 en una tarde.
      controlaStock: !CATEGORIAS_SIN_STOCK.has(categoria),
      // El emoji se descarta. El mapa viejo se indexaba por id de producto y
      // tenía la clave `prod_stella` para un producto llamado `prod_cerveza`.
      iconKey: guessIconKey(p.name, categoria),
      activo: true,
    };
  });
}

function normalizarTurnosFijos(canchas, clientes) {
  const hoy = todayISO();
  const diaHoy = dayOfWeek(hoy);

  return TURNOS_FIJOS_RECURRENTES.map((tf, i) => {
    const telefono = normalizePhone(tf.phone);
    const cliente = clientes.find((c) => c.telefono && c.telefono === telefono);

    // Los fijos se reparten desde hoy hacia adelante para que la tira de días
    // de la demo siempre muestre actividad.
    const diaSemana = i === 0 ? diaHoy : ((diaHoy - 1 + i) % 7) + 1;

    const estado =
      tf.monthlyStatus === 'Al día'
        ? 'al_dia'
        : tf.monthlyStatus?.includes('Pendiente')
          ? 'pendiente'
          : 'deuda';

    return {
      id: tf.id,
      canchaId: resolverCanchaId(tf.cancha, canchas),
      diaSemana,
      hora: tf.time.replace(/\s*hs\s*$/i, '').trim(),
      clienteId: cliente?.id ?? null,
      equipoNombre: tf.teamName,
      capitanNombre: tf.captain,
      telefono,
      vigenteDesde: addDays(hoy, -60),
      vigenteHasta: null,
      activo: true,
      precioMensualOverride: tf.monthlyPrice ?? null,
      estadoPorMes: { [monthKey(hoy)]: estado },
      excepciones: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  });
}

function normalizarBookingsYVentas(canchas, clientes, turnosFijos, productos) {
  const hoy = todayISO();
  const bookings = [];
  const sales = [];

  for (const b of INITIAL_BOOKINGS) {
    const telefono = normalizePhone(b.clientPhone);
    const cliente = clientes.find((c) => c.telefono && c.telefono === telefono);
    const bloqueado = b.status === 'blocked';
    // `dayOffset` (relativo a hoy, 0 default) reparte la demo en varios días
    // — si no, la tira semanal y el historial de caja de "otro día" arrancan
    // siempre vacíos.
    const fecha = addDays(hoy, b.dayOffset ?? 0);

    // El turno fijo de los martes queda enlazado a su recurrencia: si no,
    // se duplicaría contra la proyección.
    const fijo = b.isFixed ? turnosFijos.find((t) => t.canchaId === b.canchaId && t.hora === b.time) : null;

    const booking = {
      id: b.id,
      fecha,
      hora: b.time,
      canchaId: b.canchaId,
      clienteId: cliente?.id ?? null,
      clienteNombre: b.clientName,
      clienteTelefono: telefono,
      estado: bloqueado ? 'bloqueado' : 'reservado',
      origenFijoId: fijo?.id ?? null,
      precioCancha: b.totalPrice ?? 0,
      // `depositPaid` escalar → historial de pagos. Con esto existen pagos
      // parciales, método por pago y trazabilidad.
      pagos:
        b.depositPaid > 0
          ? [
              {
                id: id('pay'),
                monto: b.depositPaid,
                metodo: METODO_DESDE_TEXTO(b.paymentMethod),
                fecha: `${fecha}T12:00:00.000Z`,
                nota: '',
              },
            ]
          : [],
      notas: b.notes ?? '',
      canal: b.channel === 'bot_ai' ? 'bot_wa' : 'mostrador',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    bookings.push(booking);

    // `cantinaExtras` desaparece del turno: pasa a ser una venta con bookingId.
    // Una sola fuente de verdad para que el mismo peso no se cuente dos veces.
    if (b.cantinaExtras?.length) {
      const items = b.cantinaExtras.map((e) => ({
        productoId: e.id,
        nombre: productos.find((p) => p.id === e.id)?.nombre ?? e.name,
        precioUnit: e.price,
        cantidad: e.qty,
      }));
      sales.push({
        id: id('sale'),
        fechaHora: `${fecha}T${b.time}:00.000Z`,
        items,
        total: items.reduce((a, i) => a + i.precioUnit * i.cantidad, 0),
        metodoPago: 'a_cuenta_turno',
        bookingId: booking.id,
        clienteId: booking.clienteId,
        canchaId: booking.canchaId,
        anulada: false,
      });
    }
  }

  // Ventas de mostrador repartidas en varios días para que el historial de
  // caja no arranque vacío fuera de hoy.
  const mostrador = [
    { pid: 'prod_gatorade', cantidad: 2, metodo: 'efectivo', dayOffset: 0, hora: '17:30' },
    { pid: 'prod_papas', cantidad: 1, metodo: 'mercadopago', dayOffset: 0, hora: '20:15' },
    { pid: 'prod_pecheras', cantidad: 1, metodo: 'efectivo', dayOffset: -1, hora: '19:05' },
    { pid: 'prod_fernet', cantidad: 1, metodo: 'transferencia', dayOffset: -1, hora: '21:40' },
    { pid: 'prod_paleta', cantidad: 2, metodo: 'mercadopago', dayOffset: -2, hora: '18:50' },
  ];
  for (const m of mostrador) {
    const p = productos.find((x) => x.id === m.pid);
    if (!p) continue;
    sales.push({
      id: id('sale'),
      fechaHora: `${addDays(hoy, m.dayOffset)}T${m.hora}:00.000Z`,
      items: [{ productoId: p.id, nombre: p.nombre, precioUnit: p.precio, cantidad: m.cantidad }],
      total: p.precio * m.cantidad,
      metodoPago: m.metodo,
      bookingId: null,
      clienteId: null,
      canchaId: null,
      anulada: false,
    });
  }

  return { bookings, sales };
}

/** Gastos de ejemplo repartidos en los últimos días — para que Cierre de
 * Caja y la pestaña Gastos no arranquen vacíos en la demo. */
function sembrarGastos(hoy) {
  const filas = [
    { concepto: 'Sueldo cuidador de cancha', categoria: 'sueldos', monto: 45000, dayOffset: 0 },
    { concepto: 'Pastas para reflectores LED', categoria: 'mantenimiento', monto: 18500, dayOffset: -1 },
    { concepto: 'Factura de luz', categoria: 'servicios', monto: 62000, dayOffset: -2 },
    { concepto: 'Reposición de bebidas cantina', categoria: 'insumos', monto: 34000, dayOffset: -2 },
    { concepto: 'Service portón de acceso', categoria: 'otro', monto: 9000, dayOffset: -3 },
  ];
  return filas.map((g) => {
    const fecha = addDays(hoy, g.dayOffset);
    return {
      id: id('gto'),
      fecha,
      concepto: g.concepto,
      monto: g.monto,
      categoria: g.categoria,
      notas: '',
      createdAt: `${fecha}T12:00:00.000Z`,
      updatedAt: `${fecha}T12:00:00.000Z`,
    };
  });
}

function normalizarConfig() {
  return {
    complejo: {
      id: COMPLEX_INFO.id,
      nombre: COMPLEX_INFO.name,
      ciudad: COMPLEX_INFO.city,
      direccion: COMPLEX_INFO.address,
      telefono: normalizePhone(COMPLEX_INFO.phone) ?? COMPLEX_INFO.phone,
    },
    pagos: {
      alias: COMPLEX_INFO.alias,
      cbu: COMPLEX_INFO.cbu,
      mercadopagoConectado: COMPLEX_INFO.mercadopagoConnected ?? false,
      senaMinimaPorcentaje: COMPLEX_INFO.señaMinimaPorcentaje ?? 50,
    },
    operacion: {
      slots: [...TIME_SLOTS],
      horaNocturnaDesde: '19:00',
      permitirCargaRetroactiva: false,
    },
    integraciones: {
      whatsappBotActivo: COMPLEX_INFO.whatsappBotActive ?? true,
      modo247: true,
      alertasSinSena: true,
      recordatorioAutomatico: false,
      ocrComprobantes: true,
    },
    // Acceso local de demostración. NO es seguridad: no hay backend que validar.
    // Al migrar a Supabase esto se reemplaza por Supabase Auth.
    acceso: {
      usuario: 'admin',
      password: 'tucan',
      nombreMostrado: 'Encargado Maracaná',
    },
  };
}

/** Estado inicial completo, ya normalizado. */
export function createSeedData() {
  const hoy = todayISO();
  const canchas = normalizarCanchas();
  const clientes = normalizarClientes();
  const productos = normalizarProductos();
  const turnosFijos = normalizarTurnosFijos(canchas, clientes);
  const { bookings, sales } = normalizarBookingsYVentas(canchas, clientes, turnosFijos, productos);

  return {
    config: normalizarConfig(),
    canchas,
    bookings,
    clients: clientes,
    products: productos,
    turnosFijos,
    sales,
    expenses: sembrarGastos(hoy),
  };
}
