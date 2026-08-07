import { describe, expect, it } from 'vitest';
import {
  construirNotificaciones,
  MINUTOS_AVISO_EXPIRACION,
  TIPOS,
} from '../notificaciones.js';

// Ahora fijo para todos los casos: la función recibe el reloj, no lo lee.
const AHORA = Date.parse('2026-08-06T20:00:00.000Z');
const enMinutos = (m) => new Date(AHORA + m * 60_000).toISOString();
const enHoras = (h) => new Date(AHORA + h * 3600_000).toISOString();

/** Turno base "sano": no dispara ninguna alerta por sí solo. */
const turno = (extra = {}) => ({
  id: 'bkg_1',
  fecha: '2026-08-06',
  hora: '20:00',
  clienteNombre: 'Julián Ávila',
  estado: 'reservado',
  canal: 'mostrador',
  pagos: [],
  ...extra,
});

describe('construirNotificaciones', () => {
  it('sin datos no devuelve nada', () => {
    expect(construirNotificaciones({ ahoraMs: AHORA })).toEqual([]);
  });

  it('avisa de una seña que nadie validó', () => {
    const items = construirNotificaciones({
      bookings: [turno({ pagos: [{ id: 'pag_1', validado: false, fecha: enHoras(-1) }] })],
      ahoraMs: AHORA,
    });
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe(TIPOS.SENA_SIN_VALIDAR);
    expect(items[0].target).toEqual({ kind: 'booking', bookingId: 'bkg_1', fecha: '2026-08-06' });
  });

  it('ignora los pagos ya validados', () => {
    const items = construirNotificaciones({
      bookings: [turno({ pagos: [{ id: 'pag_1', validado: true }] })],
      ahoraMs: AHORA,
    });
    expect(items).toEqual([]);
  });

  it('el id es determinista: sobrevive a que el store se recargue entero', () => {
    const args = {
      bookings: [turno({ pagos: [{ id: 'pag_1', validado: false }] })],
      ahoraMs: AHORA,
    };
    const a = construirNotificaciones(args);
    // Mismos datos, objetos nuevos (es lo que hace el realtime al recargar).
    const b = construirNotificaciones(JSON.parse(JSON.stringify(args)));
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].id).toBe('sena_sin_validar:bkg_1:pag_1');
  });

  it('avisa de un pendiente dentro de la ventana de expiración', () => {
    const items = construirNotificaciones({
      bookings: [turno({ estado: 'pendiente', expiraAt: enMinutos(MINUTOS_AVISO_EXPIRACION - 1) })],
      ahoraMs: AHORA,
    });
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe(TIPOS.TURNO_POR_EXPIRAR);
  });

  it('no avisa de un pendiente que vence más tarde', () => {
    const items = construirNotificaciones({
      bookings: [turno({ estado: 'pendiente', expiraAt: enMinutos(MINUTOS_AVISO_EXPIRACION + 5) })],
      ahoraMs: AHORA,
    });
    expect(items).toEqual([]);
  });

  it('no avisa de un pendiente ya vencido', () => {
    const items = construirNotificaciones({
      bookings: [turno({ estado: 'pendiente', expiraAt: enMinutos(-5) })],
      ahoraMs: AHORA,
    });
    expect(items).toEqual([]);
  });

  it('alertasSinSena en false apaga seña sin validar y por expirar, pero no el resto', () => {
    const bookings = [
      turno({ id: 'bkg_1', pagos: [{ id: 'pag_1', validado: false }] }),
      turno({ id: 'bkg_2', estado: 'pendiente', expiraAt: enMinutos(5) }),
      turno({ id: 'bkg_3', canal: 'bot_wa', createdAt: enHoras(-1) }),
    ];
    const items = construirNotificaciones({
      bookings,
      config: { integraciones: { alertasSinSena: false } },
      ahoraMs: AHORA,
    });
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe(TIPOS.TURNO_BOT_NUEVO);
  });

  it('un turno del bot es novedad solo por un rato', () => {
    const reciente = construirNotificaciones({
      bookings: [turno({ canal: 'bot_wa', createdAt: enHoras(-2) })],
      ahoraMs: AHORA,
    });
    const viejo = construirNotificaciones({
      bookings: [turno({ canal: 'bot_wa', createdAt: enHoras(-30) })],
      ahoraMs: AHORA,
    });
    expect(reciente).toHaveLength(1);
    expect(viejo).toEqual([]);
  });

  it('saltea los turnos fijos proyectados: todavía no existen en la base', () => {
    const items = construirNotificaciones({
      bookings: [turno({ esVirtual: true, canal: 'bot_wa', createdAt: enHoras(-1) })],
      ahoraMs: AHORA,
    });
    expect(items).toEqual([]);
  });

  it('las derivaciones abiertas llevan a su pestaña', () => {
    const items = construirNotificaciones({
      derivaciones: [{ id: 'der_1', telefono: '1122334455', motivo: 'Quiere hablar', created_at: enHoras(-1) }],
      ahoraMs: AHORA,
    });
    expect(items).toHaveLength(1);
    expect(items[0].target).toEqual({ kind: 'tab', tab: 'derivaciones' });
  });

  it('ordena de más nuevo a más viejo y respeta el límite', () => {
    const bookings = [
      turno({ id: 'viejo', canal: 'bot_wa', createdAt: enHoras(-6) }),
      turno({ id: 'nuevo', canal: 'bot_wa', createdAt: enHoras(-1) }),
    ];
    const items = construirNotificaciones({ bookings, ahoraMs: AHORA });
    expect(items.map((n) => n.id)).toEqual([
      'turno_bot_nuevo:nuevo',
      'turno_bot_nuevo:viejo',
    ]);
    expect(construirNotificaciones({ bookings, ahoraMs: AHORA, limite: 1 })).toHaveLength(1);
  });
});
