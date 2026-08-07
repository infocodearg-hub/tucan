/**
 * Backend Supabase — implementa el mismo contrato que `localStorageRepo.js`
 * (ver README.md de esta carpeta).
 *
 * Cómo funciona el ciclo completo:
 *
 *   1. El usuario toca un botón → el reducer aplica el cambio en memoria al
 *      instante (optimista). La pantalla nunca espera a la red.
 *   2. `save(next, prev)` compara los dos estados y manda a la base únicamente
 *      lo que cambió (ver `diff.js` para el razonamiento).
 *   3. Si una escritura falla, se avisa por `onError`. Si falla por conflicto de
 *      horario, se pide una resincronización completa: la base tiene razón.
 *
 * La caché en `localStorage` existe solo para que la app pinte al instante
 * mientras `load()` viaja. Está separada por complejo (`tucan:cache:<tenantId>`)
 * porque una clave global sería una fuga de datos entre cuentas en una
 * computadora compartida.
 */

import { supabase } from '../../lib/supabase.js';
import { PERSIST_WHITELIST, SCHEMA_VERSION } from '../schema.js';
import { addDays, nowISO, todayISO } from '../../lib/date.js';
import { diffColeccion, diffPagos } from './diff.js';
import {
  ORDEN_ESCRITURA,
  bookingMapper,
  canchaMapper,
  clientMapper,
  configMapper,
  expenseMapper,
  paymentMapper,
  productMapper,
  saleMapper,
  turnoFijoMapper,
} from './mappers.js';

/**
 * Ventana de datos que se trae al iniciar. Un complejo con años de historia no
 * puede descargar todo en cada login. Cuando Reportes necesite histórico largo,
 * ESTE es el número a tocar (o el punto donde conviene una consulta agregada
 * del lado del servidor en vez de traerse las filas).
 */
const DIAS_HISTORIA = 180;

/** PostgREST se pone incómodo con listas `in(...)` muy largas: se parte. */
const CHUNK = 400;

const chunk = (arr, size = CHUNK) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const cacheKey = (tenantId) => `tucan:cache:${tenantId}`;

/**
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {(msg: string, err?: unknown) => void} [opts.onError]
 * @param {() => void} [opts.onResyncNeeded] Se llama cuando el estado local
 *   quedó desincronizado y hay que volver a leer del servidor.
 */
