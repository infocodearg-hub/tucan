import { T } from './actions.js';
import { crossSlice } from './crossSlice.js';
import { createInitialState } from './schema.js';

import { configReducer } from './slices/config.js';
import { canchasReducer } from './slices/canchas.js';
import { bookingsReducer } from './slices/bookings.js';
import { clientsReducer } from './slices/clients.js';
import { productsReducer } from './slices/products.js';
import { expensesReducer } from './slices/expenses.js';
import { salesReducer } from './slices/sales.js';
import { turnosFijosReducer } from './slices/turnosFijos.js';
import { uiReducer } from './slices/ui.js';

export function rootReducer(state, action) {
  // Reemplazo total del estado: hidratación desde localStorage, reseteo a
  // demo, o import de un backup. No pasan por los slices individuales.
  if (action.type === T.HYDRATE || action.type === T.IMPORT) return action.payload;
  if (action.type === T.RESET_DEMO) return createInitialState();

  const merged = {
    ...state,
    config: configReducer(state.config, action),
    canchas: canchasReducer(state.canchas, action),
    bookings: bookingsReducer(state.bookings, action),
    clients: clientsReducer(state.clients, action),
    products: productsReducer(state.products, action),
    expenses: expensesReducer(state.expenses, action),
    sales: salesReducer(state.sales, action),
    turnosFijos: turnosFijosReducer(state.turnosFijos, action),
    ui: uiReducer(state.ui, action),
    meta: { ...state.meta, updatedAt: new Date().toISOString() },
  };

  return crossSlice(merged, action, state);
}
