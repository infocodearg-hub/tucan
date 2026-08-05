import { describe, expect, it } from 'vitest';
import { createSeedData } from '../../data/seed.js';

describe('createSeedData — normalización de los fixtures viejos', () => {
  const seed = createSeedData();

  it('toda cancha referenciada por un booking o turno fijo existe', () => {
    const ids = new Set(seed.canchas.map((c) => c.id));
    for (const b of seed.bookings) expect(ids.has(b.canchaId), `booking ${b.id}`).toBe(true);
    for (const tf of seed.turnosFijos) expect(ids.has(tf.canchaId), `turnoFijo ${tf.id}`).toBe(true);
  });

  it('toda hora tiene formato HH:mm — sin el sufijo " hs" que traían los turnos fijos', () => {
    const re = /^\d{2}:\d{2}$/;
    for (const b of seed.bookings) expect(b.hora, `booking ${b.id}`).toMatch(re);
    for (const tf of seed.turnosFijos) expect(tf.hora, `turnoFijo ${tf.id}`).toMatch(re);
  });

  it('todo score de cliente es number o null, nunca el string "X/10"', () => {
    for (const c of seed.clients) {
      expect(typeof c.score === 'number' || c.score === null, `cliente ${c.id}`).toBe(true);
    }
  });

  it('diaSemana de cada turno fijo es un ISO válido (1-7)', () => {
    for (const tf of seed.turnosFijos) {
      expect(tf.diaSemana).toBeGreaterThanOrEqual(1);
      expect(tf.diaSemana).toBeLessThanOrEqual(7);
    }
  });

  it('ningún booking tiene precioCancha o pagos que produzcan NaN', () => {
    for (const b of seed.bookings) {
      expect(Number.isFinite(b.precioCancha)).toBe(true);
      for (const p of b.pagos) expect(Number.isFinite(p.monto)).toBe(true);
    }
  });

  it('teléfonos quedan en E.164 o null, nunca el placeholder "-"', () => {
    for (const c of seed.clients) {
      if (c.telefono !== null) expect(c.telefono).toMatch(/^\+549\d+$/);
    }
  });

  it('el turno fijo de los martes queda enlazado a su booking materializado (no se duplica)', () => {
    const fijoConBooking = seed.turnosFijos.find((tf) =>
      seed.bookings.some((b) => b.origenFijoId === tf.id)
    );
    expect(fijoConBooking).toBeTruthy();
  });

  it('cantinaExtras del booking viejo se convierte en Sale con bookingId, no queda embebido', () => {
    const bookingConSena = seed.bookings.find((b) => b.notas?.includes('pecheras'));
    if (!bookingConSena) return;
    const ventaAsociada = seed.sales.find((s) => s.bookingId === bookingConSena.id);
    expect(ventaAsociada).toBeTruthy();
    expect(bookingConSena.cantinaExtras).toBeUndefined();
  });

  it('categorías de producto están en el enum nuevo, no el label en español', () => {
    const validas = new Set(['bebidas', 'tragos', 'snacks', 'servicios']);
    for (const p of seed.products) expect(validas.has(p.categoria), p.id).toBe(true);
  });

  it('productos "servicios" no controlan stock (son alquileres que vuelven)', () => {
    for (const p of seed.products.filter((x) => x.categoria === 'servicios')) {
      expect(p.controlaStock).toBe(false);
    }
  });
});
