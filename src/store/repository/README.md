# Contrato del repositorio

Cualquier backend nuevo (por ejemplo `supabaseRepo.js`) implementa esta misma
forma. `StoreProvider` solo conoce esta interfaz, nunca `localStorage` directamente.

```js
{
  // Sincrónico. Devuelve el estado ya migrado, o null si no hay nada guardado
  // / estaba corrupto. Un backend async (ej. Supabase) puede devolver
  // siempre null acá y resolver la carga real en `load()`.
  loadSync(): State | null,

  // Async, opcional. Si existe, StoreProvider muestra un splash mientras
  // resuelve y despacha `store/hydrate` con el resultado.
  load?(): Promise<State>,

  // Se llama después de cada acción exitosa, con el estado siguiente y el
  // anterior. En localStorage es un debounce + write. En un backend real
  // sería la llamada de red (y acá es donde se manejaría el optimistic
  // rollback si la llamada falla).
  save(nextState: State, prevState: State): void,

  // Fuerza cualquier escritura pendiente. Se llama en pagehide/visibilitychange
  // para no perder el último cambio si el usuario cierra la pestaña rápido.
  flush(nextState: State): void,

  clear(): void,
}
```

## Para cambiar de backend

1. Escribir `repository/supabaseRepo.js` con esta forma.
2. En `store/index.js`, cambiar qué repo se exporta como `repo`.
3. Nada en `hooks.js`, `selectors.js` ni en ningún componente cambia.

El punto de todo esto es que las acciones (`actions.js`) son el contrato real:
el reducer aplica optimista en local, y el repositorio decide qué hacer con
esa acción hacia afuera.
