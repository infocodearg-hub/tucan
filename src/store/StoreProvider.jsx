import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { rootReducer } from './reducer.js';
import { createEmptyState } from './schema.js';
import { hydrate as hydrateAction, pushToast } from './actions.js';
import { createSupabaseRepo } from './repository/supabaseRepo.js';

// Dos contexts separados: los componentes que solo despachan (la inmensa
// mayoría de los modales y botones) no se re-renderizan cuando cambian los
// datos, porque nunca se suscriben a StateContext.
export const StoreStateContext = createContext(null);
export const StoreDispatchContext = createContext(null);

const REALTIME_DEBOUNCE_MS = 400;

/**
 * StoreProvider — estado en memoria + persistencia en Supabase.
 *
 * El reducer sigue siendo el "apply optimista": la pantalla cambia al instante y
 * la escritura viaja después. Lo único que se agrega acá es la disciplina de
 * sincronización, y tiene una regla que NO se puede relajar:
 *
 *   `repo.save(next, prev)` recibe como `prev` el último estado que la base
 *   confirmó — no el render anterior.
 *
 * El motivo: el repositorio deduce los borrados de lo que estaba en `prev` y ya
 * no está en `next`. Si se le pasara como `prev` un estado que el servidor nunca
 * vio (por ejemplo la caché local vieja, justo antes de hidratar), interpretaría
 * como "borrados" todos los registros que el servidor sí tiene. De ahí
 * `ultimoSincronizadoRef` y el salteo explícito del guardado post-hidratación.
 *
 * @param {string} props.tenantId Complejo dueño de estos datos.
 */
