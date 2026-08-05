import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';
import { nowISO } from '../../lib/date.js';

export function salesReducer(state, action) {
  switch (action.type) {
    case T.SALE_CREATE: {
      const sale = {
        id: genId('sale'),
        fechaHora: nowISO(),
        bookingId: null,
        clienteId: null,
        canchaId: null,
        anulada: false,
        ...action.payload,
      };
      return [sale, ...state];
    }

    case T.SALE_VOID:
      return state.map((s) => (s.id === action.payload.id ? { ...s, anulada: true } : s));

    default:
      return state;
  }
}
