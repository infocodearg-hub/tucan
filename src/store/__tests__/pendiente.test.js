/**
 * El turno "pendiente de confirmación", del reducer a la grilla.
 *
 * Lo que se prueba acá no es que el estado exista, sino las cuatro decisiones
 * que se tomaron alrededor y que se rompen en silencio si alguien las toca:
 * ocupa el slot, no cuenta como plata, se ve distinto, y confirmarlo limpia el
 * vencimiento.
 */
import { describe, expect, it } from 'vitest';
import { rootReducer } from '../reducer.js';
import { createInitialState } from '../schema.js';
import * as actions from '../actions.js';
import { selectDayKpis, selectIsSlotFree, selectBookingsForDate, selectClientStats } from '../selectors.js';
import { toLegacyBooking } from '../legacyAdapter.js';
import { slotVariant, ESTADO } from '../../lib/status.js';
import { bookingMapper, paymentMapper } from '../repository/mappers.js';

/** Estado con un turno pendiente en un slot que estaba libre. */
function conPendiente() {
  const state = createInitialState();
  const cancha = state.canchas[0];
  const fecha = state.bookings[0].fecha;
  const libre = state.config.operacion.slots.find((h) =>
    selectIsSlotFree(state, { fecha, canchaId: cancha.id, hora: h })
  );

  const next = rootReducer(
    state,
    actions.createBooking({
      fecha,
      hora: libre,
      canchaId: cancha.id,
      clienteNombre: 'Jugador Web',
      estado: 'pendiente',
      codigo: 'T4K9Q2',
      expiraAt: '2026-08-07T21:00:00.000Z',
      precioCancha: 40000,
      canal: 'web',
      pagos: [],
    })
  );

  const creado = next.bookings.find((b) => b.codigo === 'T4K9Q2');
  return { state: next, booking: creado, fecha, cancha, hora: libre };
}

describe('el pendiente ocupa el slot', () => {
  it('un segundo turno en el mismo horario se rechaza', () => {
    const { state, booking } = conPendiente();
    expect(booking).toBeTruthy();

    const next = rootReducer(
      state,
      actions.createBooking({
        fecha: booking.fecha,
        hora: booking.hora,
        canchaId: booking.canchaId,
        clienteNombre: 'Se cuela',
        estado: 'reservado',
        pagos: [],
      })
    );

    expect(next.bookings).toEqual(state.bookings);
    expect(next.ui.lastError).toMatch(/ocupado/i);
  });

  it('aparece en la grilla del día como cualquier otro turno', () => {
    const { state, booking, fecha } = conPendiente();
    const delDia = selectBookingsForDate(state, fecha);
    expect(delDia.some((b) => b.id === booking.id)).toBe(true);
  });
});

describe('el pendiente no es plata', () => {
  it('no suma al pendiente de cobro y se cuenta aparte', () => {
    const state = createInitialState();
    const fecha = state.bookings[0].fecha;
    const antes = selectDayKpis(state, fecha);

    const { state: conUno } = conPendiente();
    const despues = selectDayKpis(conUno, fecha);

    // El turno vale 40.000 y no puso un peso. Si se contara, `pendiente`
    // subiría — y el número dejaría de servir para saber a quién llamar.
    expect(despues.pendiente).toBe(antes.pendiente);
    expect(despues.sinConfirmar).toBe(antes.sinConfirmar + 1);
    // Pero sí ocupa el slot: la ocupación tiene que subir.
    expect(despues.ocupados).toBe(antes.ocupados + 1);
  });

  it('no cuenta como partido jugado del cliente', () => {
    const state = createInitialState();
    const cliente = state.clients[0];
    const antes = selectClientStats(state, cliente.id);

    const cancha = state.canchas[0];
    const fecha = state.bookings[0].fecha;
    const libre = state.config.operacion.slots.find((h) =>
      selectIsSlotFree(state, { fecha, canchaId: cancha.id, hora: h })
    );
    const next = rootReducer(
      state,
      actions.createBooking({
        fecha, hora: libre, canchaId: cancha.id,
        clienteId: cliente.id, clienteNombre: cliente.nombre,
        estado: 'pendiente', precioCancha: 40000, pagos: [],
      })
    );

    expect(selectClientStats(next, cliente.id).partidos).toBe(antes.partidos);
  });

  // El mapper de Supabase normaliza `historico_previo` NULL a `{}`, nunca a
  // `null` (ver `obj()` en repository/mappers.js) — un cliente de alta
  // reciente (creado por el bot o desde el panel) llega así. Un cliente cuyo
  // `historicoPrevio` no trae `gastado` no puede devolver NaN: eso se
  // contagia a cualquier suma que lo use, como el "Total Recaudado" de
  // ClientesCRM.
  it('un cliente con historicoPrevio {} da stats en 0, no NaN', () => {
    const state = createInitialState();
    const cliente = { ...state.clients[0], id: 'cli_sin_historico', historicoPrevio: {} };
    const stats = selectClientStats({ ...state, clients: [...state.clients, cliente] }, cliente.id);

    expect(stats).toEqual({ partidos: 0, cancelaciones: 0, gastado: 0 });
  });
});

