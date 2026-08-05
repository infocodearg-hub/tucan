/**
 * Superficie pública del store. Los componentes importan SOLO desde acá
 * (o directo desde `hooks.js`) — nunca de `reducer.js`, `slices/*` ni del
 * repositorio.
 */

export { default as StoreProvider } from './StoreProvider.jsx';
export * from './hooks.js';
export * as selectors from './selectors.js';
