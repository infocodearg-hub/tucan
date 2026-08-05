import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone, normalizePhone, phoneDigits } from '../phone.js';

describe('normalizePhone', () => {
  it('todos los formatos argentinos habituales dan el mismo E.164', () => {
    const esperado = '+5493516123456';
    for (const entrada of [
      '+54 9 351 612-3456',
      '+5493516123456',
      '0351 15 612-3456',
      '351 15 612 3456',
      '351 612 3456',
      '3516123456',
      '(0351) 612-3456',
    ]) {
      expect(normalizePhone(entrada), `falló con "${entrada}"`).toBe(esperado);
    }
  });

  it('asume la característica del complejo si el número viene sin ella', () => {
    expect(normalizePhone('612-3456')).toBe('+5493516123456');
    expect(normalizePhone('612-3456', '11')).toBe('+549116123456');
  });

  it('devuelve null en vez de inventar un teléfono', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('-')).toBeNull();
    expect(normalizePhone('sin teléfono')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('acepta válidos y rechaza basura', () => {
    expect(isValidPhone('+54 9 351 612-3456')).toBe(true);
    expect(isValidPhone('351 612 3456')).toBe(true);
    expect(isValidPhone('-')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
  });
});

describe('presentación y wa.me', () => {
  it('formatPhone es legible', () => {
    expect(formatPhone('3516123456')).toBe('+54 9 351 612-3456');
  });

  it('formatPhone no rompe con entradas inservibles', () => {
    expect(formatPhone('-')).toBe('-');
    expect(formatPhone(null)).toBe('—');
  });

  it('phoneDigits no lleva el signo +', () => {
    expect(phoneDigits('+54 9 351 612-3456')).toBe('5493516123456');
    expect(phoneDigits('-')).toBeNull();
  });
});
