/**
 * horasHabilitadasPorDia y compañía (src/lib/disponibilidad.js) — el punto
 * central que decide qué horas puede ofrecer/aceptar el bot, la Grilla y
 * Reportes por día de semana.
 *
 * Lo crítico acá no es la función en sí, es la garantía de compatibilidad: un
 * tenant que nunca tocó la grilla nueva (`operacion.disponibilidad` vacío o
 * ausente) tiene que ver EXACTAMENTE lo mismo que veía antes de que este
 * campo existiera — mismos `slots`, los 7 días. Si eso se rompe, el bot deja
 * de ofrecer horarios el día del deploy para cualquier complejo existente.
 */
import { describe, expect, it } from 'vitest';
import { horasHabilitadasPorDia, horasHabilitadasEnFecha, horasUnion } from '../../lib/disponibilidad.js';

describe('horasHabilitadasPorDia — compatibilidad hacia atrás', () => {
  it('sin `disponibilidad` configurada, cae a `slots` replicado los 7 días', () => {
    const operacion = { slots: ['17:00', '18:00', '19:00'] };
    const porDia = horasHabilitadasPorDia(operacion);
    expect(Object.keys(porDia).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    for (const dia of Object.keys(porDia)) {
      expect(porDia[dia]).toEqual(['17:00', '18:00', '19:00']);
    }
  });

  it('`disponibilidad: {}` (el default de schema.js) también cae al fallback', () => {
    const operacion = { slots: ['20:00'], disponibilidad: {} };
    expect(horasHabilitadasPorDia(operacion)['1']).toEqual(['20:00']);
  });

  it('operacion undefined o sin slots no revienta — devuelve arrays vacíos', () => {
    expect(horasHabilitadasPorDia(undefined)['1']).toEqual([]);
    expect(horasHabilitadasPorDia({})['3']).toEqual([]);
  });
});

describe('horasHabilitadasPorDia — con la grilla nueva configurada', () => {
  it('cada día usa su propio array, sin mezclarse con el fallback', () => {
    const operacion = {
      slots: ['17:00', '18:00'],
      disponibilidad: { '1': ['18:00'], '6': ['15:00', '16:00', '17:00', '18:00'] },
    };
    const porDia = horasHabilitadasPorDia(operacion);
    expect(porDia['1']).toEqual(['18:00']);
    expect(porDia['6']).toEqual(['15:00', '16:00', '17:00', '18:00']);
    // Un día sin entrada explícita en `disponibilidad` queda vacío — no hereda `slots`.
    expect(porDia['2']).toBeUndefined();
  });
});

describe('horasHabilitadasEnFecha', () => {
  it('resuelve el día de semana de la fecha (2026-08-10 es lunes, 08-11 es martes)', () => {
    const operacion = { disponibilidad: { '1': ['09:00'], '2': ['10:00'] } };
    expect(horasHabilitadasEnFecha(operacion, '2026-08-10')).toEqual(['09:00']);
    expect(horasHabilitadasEnFecha(operacion, '2026-08-11')).toEqual(['10:00']);
  });

  it('un día sin horas habilitadas devuelve array vacío, no undefined', () => {
    const operacion = { disponibilidad: { '1': ['09:00'] } };
    expect(horasHabilitadasEnFecha(operacion, '2026-08-11')).toEqual([]);
  });
});

describe('horasUnion', () => {
  it('junta las horas de todos los días sin duplicar y ordena', () => {
    const operacion = { disponibilidad: { '1': ['18:00', '17:00'], '2': ['17:00', '19:00'] } };
    expect(horasUnion(operacion)).toEqual(['17:00', '18:00', '19:00']);
  });

  it('sin disponibilidad configurada, la unión es simplemente `slots`', () => {
    const operacion = { slots: ['20:00', '21:00'] };
    expect(horasUnion(operacion)).toEqual(['20:00', '21:00']);
  });
});
