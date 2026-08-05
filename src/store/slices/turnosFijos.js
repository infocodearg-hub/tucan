import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';
import { monthKey, nowISO, todayISO } from '../../lib/date.js';

export function turnosFijosReducer(state, action) {
  switch (action.type) {
    case T.TURNO_FIJO_CREATE: {
      const tf = {
        id: genId('tf'),
        vigenteDesde: todayISO(),
        vigenteHasta: null,
        activo: true,
        precioMensualOverride: null,
        estadoPorMes: { [monthKey(todayISO())]: 'pendiente' },
        excepciones: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...action.payload,
      };
      return [...state, tf];
    }

    case T.TURNO_FIJO_UPDATE:
      return state.map((tf) =>
        tf.id === action.payload.id ? { ...tf, ...action.payload.patch, updatedAt: nowISO() } : tf
      );

    case T.TURNO_FIJO_DELETE:
      return state.filter((tf) => tf.id !== action.payload.id);

    case T.TURNO_FIJO_RESTORE:
      return state.some((tf) => tf.id === action.payload.id) ? state : [...state, action.payload];

    case T.TURNO_FIJO_ADD_EXCEPTION:
      return state.map((tf) =>
        tf.id === action.payload.id
          ? {
              ...tf,
              excepciones: tf.excepciones.includes(action.payload.fecha)
                ? tf.excepciones
                : [...tf.excepciones, action.payload.fecha],
              updatedAt: nowISO(),
            }
          : tf
      );

    case T.TURNO_FIJO_SET_MONTH_STATUS:
      return state.map((tf) =>
        tf.id === action.payload.id
          ? {
              ...tf,
              estadoPorMes: { ...tf.estadoPorMes, [action.payload.mesKey]: action.payload.estado },
              updatedAt: nowISO(),
            }
          : tf
      );

    default:
      return state;
  }
}
