import { T } from './actions.js';
import { crossSlice } from './crossSlice.js';

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
  // Reemplazo total del estado: hidratación desde el servidor (o desde la caché
  // local) e import de un backup. No pasan por los slices individuales.
  //
  // El viejo `store/resetDemo` se eliminó: con una base real, "volver a los
  // datos de demostración" significaría borrar los datos verdaderos del
  // complejo y sembrarle el del ejemplo. No es una función, es un accidente.
  if (action.type === T.HYDRATE || action.type === T.IMPORT) return action.payload;

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
