/**
 * Catálogo de acciones — el contrato de API del store.
 *
 * Todo cambio visible a un componente pasa por una acción de acá. Cuando
 * entre un backend real, el reducer sigue siendo el "apply" optimista local
 * y el repositorio (`repository/`) es quien hace la llamada de red — cero
 * cambios en componentes.
 */

export const T = {
  HYDRATE: 'store/hydrate',
  RESET_DEMO: 'store/resetDemo',
  IMPORT: 'store/import',

  CONFIG_UPDATE: 'config/update',

  CANCHA_CREATE: 'canchas/create',
  CANCHA_UPDATE: 'canchas/update',
  CANCHA_DELETE: 'canchas/delete',

  BOOKING_CREATE: 'bookings/create',
  BOOKING_UPDATE: 'bookings/update',
  BOOKING_CANCEL: 'bookings/cancel',
  BOOKING_DELETE: 'bookings/delete',
  BOOKING_ADD_PAYMENT: 'bookings/addPayment',
  BOOKING_REMOVE_PAYMENT: 'bookings/removePayment',
  BOOKING_MATERIALIZE_FIJO: 'bookings/materializeFijo',

  CLIENT_CREATE: 'clients/create',
  CLIENT_UPDATE: 'clients/update',
  CLIENT_DELETE: 'clients/delete',
  CLIENT_RESTORE: 'clients/restore',

  PRODUCT_CREATE: 'products/create',
  PRODUCT_UPDATE: 'products/update',
  PRODUCT_DELETE: 'products/delete',
  PRODUCT_RESTORE: 'products/restore',

  EXPENSE_CREATE: 'expenses/create',
  EXPENSE_UPDATE: 'expenses/update',
  EXPENSE_DELETE: 'expenses/delete',
  EXPENSE_RESTORE: 'expenses/restore',

  SALE_CREATE: 'sales/create',
  SALE_VOID: 'sales/void',

  TURNO_FIJO_CREATE: 'turnosFijos/create',
  TURNO_FIJO_UPDATE: 'turnosFijos/update',
  TURNO_FIJO_DELETE: 'turnosFijos/delete',
  TURNO_FIJO_RESTORE: 'turnosFijos/restore',
  TURNO_FIJO_ADD_EXCEPTION: 'turnosFijos/addException',
  TURNO_FIJO_SET_MONTH_STATUS: 'turnosFijos/setMonthStatus',

  UI_SET_TAB: 'ui/setTab',
  UI_SET_SELECTED_DATE: 'ui/setSelectedDate',
  UI_TOAST: 'ui/toast',
  UI_DISMISS_TOAST: 'ui/dismissToast',
  UI_SET_SESSION: 'ui/setSession',
};

export const hydrate = (state) => ({ type: T.HYDRATE, payload: state });
export const resetDemo = () => ({ type: T.RESET_DEMO });
export const importData = (state) => ({ type: T.IMPORT, payload: state });

export const updateConfig = (patch) => ({ type: T.CONFIG_UPDATE, payload: patch });

export const createCancha = (cancha) => ({ type: T.CANCHA_CREATE, payload: cancha });
export const updateCancha = (id, patch) => ({ type: T.CANCHA_UPDATE, payload: { id, patch } });
export const deleteCancha = (id) => ({ type: T.CANCHA_DELETE, payload: { id } });

export const createBooking = (booking) => ({ type: T.BOOKING_CREATE, payload: booking });
export const updateBooking = (id, patch) => ({ type: T.BOOKING_UPDATE, payload: { id, patch } });
export const cancelBooking = (id) => ({ type: T.BOOKING_CANCEL, payload: { id } });
export const deleteBooking = (id) => ({ type: T.BOOKING_DELETE, payload: { id } });
export const addPayment = (bookingId, pago) => ({
  type: T.BOOKING_ADD_PAYMENT,
  payload: { bookingId, pago },
});
export const removePayment = (bookingId, pagoId) => ({
  type: T.BOOKING_REMOVE_PAYMENT,
  payload: { bookingId, pagoId },
});
export const materializeFijo = (booking) => ({
  type: T.BOOKING_MATERIALIZE_FIJO,
  payload: booking,
});

export const createClient = (client) => ({ type: T.CLIENT_CREATE, payload: client });
export const updateClient = (id, patch) => ({ type: T.CLIENT_UPDATE, payload: { id, patch } });
export const deleteClient = (id) => ({ type: T.CLIENT_DELETE, payload: { id } });
export const restoreClient = (client) => ({ type: T.CLIENT_RESTORE, payload: client });

export const createProduct = (product) => ({ type: T.PRODUCT_CREATE, payload: product });
export const updateProduct = (id, patch) => ({ type: T.PRODUCT_UPDATE, payload: { id, patch } });
export const deleteProduct = (id) => ({ type: T.PRODUCT_DELETE, payload: { id } });
export const restoreProduct = (product) => ({ type: T.PRODUCT_RESTORE, payload: product });

export const createExpense = (expense) => ({ type: T.EXPENSE_CREATE, payload: expense });
export const updateExpense = (id, patch) => ({ type: T.EXPENSE_UPDATE, payload: { id, patch } });
export const deleteExpense = (id) => ({ type: T.EXPENSE_DELETE, payload: { id } });
export const restoreExpense = (expense) => ({ type: T.EXPENSE_RESTORE, payload: expense });

export const createSale = (sale) => ({ type: T.SALE_CREATE, payload: sale });
export const voidSale = (id) => ({ type: T.SALE_VOID, payload: { id } });

export const createTurnoFijo = (tf) => ({ type: T.TURNO_FIJO_CREATE, payload: tf });
export const updateTurnoFijo = (id, patch) => ({
  type: T.TURNO_FIJO_UPDATE,
  payload: { id, patch },
});
export const deleteTurnoFijo = (id) => ({ type: T.TURNO_FIJO_DELETE, payload: { id } });
export const restoreTurnoFijo = (tf) => ({ type: T.TURNO_FIJO_RESTORE, payload: tf });
export const addFijoException = (id, fecha) => ({
  type: T.TURNO_FIJO_ADD_EXCEPTION,
  payload: { id, fecha },
});
export const setFijoMonthStatus = (id, mesKey, estado) => ({
  type: T.TURNO_FIJO_SET_MONTH_STATUS,
  payload: { id, mesKey, estado },
});

export const setActiveTab = (tab) => ({ type: T.UI_SET_TAB, payload: tab });
export const setSelectedDate = (iso) => ({ type: T.UI_SET_SELECTED_DATE, payload: iso });
export const pushToast = (toast) => ({ type: T.UI_TOAST, payload: toast });
export const dismissToast = (id) => ({ type: T.UI_DISMISS_TOAST, payload: { id } });
export const setSession = (session) => ({ type: T.UI_SET_SESSION, payload: session });
