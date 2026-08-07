/**
 * Traducción entre el modelo del store (camelCase) y las filas de Postgres
 * (snake_case).
 *
 * Se hace a mano y en un solo lugar a propósito. La alternativa —nombrar las
 * columnas en camelCase— obliga a entrecomillar cada identificador en todo el
 * SQL de la base, las funciones y las policies, y tarde o temprano alguien se
 * olvida una comilla y el error aparece en producción.
 *
 * Reglas al leer:
 *   - Los `timestamptz` pasan por `toTimestampISO`: Postgres los devuelve como
 *     `...+00:00` y varios selectores comparan estos valores como texto.
 *   - Los `numeric` se fuerzan a Number: nada de sumar strings en la caja.
 *   - Lo que en el store es `''` o `[]` nunca vuelve como `null`.
 */

import { toTimestampISO } from '../../lib/date.js';

const num = (v, def = 0) => (v === null || v === undefined ? def : Number(v));
const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));
const txt = (v) => v ?? '';
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// ─────────────────────────────────────────────────────────────── canchas

export const canchaMapper = {
  tabla: 'canchas',
  toRow: (c) => ({
    id: c.id,
    nombre: c.nombre,
    subtitulo: c.subtitulo ?? null,
    deporte: c.deporte ?? 'futbol5',
    precio_dia: num(c.precioDia),
    precio_noche: num(c.precioNoche),
    color: c.color ?? null,
    activa: c.activa !== false,
    orden: num(c.orden),
  }),
  fromRow: (r) => ({
    id: r.id,
    nombre: r.nombre,
    subtitulo: r.subtitulo ?? null,
    deporte: r.deporte,
    precioDia: num(r.precio_dia),
    precioNoche: num(r.precio_noche),
    color: r.color ?? null,
    activa: r.activa,
    orden: num(r.orden),
  }),
};

// ─────────────────────────────────────────────────────────────── clients

export const clientMapper = {
  tabla: 'clients',
  toRow: (c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono ?? null,
    email: c.email ?? null,
    score: numOrNull(c.score),
    etiquetas: arr(c.etiquetas),
    notas: txt(c.notas),
    historico_previo: obj(c.historicoPrevio),
    created_at: c.createdAt ?? null,
    updated_at: c.updatedAt ?? null,
  }),
  fromRow: (r) => ({
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono ?? null,
    email: r.email ?? null,
    score: numOrNull(r.score),
    etiquetas: arr(r.etiquetas),
    notas: txt(r.notas),
    historicoPrevio: obj(r.historico_previo),
    createdAt: toTimestampISO(r.created_at),
    updatedAt: toTimestampISO(r.updated_at),
  }),
};

// ─────────────────────────────────────────────────────────────── products

export const productMapper = {
  tabla: 'products',
  toRow: (p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria ?? 'bebidas',
    precio: num(p.precio),
    stock: num(p.stock),
    stock_minimo: num(p.stockMinimo),
    controla_stock: p.controlaStock !== false,
    icon_key: p.iconKey ?? null,
    activo: p.activo !== false,
  }),
  fromRow: (r) => ({
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    precio: num(r.precio),
    stock: num(r.stock),
    stockMinimo: num(r.stock_minimo),
    controlaStock: r.controla_stock,
    iconKey: r.icon_key ?? null,
    activo: r.activo,
  }),
};

// ─────────────────────────────────────────────────────────────── turnos fijos

