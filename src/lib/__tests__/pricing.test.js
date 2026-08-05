import { describe, expect, it } from 'vitest';
import {
  bookingTotals,
  compareSlots,
  isNightSlot,
  precioSlot,
  salesTotal,
  senaSugerida,
  slotMinutes,
} from '../pricing.js';

const cancha = { precioDia: 22000, precioNoche: 26000 };

describe('horarios', () => {
  it('00:00 es el último slot del día, no el primero', () => {
    expect(slotMinutes('00:00')).toBe(1440);
    expect(slotMinutes('23:00')).toBe(1380);
    expect(slotMinutes('14:00')).toBe(840);
  });

  it('isNightSlot con el umbral por defecto (19:00)', () => {
    expect(isNightSlot('18:00')).toBe(false);
    expect(isNightSlot('19:00')).toBe(true);
    expect(isNightSlot('23:00')).toBe(true);
    expect(isNightSlot('00:00')).toBe(true); // el caso que rompía las 4 copias viejas
  });

  it('el umbral es configurable', () => {
    expect(isNightSlot('18:00', '17:00')).toBe(true);
    expect(isNightSlot('19:00', '21:00')).toBe(false);
  });

  it('compareSlots ordena poniendo 00:00 al final', () => {
    const slots = ['00:00', '14:00', '23:00', '19:00'];
    expect([...slots].sort(compareSlots)).toEqual(['14:00', '19:00', '23:00', '00:00']);
  });
});

describe('precios', () => {
  it('aplica tarifa diurna o nocturna', () => {
    expect(precioSlot(cancha, '15:00')).toBe(22000);
    expect(precioSlot(cancha, '21:00')).toBe(26000);
    expect(precioSlot(cancha, '00:00')).toBe(26000);
  });

  it('sin cancha devuelve 0 en vez de romper', () => {
    expect(precioSlot(null, '21:00')).toBe(0);
  });

  it('senaSugerida respeta el porcentaje configurado', () => {
    expect(senaSugerida(26000, 50)).toBe(13000);
    expect(senaSugerida(26000, 30)).toBe(7800);
    expect(senaSugerida(26000, 0)).toBe(0);
    expect(senaSugerida(26000, 999)).toBe(26000); // clampea al 100%
  });
});

describe('totales de un turno', () => {
  const booking = { precioCancha: 26000, pagos: [] };

  it('sin pagos → sin seña', () => {
    const t = bookingTotals(booking);
    expect(t).toMatchObject({ total: 26000, pagado: 0, saldo: 26000, estadoPago: 'sin_sena' });
  });

  it('pago parcial → señado', () => {
    const t = bookingTotals({ ...booking, pagos: [{ monto: 13000 }] });
    expect(t).toMatchObject({ pagado: 13000, saldo: 13000, estadoPago: 'senado' });
    expect(t.pctPagado).toBeCloseTo(0.5);
  });

  it('pago completo → pagado', () => {
    const t = bookingTotals({ ...booking, pagos: [{ monto: 13000 }, { monto: 13000 }] });
    expect(t).toMatchObject({ pagado: 26000, saldo: 0, estadoPago: 'pagado' });
  });

  it('sobrepago no genera saldo negativo', () => {
    const t = bookingTotals({ ...booking, pagos: [{ monto: 40000 }] });
    expect(t.saldo).toBe(0);
    expect(t.pctPagado).toBe(1);
  });

  it('suma la cantina de las ventas asociadas y omite las anuladas', () => {
    const ventas = [{ total: 8400 }, { total: 5000, anulada: true }];
    const t = bookingTotals(booking, ventas);
    expect(t.subtotalCantina).toBe(8400);
    expect(t.total).toBe(34400);
  });

  it('valores basura no producen NaN', () => {
    const t = bookingTotals({ precioCancha: undefined, pagos: [{ monto: '' }] });
    expect(t.total).toBe(0);
    expect(t.pagado).toBe(0);
    expect(Number.isNaN(t.saldo)).toBe(false);
  });
});

describe('ventas', () => {
  it('salesTotal multiplica cantidad por precio', () => {
    expect(salesTotal([{ precioUnit: 2500, cantidad: 2 }, { precioUnit: 4200, cantidad: 1 }])).toBe(
      9200
    );
    expect(salesTotal([])).toBe(0);
  });
});