export default function StoreProvider({ tenantId, children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, createEmptyState);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Último estado que la base ya tiene. `null` hasta la primera carga: mientras
  // tanto no se escribe nada (no se sabría contra qué comparar).
  const ultimoSincronizadoRef = useRef(null);

  // Hidratación despachada que todavía no llegó al estado.
  //
  // Existe por un problema de orden que ya borró datos una vez: `hidratar()`
  // corre DENTRO del efecto de carga, y el efecto de guardado corre después en
  // ese mismo commit — todavía con el `state` viejo (el vacío del arranque).
  // Sin esta bandera, el guardado comparaba "caché con datos" contra "estado
  // vacío" y concluía que el usuario había borrado todo: mandaba los DELETE y
  // vaciaba la cuenta en la segunda carga de la app.
  const hidratacionPendienteRef = useRef(null);

  const repo = useMemo(() => {
    if (!tenantId) return null;
    return createSupabaseRepo({
      tenantId,
      onError: (msg) => dispatch(pushToast({ message: msg, type: 'error' })),
      onResyncNeeded: () => recargarRef.current?.(),
    });
  }, [tenantId]);

  // Ref indirecta para poder llamar a `recargar` desde el repo, que se crea
  // antes que la función.
  const recargarRef = useRef(null);

  const hidratar = useCallback((nuevoEstado) => {
    // Hidratar es traer lo que la base ya tiene, no un cambio que haya que
    // devolverle. Se anota como pendiente y el efecto de guardado no escribe
    // nada hasta que ese objeto sea efectivamente el estado.
    const conUI = { ...nuevoEstado, ui: stateRef.current.ui };
    hidratacionPendienteRef.current = conUI;
    dispatch(hydrateAction(conUI));
  }, []);

  const recargar = useCallback(async () => {
    if (!repo) return;
    try {
      hidratar(await repo.load());
      setErrorCarga(null);
    } catch (err) {
      console.error('[tucan:store] no se pudieron cargar los datos', err);
      setErrorCarga('No se pudieron cargar los datos del complejo.');
    }
  }, [repo, hidratar]);

  recargarRef.current = recargar;

  // ─── carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!repo) return;
    let vivo = true;

    // Caché local del mismo complejo: la app pinta al instante en vez de mostrar
    // un splash de dos segundos en cada F5. Es solo un adelanto — lo de abajo la
    // reemplaza con lo que diga el servidor.
    const cache = repo.loadSync();
    if (cache) hidratar(cache);

    (async () => {
      try {
        const remoto = await repo.load();
        if (!vivo) return;
        hidratar(remoto);
        setErrorCarga(null);
      } catch (err) {
        if (!vivo) return;
        console.error('[tucan:store] no se pudieron cargar los datos', err);
        // Con caché la app queda usable en modo lectura; sin caché, no hay nada
        // que mostrar y hay que decirlo en pantalla.
        if (!cache) setErrorCarga('No se pudieron cargar los datos del complejo.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();

    return () => { vivo = false; };
  }, [repo, hidratar]);

  // ─── guardado ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!repo) return;
    // Hay una hidratación en camino: hasta que llegue, el `state` que se ve es
    // anterior a la carga y no representa nada que el usuario haya hecho.
    // Escribirlo sería mandarle a la base un estado del pasado.
    const pendiente = hidratacionPendienteRef.current;
    if (pendiente) {
      if (state === pendiente) {
        ultimoSincronizadoRef.current = state;
        hidratacionPendienteRef.current = null;
      }
      return;
    }

    const sincronizado = ultimoSincronizadoRef.current;
    // Sin carga previa no hay contra qué comparar: no se escribe.
    if (!sincronizado || sincronizado === state) return;
    repo.save(state, sincronizado);
    ultimoSincronizadoRef.current = state;
  }, [repo, state]);

  // Flush de la caché si el usuario cierra u oculta la pestaña. Las escrituras
  // remotas ya salieron; esto solo deja la caché al día para el próximo arranque.
  //
  // La limpieza NO vuelve a escribir la caché, y eso es a propósito: este efecto
  // se desmonta justo cuando se cierra sesión, después de que `signOut()` purgó
  // `tucan:cache:<tenantId>`. Un `flush()` acá la reescribiría y los datos del
  // complejo quedarían en el navegador para el siguiente que lo use — en la
  // computadora del mostrador eso es una fuga real. No hay nada que rescatar:
  // las escrituras a la base salen apenas cambia el estado, la caché es solo un
  // acelerador de arranque.
  useEffect(() => {
    if (!repo) return;
    const flush = () => repo.flush(stateRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [repo]);

  // ─── realtime ──────────────────────────────────────────────────────────────
  // Un turno cargado por el bot de n8n, por la página pública o por el otro
  // empleado aparece sin apretar F5. Con debounce porque una sola acción del
  // otro lado puede disparar varios eventos (turno + pago + venta).
  useEffect(() => {
    if (!repo) return;
    let timer = null;
    const programarRecarga = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Recargar con escrituras propias en vuelo traería una foto del servidor
        // que todavía no las incluye: el turno recién cargado parpadearía. Se
        // espera a que la cola se vacíe.
        if (repo.estaOcupado()) return programarRecarga();
        recargarRef.current?.();
      }, REALTIME_DEBOUNCE_MS);
    };
    const desuscribir = repo.suscribirCambios(programarRecarga);
    return () => {
      clearTimeout(timer);
      desuscribir();
    };
  }, [repo]);

  const dispatchValue = useMemo(() => dispatch, []);

  if (cargando) return <PantallaCarga />;
  if (errorCarga) return <PantallaError mensaje={errorCarga} onReintentar={recargar} />;

  return (
    <StoreDispatchContext.Provider value={dispatchValue}>
      <StoreStateContext.Provider value={state}>{children}</StoreStateContext.Provider>
    </StoreDispatchContext.Provider>
  );
}

function PantallaCarga() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-pitch)', color: 'var(--text-muted)', fontSize: '0.85rem',
    }}>
      Cargando tu complejo…
    </div>
  );
}

function PantallaError({ mensaje, onReintentar }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', gap: 16,
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
      background: 'var(--bg-pitch)',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 320 }}>{mensaje}</p>
      <button type="button" className="btn-primary" onClick={onReintentar} style={{ padding: '12px 20px' }}>
        Reintentar
      </button>
    </div>
  );
}

/**
 * Store sin backend, para tests y para la página pública.
 *
 * Monta el mismo par de contexts con un estado fijo y sin ninguna escritura
 * remota. No sirve como fallback de la app real: si no hay complejo resuelto,
 * lo correcto es no mostrar datos, no mostrar datos inventados.
 */
export function StoreProviderEstatico({ estadoInicial, children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, () => estadoInicial ?? createEmptyState());
  const dispatchValue = useMemo(() => dispatch, []);
  return (
    <StoreDispatchContext.Provider value={dispatchValue}>
      <StoreStateContext.Provider value={state}>{children}</StoreStateContext.Provider>
    </StoreDispatchContext.Provider>
  );
}