export const turnoFijoMapper = {
  tabla: 'turnos_fijos',
  toRow: (t) => ({
    id: t.id,
    cancha_id: t.canchaId,
    dia_semana: num(t.diaSemana),
    hora: t.hora,
    cliente_id: t.clienteId ?? null,
    equipo_nombre: t.equipoNombre ?? null,
    capitan_nombre: t.capitanNombre ?? null,
    telefono: t.telefono ?? null,
    vigente_desde: t.vigenteDesde ?? null,
    vigente_hasta: t.vigenteHasta ?? null,
    activo: t.activo !== false,
    precio_mensual_override: numOrNull(t.precioMensualOverride),
    estado_por_mes: obj(t.estadoPorMes),
    excepciones: arr(t.excepciones),
    created_at: t.createdAt ?? null,
    updated_at: t.updatedAt ?? null,
  }),
  fromRow: (r) => ({
    id: r.id,
    canchaId: r.cancha_id,
    diaSemana: num(r.dia_semana),
    hora: r.hora,
    clienteId: r.cliente_id ?? null,
    equipoNombre: r.equipo_nombre ?? null,
    capitanNombre: r.capitan_nombre ?? null,
    telefono: r.telefono ?? null,
    vigenteDesde: r.vigente_desde ?? null,
    vigenteHasta: r.vigente_hasta ?? null,
    activo: r.activo,
    precioMensualOverride: numOrNull(r.precio_mensual_override),
    estadoPorMes: obj(r.estado_por_mes),
    excepciones: arr(r.excepciones),
    createdAt: toTimestampISO(r.created_at),
    updatedAt: toTimestampISO(r.updated_at),
  }),
};

// ─────────────────────────────────────────────────────────────── bookings
//
// `pagos[]` NO viaja en la fila del turno: son filas de `payments`. El repo lo
// re-anida al leer (ver `ensamblarEstado`), así que ningún selector ni
// componente se entera del cambio de forma.

export const bookingMapper = {
  tabla: 'bookings',
  toRow: (b) => ({
    id: b.id,
    fecha: b.fecha,
    hora: b.hora,
    cancha_id: b.canchaId,
    cliente_id: b.clienteId ?? null,
    cliente_nombre: b.clienteNombre ?? null,
    cliente_telefono: b.clienteTelefono ?? null,
    estado: b.estado ?? 'reservado',
    origen_fijo_id: b.origenFijoId ?? null,
    precio_cancha: num(b.precioCancha),
    notas: txt(b.notas),
    canal: b.canal ?? 'mostrador',
    expira_at: b.expiraAt ?? null,
    codigo: b.codigo ?? null,
    motivo_cancelacion: b.motivoCancelacion ?? null,
    created_at: b.createdAt ?? null,
    updated_at: b.updatedAt ?? null,
    // `cliente_telefono_clave` es una columna GENERADA: mandarla en un INSERT
    // o un UPDATE hace que Postgres rechace la fila entera.
  }),
  fromRow: (r) => ({
    id: r.id,
    fecha: r.fecha,
    hora: r.hora,
    canchaId: r.cancha_id,
    clienteId: r.cliente_id ?? null,
    clienteNombre: r.cliente_nombre ?? null,
    clienteTelefono: r.cliente_telefono ?? null,
    estado: r.estado,
    origenFijoId: r.origen_fijo_id ?? null,
    precioCancha: num(r.precio_cancha),
    pagos: [],
    notas: txt(r.notas),
    canal: r.canal,
    expiraAt: toTimestampISO(r.expira_at),
    codigo: r.codigo ?? null,
    motivoCancelacion: r.motivo_cancelacion ?? null,
    createdAt: toTimestampISO(r.created_at),
    updatedAt: toTimestampISO(r.updated_at),
  }),
};

// ─────────────────────────────────────────────────────────────── payments