describe('se ve distinto de un turno señado', () => {
  it('slotVariant devuelve `pendiente` aunque tenga un pago', () => {
    // Un pendiente con seña sigue siendo un pendiente: lo que puede
    // desaparecer manda sobre cualquier otra cosa que se pueda decir de él.
    expect(slotVariant({ estado: ESTADO.pendiente }, 'senado')).toBe('pendiente');
    expect(slotVariant({ estado: ESTADO.pendiente, origenFijoId: 'tf_1' }, 'pagado')).toBe('pendiente');
  });

  it('legacyAdapter lo mapea a `pending` y no a `partial`', () => {
    const { state, booking } = conPendiente();
    const legacy = toLegacyBooking(state, booking);
    // `partial` sería el fallback por descarte, y en la grilla se lee
    // "Señado": justo lo contrario de lo que es.
    expect(legacy.status).toBe('pending');
    expect(legacy.codigo).toBe('T4K9Q2');
    expect(legacy.expiraAt).toBe('2026-08-07T21:00:00.000Z');
  });

  it('marca la seña sin validar', () => {
    const { state, booking } = conPendiente();
    const conPago = rootReducer(
      state,
      actions.addPayment(booking.id, { monto: 20000, metodo: 'transferencia', validado: false })
    );
    const actualizado = conPago.bookings.find((b) => b.id === booking.id);
    expect(toLegacyBooking(conPago, actualizado).senaSinValidar).toBe(true);
  });
});

describe('confirmar y validar', () => {
  it('confirmar limpia el vencimiento', () => {
    const { state, booking } = conPendiente();
    const next = rootReducer(state, actions.confirmBooking(booking.id));
    const confirmado = next.bookings.find((b) => b.id === booking.id);

    expect(confirmado.estado).toBe('reservado');
    // Sin esto, el barrido de vencidos cancela un turno ya confirmado.
    expect(confirmado.expiraAt).toBeNull();
  });

  it('confirmar no toca un turno que ya estaba confirmado', () => {
    const state = createInitialState();
    const reservado = state.bookings.find((b) => b.estado === 'reservado');
    const next = rootReducer(state, actions.confirmBooking(reservado.id));
    expect(next.bookings.find((b) => b.id === reservado.id)).toEqual(reservado);
  });

  it('un pago cargado desde el panel nace validado', () => {
    const { state, booking } = conPendiente();
    const next = rootReducer(state, actions.addPayment(booking.id, { monto: 20000 }));
    const pago = next.bookings.find((b) => b.id === booking.id).pagos[0];
    expect(pago.validado).toBe(true);
  });

  it('validar un pago deja quién y cuándo', () => {
    const { state, booking } = conPendiente();
    const conPago = rootReducer(
      state,
      actions.addPayment(booking.id, { monto: 20000, validado: false })
    );
    const pagoId = conPago.bookings.find((b) => b.id === booking.id).pagos[0].id;

    const next = rootReducer(conPago, actions.validatePayment(booking.id, pagoId, 'usr_1'));
    const pago = next.bookings.find((b) => b.id === booking.id).pagos[0];

    expect(pago.validado).toBe(true);
    expect(pago.validadoPor).toBe('usr_1');
    expect(pago.validadoAt).toBeTruthy();
  });

  it('cancelar desde el panel deja el motivo, para que el bot no lo reviva', () => {
    const { state, booking } = conPendiente();
    const next = rootReducer(state, actions.cancelBooking(booking.id));
    expect(next.bookings.find((b) => b.id === booking.id).motivoCancelacion).toBe('mostrador');
  });
});

describe('mappers', () => {
  it('el turno va y vuelve con los campos nuevos', () => {
    const { booking } = conPendiente();
    const row = bookingMapper.toRow(booking);

    expect(row.estado).toBe('pendiente');
    expect(row.codigo).toBe('T4K9Q2');
    expect(row.expira_at).toBe('2026-08-07T21:00:00.000Z');
    // La columna generada NUNCA puede viajar en un insert: Postgres rechaza
    // la fila entera si se la mandan.
    expect(row).not.toHaveProperty('cliente_telefono_clave');

    const vuelta = bookingMapper.fromRow({ ...row, cliente_telefono_clave: '3416123456' });
    expect(vuelta.codigo).toBe('T4K9Q2');
    expect(vuelta.estado).toBe('pendiente');
  });

  it('un pago sin `validado` explícito se guarda como validado', () => {
    // Los pagos viejos y los que carga el mostrador se cuentan a mano.
    expect(paymentMapper.toRow({ id: 'pay_1', bookingId: 'bkg_1', monto: 100 }).validado).toBe(true);
    expect(paymentMapper.toRow({ id: 'pay_1', bookingId: 'bkg_1', monto: 100, validado: false }).validado).toBe(false);
  });

  it('el comprobante y la referencia externa sobreviven la vuelta', () => {
    const pago = {
      id: 'pay_1', bookingId: 'bkg_1', monto: 19000, metodo: 'transferencia',
      validado: false, comprobantePath: 'ten/2026-08/bkg_1/x.jpg', refExterna: 'wa:88213',
    };
    const vuelta = paymentMapper.fromRow(paymentMapper.toRow(pago));
    expect(vuelta.comprobantePath).toBe(pago.comprobantePath);
    expect(vuelta.refExterna).toBe('wa:88213');
    expect(vuelta.validado).toBe(false);
  });
});
