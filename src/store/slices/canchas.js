import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';

export function canchasReducer(state, action) {
  switch (action.type) {
    case T.CANCHA_CREATE: {
      const cancha = {
        id: genId('can'),
        activa: true,
        orden: state.length,
        ...action.payload,
      };
      return [...state, cancha];
    }

    case T.CANCHA_UPDATE:
      return state.map((c) =>
        c.id === action.payload.id ? { ...c, ...action.payload.patch } : c
      );

    case T.CANCHA_DELETE:
      // El guard de "tiene turnos" vive en crossSlice, que puede ver bookings.
      return state.filter((c) => c.id !== action.payload.id);

    default:
      return state;
  }
}
