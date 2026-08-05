import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';
import { nowISO } from '../../lib/date.js';

export function expensesReducer(state, action) {
  switch (action.type) {
    case T.EXPENSE_CREATE: {
      const expense = {
        id: genId('gto'),
        categoria: 'otro',
        notas: '',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...action.payload,
      };
      return [...state, expense];
    }

    case T.EXPENSE_UPDATE:
      return state.map((g) =>
        g.id === action.payload.id ? { ...g, ...action.payload.patch, updatedAt: nowISO() } : g
      );

    case T.EXPENSE_DELETE:
      return state.filter((g) => g.id !== action.payload.id);

    // Deshacer un borrado: vuelve a insertar el registro capturado por el toast.
    case T.EXPENSE_RESTORE:
      return state.some((g) => g.id === action.payload.id)
        ? state
        : [action.payload, ...state];

    default:
      return state;
  }
}
