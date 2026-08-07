import { describe, expect, it } from 'vitest';
import { aplanarPagos, diffColeccion, diffPagos } from '../diff.js';
import { bookingMapper, canchaMapper, paymentMapper, saleMapper } from '../mappers.js';

// El diff decide qué se manda a la base. Un falso positivo escribe de más (caro,
// no grave); un falso negativo pierde el cambio del usuario. Los dos casos que
// más importan son los borrados: si el diff los inventa, se borran datos reales.

describe('diffColeccion', () => {
  it('detecta altas, cambios y borrados', () => {
    const prev = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'c', n: 3 }];
    const next = [{ id: 'a', n: 1 }, { id: 'b', n: 99 }, { id: 'd', n: 4 }];

    const { upsert, deleteIds } = diffColeccion(prev, next);

    expect(upsert.map((x) => x.id).sort()).toEqual(['b', 'd']);
    expect(deleteIds).toEqual(['c']);
  });

  it('no manda nada si no cambió nada', () => {
    const items = [{ id: 'a', n: 1, sub: { x: 1 } }];
    const igual = [{ id: 'a', n: 1, sub: { x: 1 } }];

    const { upsert, deleteIds } = diffColeccion(items, igual);

    expect(upsert).toEqual([]);
    expect(deleteIds).toEqual([]);
  });

  it('tolera slices vacías o ausentes sin inventar borrados', () => {
    expect(diffColeccion(undefined, undefined)).toEqual({ upsert: [], deleteIds: [] });
    expect(diffColeccion([], [{ id: 'a' }]).upsert).toHaveLength(1);
    expect(diffColeccion([{ id: 'a' }], []).deleteIds).toEqual(['a']);
  });
});

describe('diffPagos', () => {
  const conPagos = (pagos) => [
    { id: 'bkg_1', pagos },
    { id: 'bkg_2', pagos: [] },
  ];

  it('aplana los pagos anidados agregando el bookingId', () => {
    const planos = aplanarPagos(conPagos([{ id: 'pay_1', monto: 100 }]));
    expect(planos).toEqual([{ id: 'pay_1', monto: 100, bookingId: 'bkg_1' }]);
  });

  it('detecta un pago nuevo dentro de un turno existente', () => {
    const prev = conPagos([]);
    const next = conPagos([{ id: 'pay_1', monto: 500 }]);

    const { upsert, deleteIds } = diffPagos(prev, next);

    expect(upsert).toEqual([{ id: 'pay_1', monto: 500, bookingId: 'bkg_1' }]);
    expect(deleteIds).toEqual([]);
  });

  it('NO borra los pagos de un turno borrado: de eso se ocupa el cascade', () => {
    // Mandar el delete igual sería una llamada al pedo y, peor, podría llegar
    // después del delete del turno y fallar.
    const prev = conPagos([{ id: 'pay_1', monto: 500 }]);
    const next = [{ id: 'bkg_2', pagos: [] }];

    expect(diffPagos(prev, next).deleteIds).toEqual([]);
  });

  it('sí borra un pago quitado a mano de un turno que sigue existiendo', () => {
    const prev = conPagos([{ id: 'pay_1', monto: 500 }]);
    const next = conPagos([]);

    expect(diffPagos(prev, next).deleteIds).toEqual(['pay_1']);
  });
});

describe('mappers — ida y vuelta', () => {
  it('una cancha sobrevive al viaje sin perder ni cambiar nada', () => {
    const cancha = {
      id: 'can_x', nombre: 'Cancha 1', subtitulo: 'Sintético', deporte: 'futbol5',
      precioDia: 18000, precioNoche: 24000, color: 'var(--green)', activa: true, orden: 0,
    };
    expect(canchaMapper.fromRow(canchaMapper.toRow(cancha))).toEqual(cancha);
  });

  it('los numeric que Postgres devuelve como texto vuelven como número', () => {
    // PostgREST puede serializar `numeric` como string. Sumar strings en la caja
    // daría "1800024000" en vez de 42000.
    const row = { id: 'can_x', nombre: 'C', precio_dia: '18000', precio_noche: '24000', orden: '2' };
    const cancha = canchaMapper.fromRow(row);
    expect(cancha.precioDia + cancha.precioNoche).toBe(42000);
    expect(cancha.orden).toBe(2);
  });

  it('normaliza los timestamptz al formato que comparan los selectores', () => {
    // `selectPagosDelDia` hace `pago.fecha.slice(0, 10)`. Postgres devuelve
    // `+00:00` y el reducer genera `Z`: sin normalizar, el mismo pago se vería
    // distinto según de dónde vino.
    const pago = paymentMapper.fromRow({
      id: 'pay_1', booking_id: 'bkg_1', monto: '500', metodo: 'efectivo',
      fecha: '2026-08-05T12:00:00+00:00', nota: '',
    });
    expect(pago.fecha).toBe('2026-08-05T12:00:00.000Z');
    expect(pago.fecha.slice(0, 10)).toBe('2026-08-05');
  });

  it('un turno vuelve con `pagos` vacío: los pagos son filas aparte', () => {
    const booking = bookingMapper.fromRow({
      id: 'bkg_1', fecha: '2026-08-05', hora: '20:00', cancha_id: 'can_x',
      estado: 'reservado', precio_cancha: '18000', notas: '', canal: 'web',
    });
    expect(booking.pagos).toEqual([]);
    expect(booking.precioCancha).toBe(18000);
  });

  it('los ítems de una venta conservan el precio del momento', () => {
    const venta = {
      id: 'sale_1', fechaHora: '2026-08-05T17:30:00.000Z',
      items: [{ productoId: 'prd_1', nombre: 'Gatorade', precioUnit: 2500, cantidad: 2 }],
      total: 5000, metodoPago: 'efectivo', bookingId: null, clienteId: null,
      canchaId: null, anulada: false,
    };
    expect(saleMapper.fromRow(saleMapper.toRow(venta))).toEqual(venta);
  });
});
