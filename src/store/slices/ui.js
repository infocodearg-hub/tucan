import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';

const MAX_TOASTS = 3;

export function uiReducer(state, action) {
  switch (action.type) {
    case T.UI_SET_TAB:
      return { ...state, activeTab: action.payload };

    case T.UI_SET_SELECTED_DATE:
      return { ...state, selectedDate: action.payload };

    case T.UI_TOAST: {
      const toast = { id: genId('tst'), type: 'success', duration: 3200, ...action.payload };
      // Cola con tope: las más viejas se descartan antes que aparezcan 4 apiladas.
      return { ...state, toasts: [...state.toasts, toast].slice(-MAX_TOASTS) };
    }

    case T.UI_DISMISS_TOAST:
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload.id) };

    case T.UI_SET_SESSION:
      return { ...state, session: action.payload };

    default:
      return state;
  }
}
