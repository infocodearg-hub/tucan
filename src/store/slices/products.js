import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';

export function productsReducer(state, action) {
  switch (action.type) {
    case T.PRODUCT_CREATE: {
      const product = {
        id: genId('prd'),
        stock: 0,
        stockMinimo: 6,
        controlaStock: true,
        activo: true,
        ...action.payload,
      };
      return [...state, product];
    }

    case T.PRODUCT_UPDATE:
      return state.map((p) =>
        p.id === action.payload.id ? { ...p, ...action.payload.patch } : p
      );

    case T.PRODUCT_DELETE:
      return state.filter((p) => p.id !== action.payload.id);

    case T.PRODUCT_RESTORE:
      return state.some((p) => p.id === action.payload.id) ? state : [action.payload, ...state];

    // El descuento de stock al vender vive en crossSlice (necesita ver sales).
    default:
      return state;
  }
}
