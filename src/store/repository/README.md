# Repositorio — cómo se persisten los datos

`StoreProvider` no sabe dónde viven los datos. Solo conoce esta interfaz, y hoy
la implementa `supabaseRepo.js`. (Hasta la migración a Supabase había un
`localStorageRepo.js` con el mismo contrato; se borró cuando dejó de usarse.)

```js
createSupabaseRepo({ tenantId, onError, onResyncNeeded }) => {
  // Caché local del complejo (`tucan:cache:<tenantId>`). Puede estar vieja o no
  // existir: sirve para que la app pinte al instante mientras `load()` viaja.
  // NUNCA es la fuente de verdad.
  loadSync(): State | null,

  // Estado completo desde la base, con la forma exacta de `createEmptyState()`.
  load(): Promise<State>,

  // Manda a la base lo que cambió entre los dos estados.
  save(nextState, prevState): void,

  // Refresca la caché local. No fuerza nada remoto: las escrituras ya salieron.
  flush(nextState): void,

  // Espera a que se vacíe la cola de escrituras. Para tests.
  idle(): Promise<void>,

  // ¿Quedan escrituras propias en vuelo?
  estaOcupado(): boolean,

  // Borra la caché local de este complejo.
  clear(): void,

  // Avisa cuando cambia cualquier fila del complejo (otro empleado, la página
  // pública o el bot de n8n). Devuelve la función para desuscribirse.
  suscribirCambios(callback): () => void,
}
```

## Las dos reglas que sostienen todo esto

**1. `save()` deduce los borrados comparando `prev` contra `next`.** Por eso
`prev` tiene que ser el último estado que la base confirmó, no el render
anterior. Si se le pasa un estado que el servidor nunca vio —por ejemplo la
caché local justo antes de hidratar— todo lo que el servidor tiene y ese estado
no tiene se interpreta como borrado. `StoreProvider` mantiene esa disciplina con
`ultimoSincronizadoRef`; no la relajes.

**2. Se compara el estado, no se mapea acción por acción.** Parece más directo
traducir `BOOKING_CREATE` a un insert, pero no alcanza: `SALE_CREATE` además baja
el stock de `products`, `CLIENT_DELETE` limpia la FK en `bookings` y
`turnosFijos`, y el `id` del booking lo genera el reducer, no el action creator.
Nada de eso está en el payload de la acción. El diff lo captura todo sin
duplicar una sola regla de negocio (ver `diff.js`).

## Para agregar una entidad nueva

1. Tabla en una migración nueva, con `tenant_id`, PK `(tenant_id, id)`, RLS y las
   policies del resto.
2. Mapper `toRow`/`fromRow` en `mappers.js`, y sumarlo a `ORDEN_ESCRITURA`
   **respetando las claves foráneas** (una venta no puede insertarse antes que el
   turno al que apunta).
3. Sumar la slice a `PERSIST_WHITELIST` en `schema.js` y traerla en `load()`.
