import React, { createContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { rootReducer } from './reducer.js';
import { createInitialState } from './schema.js';
import { localStorageRepo as repo } from './repository/localStorageRepo.js';

// Dos contexts separados: los componentes que solo despachan (la inmensa
// mayoría de los modales y botones) no se re-renderizan cuando cambian los
// datos, porque nunca se suscriben a StateContext.
export const StoreStateContext = createContext(null);
export const StoreDispatchContext = createContext(null);

function init() {
  const fresh = createInitialState();
  const persisted = repo.loadSync();
  if (!persisted) return fresh;
  // `ui` nunca se persiste (ver PERSIST_WHITELIST), así que el blob guardado
  // no la trae — sin este merge, `state.ui` queda undefined después de un
  // F5 y la app explota al desestructurar `state.ui.activeTab`.
  return { ...fresh, ...persisted, ui: fresh.ui };
}

export default function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, init);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Guardado con debounce en cada cambio de datos persistibles.
  useEffect(() => {
    repo.save(state);
  }, [state]);

  // Flush forzado si el usuario cierra/oculta la pestaña con un debounce
  // todavía pendiente — si no, el último cambio se podía perder.
  useEffect(() => {
    const flush = () => repo.flush(stateRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, []);

  const dispatchValue = useMemo(() => dispatch, []);

  return (
    <StoreDispatchContext.Provider value={dispatchValue}>
      <StoreStateContext.Provider value={state}>{children}</StoreStateContext.Provider>
    </StoreDispatchContext.Provider>
  );
}