export const paymentMapper = {
  tabla: 'payments',
  toRow: (p) => ({
    id: p.id,
    booking_id: p.bookingId,
    monto: num(p.monto),
    metodo: p.metodo ?? 'efectivo',
    fecha: p.fecha ?? null,
    nota: txt(p.nota),
    // Un pago cargado desde el panel lo contó una persona: nace validado. El
    // que llega por el bot lo inserta la Edge Function con `validado: false`.
    validado: p.validado !== false,
    comprobante_path: p.comprobantePath ?? null,
    validado_at: p.validadoAt ?? null,
    validado_por: p.validadoPor ?? null,
    ref_externa: p.refExterna ?? null,
  }),
  fromRow: (r) => ({
    id: r.id,
    bookingId: r.booking_id,
    monto: num(r.monto),
    metodo: r.metodo,
    fecha: toTimestampISO(r.fecha),
    nota: txt(r.nota),
    validado: r.validado !== false,
    comprobantePath: r.comprobante_path ?? null,
    validadoAt: toTimestampISO(r.validado_at),
    validadoPor: r.validado_por ?? null,
    refExterna: r.ref_externa ?? null,
  }),
};

// ─────────────────────────────────────────────────────────────── sales

export const saleMapper = {
  tabla: 'sales',
  toRow: (s) => ({
    id: s.id,
    fecha_hora: s.fechaHora ?? null,
    items: arr(s.items).map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnit: num(i.precioUnit),
      cantidad: num(i.cantidad),
    })),
    total: num(s.total),
    metodo_pago: s.metodoPago ?? 'efectivo',
    booking_id: s.bookingId ?? null,
    cliente_id: s.clienteId ?? null,
    cancha_id: s.canchaId ?? null,
    anulada: s.anulada === true,
  }),
  fromRow: (r) => ({
    id: r.id,
    fechaHora: toTimestampISO(r.fecha_hora),
    items: arr(r.items).map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnit: num(i.precioUnit),
      cantidad: num(i.cantidad),
    })),
    total: num(r.total),
    metodoPago: r.metodo_pago,
    bookingId: r.booking_id ?? null,
    clienteId: r.cliente_id ?? null,
    canchaId: r.cancha_id ?? null,
    anulada: r.anulada,
  }),
};

// ─────────────────────────────────────────────────────────────── expenses

export const expenseMapper = {
  tabla: 'expenses',
  toRow: (g) => ({
    id: g.id,
    fecha: g.fecha,
    concepto: g.concepto,
    monto: num(g.monto),
    categoria: g.categoria ?? 'otro',
    notas: txt(g.notas),
    created_at: g.createdAt ?? null,
    updated_at: g.updatedAt ?? null,
  }),
  fromRow: (r) => ({
    id: r.id,
    fecha: r.fecha,
    concepto: r.concepto,
    monto: num(r.monto),
    categoria: r.categoria,
    notas: txt(r.notas),
    createdAt: toTimestampISO(r.created_at),
    updatedAt: toTimestampISO(r.updated_at),
  }),
};

// ─────────────────────────────────────────────────────────────── config
//
// El slice `config` es un objeto único, no una colección. `acceso` desapareció
// del modelo: las credenciales viven en auth.users, nunca en datos de negocio.

export const configMapper = {
  tabla: 'tenant_config',
  toRow: (c) => ({
    complejo: obj(c.complejo),
    pagos: obj(c.pagos),
    operacion: obj(c.operacion),
    integraciones: obj(c.integraciones),
  }),
  fromRow: (r) => ({
    complejo: obj(r?.complejo),
    pagos: obj(r?.pagos),
    operacion: obj(r?.operacion),
    integraciones: obj(r?.integraciones),
  }),
};

/**
 * Orden de escritura. No es alfabético: respeta las claves foráneas.
 * Los turnos no pueden apuntar a una cancha que todavía no existe, y las ventas
 * no pueden apuntar a un turno que todavía no existe. Para los borrados se
 * recorre al revés.
 */
export const ORDEN_ESCRITURA = [
  { slice: 'canchas', mapper: canchaMapper },
  { slice: 'clients', mapper: clientMapper },
  { slice: 'products', mapper: productMapper },
  { slice: 'turnosFijos', mapper: turnoFijoMapper },
  { slice: 'bookings', mapper: bookingMapper },
  { slice: 'sales', mapper: saleMapper },
  { slice: 'expenses', mapper: expenseMapper },
];
