import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dayOfWeek,
  diffDays,
  formatLongDate,
  formatMediumDate,
  formatMonth,
  formatShortDate,
  isWithin,
  monthKey,
  occurrencesInMonth,
  rangeDays,
  startOfWeek,
} from '../date.js';

describe('aritmética de fechas', () => {
  it('suma días cruzando fin de mes', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('suma días cruzando fin de año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('respeta años bisiestos', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('no se corre por zona horaria (el bug de UTC)', () => {
    // `new Date('2026-08-04')` es UTC medianoche; en Argentina se vería como el 3.
    expect(addDays('2026-08-04', 0)).toBe('2026-08-04');
    expect(formatShortDate('2026-08-04')).toBe('04/08/2026');
  });

  it('addMonths clampea al último día del mes destino', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-08-04', 5)).toBe('2027-01-04');
  });

  it('diffDays', () => {
    expect(diffDays('2026-08-04', '2026-08-11')).toBe(7);
    expect(diffDays('2026-08-11', '2026-08-04')).toBe(-7);
    expect(diffDays('2026-08-04', '2026-08-04')).toBe(0);
  });

  it('rechaza formatos inválidos en vez de devolver basura', () => {
    expect(() => addDays('4/8/2026', 1)).toThrow();
    expect(() => addDays(undefined, 1)).toThrow();
  });
});

describe('día de semana ISO', () => {
  it('1 = lunes, 7 = domingo', () => {
    expect(dayOfWeek('2026-08-03')).toBe(1); // lunes
    expect(dayOfWeek('2026-08-04')).toBe(2); // martes
    expect(dayOfWeek('2026-08-08')).toBe(6); // sábado
    expect(dayOfWeek('2026-08-09')).toBe(7); // domingo
  });

  it('startOfWeek devuelve el lunes', () => {
    expect(startOfWeek('2026-08-09')).toBe('2026-08-03');
    expect(startOfWeek('2026-08-03')).toBe('2026-08-03');
  });
});

describe('presentación', () => {
  it('formatLongDate en español', () => {
    expect(formatLongDate('2026-08-04')).toBe('Martes 4 de agosto de 2026');
  });

  it('formatMediumDate', () => {
    expect(formatMediumDate('2026-08-04')).toBe('Mar 4 de agosto');
  });

  it('formatMonth capitaliza', () => {
    expect(formatMonth('2026-08')).toBe('Agosto 2026');
  });

  it('monthKey', () => {
    expect(monthKey('2026-08-04')).toBe('2026-08');
  });
});

describe('rangos y recurrencias', () => {
  it('rangeDays devuelve n días consecutivos', () => {
    expect(rangeDays('2026-08-04', 3)).toEqual(['2026-08-04', '2026-08-05', '2026-08-06']);
  });

  it('occurrencesInMonth encuentra todos los martes de agosto 2026', () => {
    const martes = occurrencesInMonth('2026-08', 2);
    expect(martes).toEqual(['2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25']);
  });

  it('occurrencesInMonth respeta febrero bisiesto', () => {
    expect(occurrencesInMonth('2028-02', 2).length).toBe(5);
  });

  it('isWithin trata los límites nulos como abiertos', () => {
    expect(isWithin('2026-08-04', '2026-08-01', null)).toBe(true);
    expect(isWithin('2026-08-04', null, null)).toBe(true);
    expect(isWithin('2026-07-04', '2026-08-01', null)).toBe(false);
    expect(isWithin('2026-09-04', null, '2026-08-31')).toBe(false);
  });
});
