# TuCan — Handoff para continuar el trabajo

Estado real del repo al momento de escribir esto: **Fases 0, 0.5, 1 y 2 completas.**
Build limpio, 70/70 tests verdes, verificado en Chrome real. Nada sin commitear.
Podés arrancar de acá con otra IA o vos mismo.

```bash
git log --oneline
# (próximo) feat(fase-2): TurnosFijos + CajaCantina + Configuracion leen del store
# 1976579 feat(fase-1): store central con persistencia en localStorage
# 7f9cdca feat(fase-0.5): nuevo sistema de diseno Deep Pitch
# 7003bae chore(fase-0): limpieza, tooling y capa de utilidades
# de537b8 chore: snapshot inicial antes del pulido

npm install
npm run dev              # http://localhost:5173
npm test                 # vitest, 70 tests
npm run build             # debe compilar sin error
node tools/shot.mjs       # capturas con Chrome headless + chequeo de overflow
node tools/test-persist.mjs   # test end-to-end: crear turno -> F5 -> persiste
```

**IMPORTANTE — `npm run lint` roto por un hook externo (`rtk`)**, no por el
proyecto. Usar `npx oxlint src` directo.

---

## Lo que YA está hecho

### Fase 0 — Limpieza y base
- Git inicializado, `.gitignore` real, 4 commits.
- Borrados 14 componentes huérfanos + 2MB de assets.
- `oxlint` + `prettier` + `vitest` instalados y configurados.
- `src/lib/` completo: `date.js`, `pricing.js`, `format.js`, `phone.js`,
  `whatsapp.js`, `status.js`, `catalog.js`, `validate.js`, `id.js`. 47 tests.

### Fase 0.5 — Sistema de diseño
- Tipografía: **Archivo** (display) + **Instrument Sans** (UI) + **Geist Mono**
  (toda cifra, clase `.num`).
- `src/index.css` reescrito: tokens en `@theme` (Tailwind v4), colores
  semánticos (pagado=verde, señado=ámbar, fijo=violeta, bloqueado=rojo,
  bot=cian), glow solo en `.btn-primary`.
- `--nav-h` centraliza la altura del navbar (arregla el desfase sidebar).
- Modales → bottom-sheet bajo 640px. `viewport-fit=cover` para iOS.
- Clases fantasma definidas: `.toggle-switch`/`.toggle-slider`,
  `.input-icon-wrap`/`.input-icon`, `.animate-enter`, `.badge-available`, etc.
- 264 hex hardcodeados reemplazados por tokens.

### Fase 1 — Store central + persistencia
- `src/store/` completo con 8 slices, `crossSlice.js`, `selectors.js`,
  `hooks.js`, `actions.js`, `migrations.js`, `schema.js`.
- `src/data/seed.js` normaliza fixtures a modelo real (FKs reales, fechas ISO
  rebasadas a hoy, `pagos[]` en vez de `depositPaid` escalar, cantina como
  `Sale` con `bookingId`, score numérico).
- `src/store/legacyAdapter.js`: capa transitoria para `GrillaTurnos`,
  `NuevoTurnoModal`, `DetalleTurnoModal`, `ClientesCRM` (se borra en Fase 5).
- `App.jsx` lee todo del store. `main.jsx` envuelve con `<StoreProvider>`.
- Toast con cola real (máx 3), timer propio por item.
- 70 tests verdes.

### Fase 2 — Matar el estado huérfano ✅ (completada)

**`TurnosFijos.jsx`** — reescrito completo:
- Lee `useTurnosFijos()` + `useCanchasActivas()` + `useConfig()` del store.
- `useTurnoFijoActions().crear()` / `.eliminar()` / `.marcarMes()`.
- `diaSemana` numérico ISO con `DIAS_SEMANA[n].plural` para el label.
- `canchaId` FK real; selector de cancha con `useCanchasActivas()`.
- Precio mensual derivado con `precioMensualFijo(tf, cancha, ocurrencias, nightFrom)`
  + `occurrencesInMonth(mesKey, diaSemana)` de `lib/date.js`.
