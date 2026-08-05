import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';
import { nowISO } from '../../lib/date.js';

export function clientsReducer(state, action) {
  switch (action.type) {
    case T.CLIENT_CREATE: {
      const client = {
        id: genId('cli'),
        email: null,
        score: null,
        etiquetas: [],
        notas: '',
        historicoPrevio: { partidos: 0, cancelaciones: 0, gastado: 0 },
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...action.payload,
      };
      return [...state, client];
    }

    case T.CLIENT_UPDATE:
      return state.map((c) =>
        c.id === action.payload.id ? { ...c, ...action.payload.patch, updatedAt: nowISO() } : c
      );

    case T.CLIENT_DELETE:
      return state.filter((c) => c.id !== action.payload.id);

    // Deshacer un borrado: vuelve a insertar el registro capturado por el toast.
    case T.CLIENT_RESTORE:
      return state.some((c) => c.id === action.payload.id)
        ? state
        : [action.payload, ...state];

    default:
      return state;
  }
}
