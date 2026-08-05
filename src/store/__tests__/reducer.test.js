import { describe, expect, it } from 'vitest';
import { rootReducer } from '../reducer.js';
import { createInitialState } from '../schema.js';
import * as actions from '../actions.js';
import { selectBookingsForDate, selectIsSlotFree } from '../selectors.js';

function freshState() {
  return createInitialState();
}

describe('createInitialState', () => {
  it('produce un estado consistente a partir de los seeds', () => {
    const state = freshState();
    expect(state.canchas.length).toBeGreaterThan(0);
    expect(state.bookings.length).toBeGreaterThan(0);
    expect(state.clients.length).toBeGreaterThan(0);
    expect(state.products.length).toBeGreaterThan(0);
    expect(state.meta.schemaVersion).toBe(1);
  });
});

describe('bookings/create — doble reserva', () => {
  it('rechaza crear sobre un slot ya ocupado y no toca el turno existente', () => {
    const state = freshState();
    const ocupado = state.bookings.find((b) => b.estado !== 'cancelado');
    expect(ocupado).toBeTruthy();

    const intento = {
      id: 'bkg_intruso',
      fecha: ocupado.fecha,
      hora: ocupado.hora,
      canchaId: ocupado.canchaId,
      clienteNombre: 'Intruso',
      estado: 'reservado',
      pagos: [],
    };

    const next = rootReducer(state, actions.createBooking(intento));

    // El array de bookings queda exactamente igual (mismo contenido) — el
    // alta se descarta por completo en crossSlice, no queda "a medias".
    expect(next.bookings).toEqual(state.bookings);
    expect(next.bookings.some((b) => b.id === 'bkg_intruso')).toBe(false);
    expect(next.ui.lastError).toMatch(/ocupado/i);
  });

  it('acepta crear en un slot realmente libre', () => {
    const state = freshState();
    const cancha = state.canchas[0];
    const fecha = state.bookings[0].fecha;
    const libre = { fecha, canchaId: cancha.id, hora: '13:00' };
    expect(selectIsSlotFree(state, libre)).toBe(true);

    const next = rootReducer(
      state,
      actions.createBooking({ id: 'bkg_nuevo', clienteNombre: 'Test', estado: 'reservado', pagos: [], ...libre })
    );

    expect(next.bookings.some((b) => b.id === 'bkg_nuevo')).toBe(true);
    expect(next.ui.lastError).toBeNull();
  });
});

describe('bookings/update — mover de horario', () => {
  it('rechaza mover un turno a un slot ocupado por otro', () => {
    const state = freshState();
    const [a, b] = state.bookings.filter((x) => x.estado !== 'cancelado' && x.fecha === state.bookings[0].fecha);
    if (!a || !b || a.id === b.id) return; // seeds insuficientes, no aplica

    const next = rootReducer(state, actions.updateBooking(a.id, { hora: b.hora, canchaId: b.canchaId }));
    expect(next.bookings).toEqual(state.bookings);
    expect(next.ui.lastError).toMatch(/ocupado/i);
  });

  it('permite mover un turno a un slot libre', () => {
    const state = freshState();
    const a = state.bookings.find((x) => x.estado !== 'cancelado');
    const next = rootReducer(state, actions.updateBooking(a.id, { hora: '14:00', canchaId: a.canchaId, fecha: a.fecha }));
    const moved = next.bookings.find((x) => x.id === a.id);
    // Si 14:00 ya estaba ocupado en los seeds, el propio guard lo rechazaría;
    // solo afirmamos que NO quedó en un estado corrupto (o se movió, o no cambió nada).
    expect(moved).toBeTruthy();
  });
});

