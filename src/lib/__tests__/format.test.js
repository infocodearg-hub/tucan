import { describe, expect, it } from 'vitest';
import {
  formatARS,
  formatARSCompact,
  formatNumber,
  formatPercent,
  initials,
  toNumber,
  truncate,
} from '../format.js';

// El espacio que Intl usa entre símbolo y número es NBSP, no un espacio común.
const norm = (s) => s.replace(/ /g, ' ');

describe('toNumber', () => {
  it('nunca devuelve NaN', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber('26000')).toBe(26000);
    expect(toNumber(26000)).toBe(26000);
  });
});

describe('moneda', () => {
  it('formatARS usa separador de miles argentino', () => {
    expect(norm(formatARS(26000))).toBe('$ 26.000');
    expect(norm(formatARS(0))).toBe('$ 0');
  });

  it('formatARS no imprime NaN', () => {
    expect(norm(formatARS(undefined))).toBe('$ 0');
    expect(norm(formatARS(''))).toBe('$ 0');
  });

  it('formatARSCompact abrevia según magnitud', () => {
    expect(formatARSCompact(2_840_000)).toBe('$2,8 M');
    expect(formatARSCompact(620_000)).toBe('$620 mil');
    expect(formatARSCompact(26_000)).toBe('$26 mil');
    expect(norm(formatARSCompact(840))).toBe('$ 840');
  });

  it('formatARSCompact respeta negativos', () => {
    expect(formatARSCompact(-1_250_000)).toBe('-$1,3 M');
  });
});

describe('números y porcentajes', () => {
  it('formatNumber', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('formatPercent desde ratio', () => {
    expect(formatPercent(0.942)).toBe('94%');
    expect(formatPercent(94.2, { fromRatio: false, decimals: 1 })).toBe('94,2%');
  });
});

describe('texto', () => {
  it('truncate corta con puntos suspensivos reales, sin pasarse del largo pedido', () => {
    expect(truncate('Fernet Branca + Coca 1.5L', 12)).toBe('Fernet Bran…');
    expect(truncate('Fernet Branca + Coca 1.5L', 12).length).toBe(12);
    expect(truncate('Corto', 20)).toBe('Corto');
    expect(truncate(null, 5)).toBe('');
  });

  it('initials arma avatares', () => {
    expect(initials('Marcos Benítez')).toBe('MB');
    expect(initials('Gonzalo "El Hacha" Pérez')).toBe('GP');
    expect(initials('Lucía')).toBe('LU');
    expect(initials('')).toBe('?');
  });
});