export function createSupabaseRepo({ tenantId, onError, onResyncNeeded }) {
  if (!tenantId) throw new Error('createSupabaseRepo necesita un tenantId');

  // Cola serial: dos acciones seguidas tienen que llegar a la base en el mismo
  // orden en que las hizo el usuario. Sin esto, "cargar cantina" podría llegar
  // antes que "crear el turno" al que se le carga.
  let cola = Promise.resolve();
  let pendientes = 0;
  const encolar = (fn) => {
    pendientes += 1;
    cola = cola
      .then(fn)
      .catch((err) => {
        console.error('[tucan:repo] escritura fallida', err);
        onError?.('No se pudo guardar el último cambio. Revisá la conexión.', err);
      })
      .finally(() => {
        pendientes -= 1;
      });
    return cola;
  };

  const avisarError = (error, contexto) => {
    // 23505 = unique_violation. El único índice único que puede chocar en uso
    // normal es el de slot ocupado: alguien más (otro empleado, la web pública
    // o el bot) tomó ese horario primero.
    if (error?.code === '23505') {
      onError?.('Ese horario ya estaba tomado. Se actualizó la grilla.', error);
      onResyncNeeded?.();
      return;
    }
    if (error?.code === '42501' || error?.code === 'PGRST301') {
      onError?.('No tenés permiso para hacer ese cambio.', error);
      onResyncNeeded?.();
      return;
    }
    console.error(`[tucan:repo] ${contexto}`, error);
    onError?.('No se pudo guardar el último cambio. Revisá la conexión.', error);
    throw error;
  };

  // ─── escrituras ────────────────────────────────────────────────────────────

  async function upsert(tabla, filas) {
    if (!filas.length) return;
    const conTenant = filas.map((f) => ({ ...f, tenant_id: tenantId }));
    // Mandar `tenant_id` explícito no es un agujero: la policy `with check`
    // rechaza cualquier valor que no sea el del usuario logueado. Sirve para que
    // el `onConflict` tenga las dos columnas de la clave primaria.
    for (const parte of chunk(conTenant)) {
      const { error } = await supabase.from(tabla).upsert(parte, { onConflict: 'tenant_id,id' });
      if (error) avisarError(error, `upsert en ${tabla}`);
    }
  }

  async function borrar(tabla, ids) {
    if (!ids.length) return;
    for (const parte of chunk(ids)) {
      const { error } = await supabase.from(tabla).delete().in('id', parte);
      if (error) avisarError(error, `delete en ${tabla}`);
    }
  }

  // ─── lectura ───────────────────────────────────────────────────────────────

  async function traerTabla(tabla, aplicarFiltros = (q) => q) {
    const { data, error } = await aplicarFiltros(supabase.from(tabla).select('*'));
    if (error) throw error;
    return data ?? [];
  }

  async function traerPagos(bookingIds) {
    if (!bookingIds.length) return [];
    const out = [];
    for (const parte of chunk(bookingIds)) {
      const { data, error } = await supabase.from('payments').select('*').in('booking_id', parte);
      if (error) throw error;
      out.push(...(data ?? []));
    }
    return out;
  }

  // ─── contrato del repositorio ──────────────────────────────────────────────

  return {
    tenantId,

    /**
     * Caché local del complejo. Puede estar vieja o no existir; `load()` la
     * reemplaza. Nunca es la fuente de verdad.
     */
    loadSync() {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      try {
        const raw = window.localStorage.getItem(cacheKey(tenantId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Una caché de una versión de esquema anterior se descarta en vez de
        // migrarse: en 400ms llega la versión buena del servidor.
        if (!parsed || parsed?.meta?.schemaVersion !== SCHEMA_VERSION) return null;
        return parsed;
      } catch {
        return null;
      }
    },

    /** Estado completo desde la base, con la forma exacta de `createInitialState()`. */
    async load() {
      const desde = addDays(todayISO(), -DIAS_HISTORIA);

      const [canchas, clients, products, turnosFijos, bookings, sales, expenses, configRows] =
        await Promise.all([
          traerTabla('canchas', (q) => q.order('orden')),
          traerTabla('clients'),
          traerTabla('products'),
          traerTabla('turnos_fijos'),
          traerTabla('bookings', (q) => q.gte('fecha', desde)),
          traerTabla('sales', (q) => q.gte('fecha_hora', `${desde}T00:00:00Z`)),
          traerTabla('expenses', (q) => q.gte('fecha', desde)),
          // Un empleado sin permiso de gastos recibe [] por RLS, no un error.
          traerTabla('tenant_config'),
        ]);

      // Los pagos se piden por los turnos que efectivamente se trajeron, no por
      // su propia fecha: una seña cargada hace mucho para un turno de la semana
      // que viene tiene que venir igual, o el turno aparecería impago.
      const pagos = await traerPagos(bookings.map((b) => b.id));

      const pagosPorBooking = new Map();
      for (const row of pagos) {
        const p = paymentMapper.fromRow(row);
        if (!pagosPorBooking.has(p.bookingId)) pagosPorBooking.set(p.bookingId, []);
        // `bookingId` es del modelo relacional; adentro del turno sobra.
        const { bookingId: _omitido, ...pago } = p;
        pagosPorBooking.get(p.bookingId).push(pago);
      }

      return {
        meta: { schemaVersion: SCHEMA_VERSION, updatedAt: nowISO() },
        config: configMapper.fromRow(configRows[0]),
        canchas: canchas.map(canchaMapper.fromRow),
        clients: clients.map(clientMapper.fromRow),
        products: products.map(productMapper.fromRow),
        turnosFijos: turnosFijos.map(turnoFijoMapper.fromRow),
        bookings: bookings.map((r) => ({
          ...bookingMapper.fromRow(r),
          pagos: pagosPorBooking.get(r.id) ?? [],
        })),
        sales: sales.map(saleMapper.fromRow),
        expenses: expenses.map(expenseMapper.fromRow),
      };
    },

    /**
     * Persiste lo que cambió entre dos estados.
     *
     * `prev` tiene que ser el último estado que la base confirmó, no cualquier
     * estado anterior: si se le pasa un estado que el servidor nunca vio, los
     * ids que estén en `prev` y no en `next` se interpretan como borrados.
     * `StoreProvider` se ocupa de esa disciplina (ver `ultimoSincronizadoRef`).
     */
    save(next, prev) {
      guardarCache(tenantId, next);
      if (!prev) return;

      const cambios = ORDEN_ESCRITURA.map(({ slice, mapper }) => ({
        mapper,
        ...diffColeccion(prev[slice], next[slice]),
      }));
      const pagos = diffPagos(prev.bookings, next.bookings);
      const configCambio =
        JSON.stringify(configMapper.toRow(prev.config)) !==
        JSON.stringify(configMapper.toRow(next.config));

      const hayAlgo =
        configCambio ||
        pagos.upsert.length ||
        pagos.deleteIds.length ||
        cambios.some((c) => c.upsert.length || c.deleteIds.length);
      if (!hayAlgo) return;

      encolar(async () => {
        // Borrados primero y al revés del orden de FKs: una cancha no se puede
        // eliminar mientras le queden turnos apuntando.
        for (const { mapper, deleteIds } of [...cambios].reverse()) {
          await borrar(mapper.tabla, deleteIds);
        }
        await borrar('payments', pagos.deleteIds);

        // Altas y cambios en orden de dependencia: primero la cancha, después el
        // turno que la referencia, después la venta que referencia al turno.
        for (const { mapper, upsert: filas } of cambios) {
          await upsert(mapper.tabla, filas.map(mapper.toRow));
        }
        await upsert('payments', pagos.upsert.map(paymentMapper.toRow));

        if (configCambio) {
          const { error } = await supabase
            .from('tenant_config')
            .upsert({ tenant_id: tenantId, ...configMapper.toRow(next.config) },
                    { onConflict: 'tenant_id' });
          if (error) avisarError(error, 'upsert en tenant_config');
        }
      });
    },

    /** Nada que forzar: las escrituras salen enseguida. Solo se refresca la caché. */
    flush(next) {
      guardarCache(tenantId, next);
    },

    /** Espera a que la cola se vacíe. Para tests y para el cierre de sesión. */
    async idle() {
      await cola;
    },

    /**
     * ¿Quedan escrituras propias en vuelo?
     *
     * Sirve para no recargar desde el servidor en medio de una escritura: la
     * respuesta todavía no incluiría ese cambio y el turno recién cargado
     * desaparecería de pantalla por un segundo antes de volver.
     */
    estaOcupado() {
      return pendientes > 0;
    },

    clear() {
      try {
        window.localStorage.removeItem(cacheKey(tenantId));
      } catch {
        /* localStorage bloqueado */
      }
    },

    /**
     * Avisa cuando cualquier fila del complejo cambia en la base: otro empleado,
     * la página pública de reservas o el bot de n8n. El callback recibe el
     * control para decidir cuándo recargar (`StoreProvider` lo hace con debounce).
     *
     * Realtime respeta RLS: solo llegan eventos de filas que este usuario podría
     * leer igual con un select.
     */
    suscribirCambios(alCambiar) {
      const tablas = [
        'canchas', 'clients', 'products', 'turnos_fijos',
        'bookings', 'payments', 'sales', 'expenses', 'tenant_config',
      ];
      const canal = supabase.channel(`tenant:${tenantId}`);
      for (const tabla of tablas) {
        canal.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tabla, filter: `tenant_id=eq.${tenantId}` },
          alCambiar
        );
      }
      canal.subscribe();
      return () => supabase.removeChannel(canal);
    },
  };
}

/** Solo las slices persistibles: `ui` no se guarda nunca (ver PERSIST_WHITELIST). */
function guardarCache(tenantId, state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const slice = {};
    for (const k of PERSIST_WHITELIST) slice[k] = state[k];
    slice.meta = { ...slice.meta, schemaVersion: SCHEMA_VERSION };
    window.localStorage.setItem(cacheKey(tenantId), JSON.stringify(slice));
  } catch (err) {
    // Cuota llena o modo privado agresivo: la app funciona igual contra la base,
    // solo pierde el arranque instantáneo.
    console.warn('[tucan:repo] no se pudo guardar la caché local', err);
  }
}