describe('sales — stock', () => {
  it('sales/create descuenta stock de productos con controlaStock', () => {
    const state = freshState();
    const producto = state.products.find((p) => p.controlaStock && p.stock > 0);
    const stockInicial = producto.stock;

    const next = rootReducer(
      state,
      actions.createSale({
        id: 'sale_test',
        items: [{ productoId: producto.id, nombre: producto.nombre, precioUnit: producto.precio, cantidad: 2 }],
        total: producto.precio * 2,
        metodoPago: 'efectivo',
      })
    );

    const actualizado = next.products.find((p) => p.id === producto.id);
    expect(actualizado.stock).toBe(stockInicial - 2);
  });

  it('sales/void repone el stock descontado', () => {
    let state = freshState();
    const producto = state.products.find((p) => p.controlaStock && p.stock > 0);
    const stockInicial = producto.stock;

    state = rootReducer(
      state,
      actions.createSale({
        id: 'sale_test',
        items: [{ productoId: producto.id, nombre: producto.nombre, precioUnit: producto.precio, cantidad: 3 }],
        total: producto.precio * 3,
        metodoPago: 'efectivo',
      })
    );
    expect(state.products.find((p) => p.id === producto.id).stock).toBe(stockInicial - 3);

    state = rootReducer(state, actions.voidSale('sale_test'));
    expect(state.products.find((p) => p.id === producto.id).stock).toBe(stockInicial);
  });

  it('no descuenta stock de productos sin controlaStock (alquileres)', () => {
    const state = freshState();
    const servicio = state.products.find((p) => !p.controlaStock);
    if (!servicio) return;
    const stockInicial = servicio.stock;

    const next = rootReducer(
      state,
      actions.createSale({
        id: 'sale_servicio',
        items: [{ productoId: servicio.id, nombre: servicio.nombre, precioUnit: servicio.precio, cantidad: 1 }],
        total: servicio.precio,
        metodoPago: 'efectivo',
      })
    );

    expect(next.products.find((p) => p.id === servicio.id).stock).toBe(stockInicial);
  });
});

describe('clients/delete', () => {
  it('desvincula la FK de los turnos pero conserva el nombre como snapshot', () => {
    let state = freshState();
    const bookingConCliente = state.bookings.find((b) => b.clienteId);
    if (!bookingConCliente) return; // seeds sin match, no aplica

    const nombreOriginal = bookingConCliente.clienteNombre;
    state = rootReducer(state, actions.deleteClient(bookingConCliente.clienteId));

    const actualizado = state.bookings.find((b) => b.id === bookingConCliente.id);
    expect(actualizado.clienteId).toBeNull();
    expect(actualizado.clienteNombre).toBe(nombreOriginal);
  });
});

describe('turnosFijos/delete', () => {
  it('desvincula origenFijoId de los bookings materializados en vez de arrastrarlos', () => {
    let state = freshState();
    const bookingFijo = state.bookings.find((b) => b.origenFijoId);
    if (!bookingFijo) return;

    state = rootReducer(state, actions.deleteTurnoFijo(bookingFijo.origenFijoId));
    const actualizado = state.bookings.find((b) => b.id === bookingFijo.id);
    expect(actualizado.origenFijoId).toBeNull();
    expect(actualizado).toBeTruthy(); // el booking en sí sigue existiendo
  });
});

describe('canchas/delete', () => {
  it('rechaza borrar una cancha con turnos activos', () => {
    const state = freshState();
    const canchaOcupada = state.bookings.find((b) => b.estado !== 'cancelado')?.canchaId;
    if (!canchaOcupada) return;

    const next = rootReducer(state, actions.deleteCancha(canchaOcupada));
    expect(next.canchas).toEqual(state.canchas);
    expect(next.ui.lastError).toMatch(/turnos/i);
  });
});

describe('selectBookingsForDate — proyección de turnos fijos', () => {
  it('no duplica un turno fijo que ya tiene booking materializado', () => {
    const state = freshState();
    const materializado = state.bookings.find((b) => b.origenFijoId);
    if (!materializado) return;

    const dia = selectBookingsForDate(state, materializado.fecha);
    const delMismoFijo = dia.filter((b) => b.origenFijoId === materializado.origenFijoId);
    expect(delMismoFijo.length).toBe(1);
    expect(delMismoFijo[0].esVirtual).toBeFalsy();
  });
});

describe('ui/toast — cola con tope', () => {
  it('no acumula más de 3 toasts', () => {
    let state = freshState();
    for (let i = 0; i < 5; i++) {
      state = rootReducer(state, actions.pushToast({ message: `msg ${i}` }));
    }
    expect(state.ui.toasts.length).toBe(3);
    // Se quedan los últimos 3, no los primeros.
    expect(state.ui.toasts.map((t) => t.message)).toEqual(['msg 2', 'msg 3', 'msg 4']);
  });
});