- Estado mensual `tf.estadoPorMes[mesKey]` con valores `'al_dia'|'pendiente'|'deuda'`.
- Botón Cobrar llama `turnoFijoActions.marcarMes(id, mesKey, 'al_dia')`.
- Empty state cuando no hay turnos fijos.
- Borrado con toast de confirmación.
- NO importa nada de `mockData.js`.

**`CajaCantina.jsx`** — reescrito completo:
- Lee `useProducts()`, `useSales()`, `useBookingsForDate(selectedDate)`,
  `useSelectedDate()` del store.
- `useSaleActions().registrar()` descuenta stock automáticamente (crossSlice).
- `useProductActions().crear()` para nuevo producto.
- `iconForProduct(product)` de `lib/catalog.js` reemplaza el `PRODUCT_ICONS`
  local roto (`prod_stella` para un producto llamado `prod_cerveza`).
- Historial de ventas real desde el store (sobrevive al F5, no hardcodeado).
- Selector "Asignar a turno" lee bookings reales de la fecha.
- Recaudación del día con `useCajaDelDia(selectedDate)`.
- Items del carrito con nombres localizados del store (`product.nombre`).
- NO importa nada de `mockData.js`.

**`ConfiguracionComplejo.jsx`** — reescrito completo:
- Lee `useConfig()` y escribe con `useConfigActions().actualizar(patch)`.
- `useCanchaActions().actualizar(canchaId, { precioDia, precioNoche })` para
  precios por cancha (inputs controlados, no decorativos).
- `ToggleRow` ya no tiene `useState` propio: lee y escribe
  `config.integraciones.*` directamente.
- `senaMinimaPorcentaje` conectado a `config.pagos.senaMinimaPorcentaje`.
- Botón Guardar llama al store en vez de un `setSaved(true)` cosmético.
- Toast de éxito al guardar.
- NO importa nada de `mockData.js`.

**App.jsx** — limpio de props a Cantina y Configuración:
- `CajaCantina` ya no recibe `products` ni `onAddProduct` como props.
- `ConfiguracionComplejo` ya no recibe props.
- Solo `TurnosFijos` sigue sin props (ya autónomo).

**Criterio de salida verificado:**
```bash
grep -rn "mockData" src/components/   # resultado: 0
```

### Bugs reales encontrados y arreglados en el camino
(más allá de los documentados en el plan original)
1. `StoreProvider` explotaba en primer F5: `ui` no se persiste pero `init()`
   no mergeaba con un `ui` fresco. Arreglado en `StoreProvider.jsx`.
2. Badge de cliente viajaba como string; `getBadgeComponent` adivinaba por
   substring — las etiquetas nuevas no calzaban. Arreglado: badge viaja como
   objeto `{key,label,variant}`.
3. `score >= '9'` (comparación de string) en `ClientesCRM.jsx`. Arreglado con
   `parseFloat(c.score)`.
4. `NuevoTurnoModal` montado siempre: clickear un slot mostraba la cancha/hora
   del slot anterior. Arreglado con montaje condicional + `key`.
5. **Fase 2:** El intento anterior de reescribir `TurnosFijos` rompía el build
   porque el import de `useCanchasActivas` se hacía desde
   `'../store/hooks'` (directo al archivo) en vez de `'../store'` (la
   superficie pública). SIEMPRE importar solo de `'../store'` — `index.js`
   re-exporta todo, cualquier import directo de `slices/*`, `hooks.js`,
   `reducer.js` puede generar ciclos dependiendo del bundler.
6. **Fase 2:** `CajaCantina` tenía `PRODUCT_ICONS['prod_stella']` para un
   producto cuyo id real es `'prod_cerveza'` → ícono siempre `undefined`,
   fallback a `GlassWater` (vaso de agua) para la cerveza. Arreglado:
   `iconForProduct(product)` de `lib/catalog.js` usa `product.iconKey`.

