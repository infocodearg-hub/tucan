import { T } from '../actions.js';

/** Merge profundo de un nivel: permite `updateConfig({ pagos: { alias: 'x' } })`. */
function deepPatch(state, patch) {
  const next = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    next[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? { ...state[key], ...value }
        : value;
  }
  return next;
}

export function configReducer(state, action) {
  switch (action.type) {
    case T.CONFIG_UPDATE:
      return deepPatch(state, action.payload);
    default:
      return state;
  }
}