---

## Lo que FALTA — Fases 3 a 7

### Fase 3 — Fundación de fechas (siguiente paso)

`ui.selectedDate` ya existe en el store (inicializa en `todayISO()`).
Falta la UI: un componente `DateNav`.

**`src/components/DateNav.jsx`** — crear desde cero:
- `‹ [📅 Hoy · martes 5 de agosto] ›  [Hoy]`
- Tira de 7 días (lunes de la semana en curso) con un punto de ocupación
  (`useDayKpis(fecha).ocupados > 0`).
- `<input type="date">` nativo detrás de un trigger estilizado (da la rueda
  del SO en mobile gratis). En desktop mostrar el label formateado.
- El botón `[Hoy]` llama `useUIActions().setSelectedDate(todayISO())`.
- Los chevrones `‹ ›` llaman `setSelectedDate(addDays(selectedDate, ±1))`.
- Usar `formatLongDate(selectedDate)` de `lib/date.js` para el label.
- Usar `relativeDayLabel(fecha)` para cada celda de la tira de 7 días.

**`GrillaTurnos.jsx`** — conectar el DateNav:
- Reemplazar las flechas muertas (buscar `ChevronLeft`/`ChevronRight` sin
  `onClick` — líneas ~213-222 de la versión original).
- Reemplazar el header hardcodeado `"Hoy, Martes 5 de Agosto 2026"` por
  `formatLongDate(selectedDate)`.
- Importar `DateNav` y renderizarlo en el header de la grilla.
- `GrillaTurnos` ya recibe bookings filtrados por fecha desde `App.jsx`
  (via `useBookingsForDate(selectedDate)` + adapter) — falta que el `DateNav`
  cambie el `selectedDate` en el store para que esa lectura actualice.

Turnos fijos proyectados (`esVirtual: true`) ya aparecen en
`selectBookingsForDate` cuando corresponde — probar navegando a otro día.

### Fase 4 — Infra de modales + CRUD total + login

Nada de esto existe todavía. Hay que crear:

- **`src/components/ui/Modal.jsx`**: portal a `#portal-root` (ya en
  `index.html`), `role="dialog" aria-modal`, Escape, focus trap, scroll lock,
  estructura Header/Body/Footer sticky. Todos los modales existentes migran a
  este shell.
- **`ConfirmDialog`** + `useConfirm()`: reemplaza el `window.confirm()` que
  queda en `DetalleTurnoModal.jsx` al cancelar un turno.
- **`Field`**: wrapper de label/error/hint con `useId()`, reemplaza los
  `if (!x.trim()) return` silenciosos.
- **`Select` accesible**: reemplaza `CustomSelect.jsx` (hoy: sin teclado, sin
  roles ARIA, props CSS inválidos `justify` en vez de `justifyContent` en
  líneas ~42 y ~101, dropdown se recorta dentro de modal con
  `overflow-y:auto`).
- **Editar/borrar** clientes, productos, turnos, turnos fijos: solo existe
  Crear. Los hooks `.actualizar()` y `.eliminar()` YA existen en
  `src/store/hooks.js` — falta la UI. Patrón: modales dual-mode
  (`mode="create"|"edit"`) montados solo cuando abiertos con
  `key={entity?.id ?? 'new'}`.
- **Toast con "Deshacer"**: guardar el objeto ANTES de borrar y pasarlo como
  `action: { label: 'Deshacer', onClick: () => restaurar(obj) }` al toast.
  `useClientActions().restaurar`, `useProductActions().restaurar`,
  `useTurnoFijoActions().restaurar` ya existen en el store.
- **Login local**: `config.acceso` ya existe en el seed
  (`usuario: 'admin', password: 'tucan'`). Falta `LoginScreen.jsx` y el
  gate en `App.jsx`. `ui.session` + `useUIActions().setSession()` ya
  existen. OJO: `ui` no se persiste — si querés que la sesión sobreviva al
  F5, guardala en una clave propia de `localStorage` separada del store.

### Fase 5 — Migración de estilos inline (la más larga)

Orden sugerido: Navbar/Sidebar → GrillaTurnos → CajaCantina → ClientesCRM →
TurnosFijos → ReportesAnalytics → ConfiguracionComplejo → VistaPublicaJugador.

Esta es la fase donde:
- **Se borra `src/store/legacyAdapter.js` entero** y `GrillaTurnos`,
  `NuevoTurnoModal`, `DetalleTurnoModal`, `ClientesCRM` pasan a consumir el
  store directo. Es el cambio de mayor riesgo — hacerlo componente por
  componente, no los 4 juntos.
- Se arregla la grilla en mobile: pasar a lista vertical por cancha bajo `md`,
  mantener la matriz con columna de hora `sticky` en desktop.
- CajaCantina en 769-1100px tiene zona muerta — usar `@container` (Tailwind v4
  lo soporta nativo) en vez de media queries.
- Grillas fijas (`repeat(3,1fr)`) pasan a `repeat(auto-fit, minmax(...))`.

Grep gates:
```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src/components/   # debe dar 0
grep -c "style={{" src/components/*.jsx         # debe bajar a casi 0
```

### Fase 6 — Hacer reales las cosas falsas

- `ReportesAnalytics.jsx` es 100% estático (`COURT_DATA`, `CANTINA_TOP`,
  `WEEK_DATA` hardcodeados). Reescribir para calcular todo desde el store
  (`useBookings`, `useSales`, `useDayKpis`).
- `VistaPublicaJugador.jsx`: el flujo de reserva no crea ningún booking real
  ni abre WhatsApp. Conectar a `useBookingActions().crear()` con
  `canal: 'web'` + `openWhatsApp()` de `lib/whatsapp.js`.
- Botones muertos del Navbar: selector de complejo (líneas ~95-115 de
  `Navbar.jsx`), "Ver todas las notificaciones", "Centro de Ayuda". El
  selector de complejo debería mostrar `config.complejo.nombre` en vez de
  `COMPLEX_INFO.name` hardcodeado.

### Fase 7 — Pulido final

- Empty states en todas las listas (TurnosFijos ya tiene el patrón).
- `prefers-reduced-motion`: ya en `index.css` global, revisar que ninguna
  animación nueva lo ignore.
- Barrido de `focus-visible`.
- Botón "Reiniciar datos demo": `useStoreMaintenance().reiniciarDemo()` ya
  existe en el store.
- Export/import JSON en Configuración.
- Build de producción final.

---

## Mapa de archivos clave

```
src/lib/                     utilidades puras — LEER ANTES de reescribir
  date.js                    único lugar donde se permite `new Date`
                             exporta: todayISO, nowISO, addDays, dayOfWeek,
                             monthKey, occurrencesInMonth, DIAS_SEMANA,
                             formatLongDate, formatMediumDate, relativeDayLabel
  pricing.js                 exporta: precioSlot, precioMensualFijo,
                             senaSugerida, bookingTotals, isNightSlot
  format.js                  exporta: formatARS, formatARSCompact, toNumber
  status.js                  exporta: ESTADO_MES, ESTADO_MES_LABEL,
                             ESTADO_MES_VARIANT, DIAS_SEMANA (re-export),
                             badgeForClient, scoreForClient
  catalog.js                 exporta: PRODUCT_ICONS, iconForProduct,
                             guessIconKey, CATEGORIAS, CATEGORIA_OPTIONS
  phone.js / whatsapp.js     exporta: normalizePhone, waLink, plantillas

src/store/
  index.js                   superficie pública — importar SOLO de acá
  hooks.js                   TODOS los hooks de lectura/escritura
    useConfig()              → state.config
    useCanchas()             → state.canchas (todas)
    useCanchasActivas()      → state.canchas.filter(activa)
    useProducts()            → state.products
    useSales()               → state.sales
    useSalesForBooking(id)   → ventas de un turno
    useTurnosFijos()         → state.turnosFijos
    useBookings()            → state.bookings (todos)
    useBookingsForDate(iso)  → bookings + proyectados para esa fecha
    useSelectedDate()        → state.ui.selectedDate (ISO string)
    useDayKpis(iso)          → { ocupados, totalSlots, ocupacionPct, ... }
    useCajaDelDia(iso)       → { ventas, totalVentas }
    useToast()               → { success, error, info, dismiss }
    useUIActions()           → { setActiveTab, setSelectedDate, setSession }
    useConfigActions()       → { actualizar(patch) }
    useCanchaActions()       → { crear, actualizar, eliminar }
    useBookingActions()      → { crear, actualizar, cancelar, eliminar,
                               registrarPago, quitarPago, materializarFijo }
    useClientActions()       → { crear, actualizar, eliminar, restaurar }
    useProductActions()      → { crear, actualizar, eliminar, restaurar }
    useSaleActions()         → { registrar, anular }
    useTurnoFijoActions()    → { crear, actualizar, eliminar, restaurar,
                               cancelarOcurrencia, marcarMes }
    useStoreMaintenance()    → { reiniciarDemo, importar }
  selectors.js               selectBookingsForDate (con proyección virtual),
                             selectIsSlotFree, selectBookingTotals,
                             selectClientStats, selectClientBadge,
                             selectDayKpis, selectCajaDelDia
  actions.js                 catálogo completo de acciones (tipo T.*)
  legacyAdapter.js           ⚠️ TRANSITORIO — se borra en Fase 5
  repository/README.md       contrato para el futuro backend

src/data/
  mockData.js                fixtures crudos — NADIE más lo importa
                             (solo seed.js lo usa)
  seed.js                    normalización — LEER si hay dudas de modelo

src/components/
  GrillaTurnos.jsx           ⚠️ todavía usa legacyAdapter (Fase 5)
  NuevoTurnoModal.jsx        ⚠️ todavía usa legacyAdapter (Fase 5)
  DetalleTurnoModal.jsx      ⚠️ todavía usa legacyAdapter (Fase 5)
                             + window.confirm() sin reemplazar (Fase 4)
  ClientesCRM.jsx            ⚠️ todavía usa legacyAdapter (Fase 5)
  TurnosFijos.jsx            ✅ lee del store directo (Fase 2)
  CajaCantina.jsx            ✅ lee del store directo (Fase 2)
  ConfiguracionComplejo.jsx  ✅ lee del store directo (Fase 2)

tools/
  shot.mjs                   capturas Chrome headless + chequeo overflow
  test-persist.mjs           test e2e de persistencia (patrón a reusar)
```

## Reglas que no romper

1. `new Date(...)` solo en `src/lib/date.js`.
2. Nada derivado se almacena — `bookingTotals()` siempre, nunca un
   `totalPrice` guardado a mano.
3. Cantina de un turno = `Sale` con `bookingId`, nunca un array embebido.
4. Sin `alert()`/`confirm()` nativos (queda uno en `DetalleTurnoModal`).
5. Sin hex hardcodeado en componentes — todo por token.
6. Glow verde solo en `.btn-primary`.
7. Todo número lleva `.num`.
8. **Importar del store SOLO desde `'../store'`** (nunca de
   `'../store/hooks'`, `'../store/slices/*'`, etc.) — puede generar ciclos
   de imports en Vite.

## Cómo verificar que algo no se rompió

```bash
npx oxlint src              # no "npm run lint" (hook rtk lo intercepta)
npx vitest run              # 70 tests, deben seguir en verde
npm run build                # debe compilar
node tools/shot.mjs          # capturas + overflow check
```

Antes de cada commit de fase, correr los 4.
