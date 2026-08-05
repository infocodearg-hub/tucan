# TuCan — Handoff para continuar el trabajo

Estado real del repo al momento de escribir esto: **Fase 0, 0.5 y 1 completas y
commiteadas.** Build limpio, 70/70 tests verdes, verificado en Chrome real.
Nada sin commitear. Podés arrancar de acá con otra IA o vos mismo.

```bash
git log --oneline
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

**Antes de tocar nada, leé el plan completo:**
`C:\Users\Rodrigo\.claude\plans\necesito-que-analices-todo-bubbly-tiger.md`
Ahí está el diagnóstico completo (con file:line), el diseño del store, el
sistema de diseño, la estrategia responsive y las 7 fases con criterios de
salida exactos. Este documento es un resumen operativo de "qué falta"; el
plan tiene el "por qué" y el detalle de diseño.

---

## Lo que YA está hecho

### Fase 0 — Limpieza y base
- Git inicializado, `.gitignore` real, 4 commits.
- Borrados 14 componentes huérfanos de otros proyectos (adultos + carnicería
  IA) + 2MB de assets + artefactos de raíz (PDF, PNGs, `build_pdf.py`,
  `analisis.md`).
- `oxlint` + `prettier` + `vitest` instalados y configurados.
- `src/lib/` completo: `date.js` (único lugar donde se permite `new Date`),
  `pricing.js`, `format.js`, `phone.js`, `whatsapp.js`, `status.js`,
  `catalog.js`, `validate.js`, `id.js`. 47 tests.

### Fase 0.5 — Sistema de diseño
- Tipografía: **Archivo** (display) + **Instrument Sans** (UI) + **Geist
  Mono** (toda cifra, clase `.num` con tabular-nums).
- `src/index.css` reescrito entero: tokens en `@theme` (Tailwind v4),
  bordes neutros, colores semánticos (pagado=verde, señado=ámbar, fijo=violeta,
  bloqueado=rojo, bot=cian), glow solo en `.btn-primary`.
- Responsive solo `min-width` (breakpoints 640/768/1024). El hack
  `.hidden{display:none!important}` que colisionaba con Tailwind `md:` en los
  768px **ya no existe**.
- `--nav-h` centraliza la altura del navbar (arregla el desfase sidebar/navbar).
- Modales pasan a bottom-sheet bajo 640px.
- `viewport-fit=cover` activa las safe areas de iOS.
- Clases fantasma que el markup usaba y no existían en ningún CSS ya están
  definidas: `.toggle-switch`/`.toggle-slider` (switches reales),
  `.input-icon-wrap`/`.input-icon`, `.animate-enter`, `.badge-available`,
  `.dropdown-divider`, `.sidebar`, etc.
- 264 hex hardcodeados reemplazados por tokens.

### Fase 1 — Store central + persistencia
- `src/store/` completo: `actions.js` (contrato de API), `slices/*`
  (config, canchas, bookings, clients, products, sales, turnosFijos, ui),
  `crossSlice.js` (efectos que cruzan slices: stock al vender, guard de
  doble reserva, desvincular FK al borrar cliente/cancha/turnoFijo),
  `selectors.js` (incluye `selectBookingsForDate` con proyección virtual de
  turnos fijos), `hooks.js` (hooks de dominio: `useBookings`,
  `useBookingActions`, etc — **nunca** un `useStore()` único),
  `repository/localStorageRepo.js` + `README.md` con el contrato para el
  día que exista Supabase, `migrations.js`, `schema.js`.
- `src/data/seed.js`: normaliza los fixtures viejos de `mockData.js` al
  modelo nuevo (fechas ISO reales, `canchaId` como FK real, `pagos[]` en vez
  de `depositPaid` escalar, cantina como `Sale` con `bookingId`, score
  numérico). Rebasa las fechas semilla a "hoy" para que la demo nunca abra
  vacía.
- `src/store/legacyAdapter.js`: **capa transitoria** que traduce el modelo
  nuevo del store a la forma vieja que todavía esperan `GrillaTurnos`,
  `NuevoTurnoModal`, `DetalleTurnoModal` y `ClientesCRM`. Se borra en la
  Fase 5 cuando esos 4 componentes se reescriben. Está comentado con un
  banner `⚠️ CAPA TRANSITORIA` al inicio del archivo — no lo confundas con
  parte del modelo final.
- `App.jsx` ya lee todo del store (via hooks + adapter) en vez de
  `useState` local. `main.jsx` envuelve con `<StoreProvider>`.
- `ToastViewport.jsx` + `Toast.jsx` reescritos: cola real (máx 3), timer
  propio por item, `role="status"`.
- 70 tests (47 de `lib/` + 23 de store/seed). `reducer.test.js` cubre el
  guard de doble reserva, stock al vender/anular, desvinculación de FKs.
  `migrations.test.js` corre el `mockData` real por `createSeedData()` y
  afirma invariantes de tipos.
- **Verificado en Chrome real** (no solo tests): crear turno por la UI, F5,
  sigue ahí. Cero errores de consola a 320/390/768/1440px.

### Bugs reales que se encontraron y arreglaron en el camino
(más allá de los ya documentados en el plan original)
1. `StoreProvider` explotaba en el primer F5 con "Cannot destructure
   activeTab of undefined": `ui` no se persiste a propósito, pero el `init()`
   no mergeaba con un `ui` fresco. Arreglado en `StoreProvider.jsx`.
2. El badge de cliente viajaba como string y `ClientesCRM`'s
   `getBadgeComponent` adivinaba el ícono por substring (`.includes('VIP')`,
   `.includes('Capitán')`...). Las etiquetas derivadas nuevas ('Habitual',
   'Nuevo') no calzaban con ningún substring → cualquier cliente que no
   fuera VIP se veía con el badge de "⚠️ Cancela tarde". Arreglado: el badge
   viaja como objeto `{key,label,variant}` y el componente switchea por `key`.
3. El bug ya documentado de `score >= '9'` (comparación de string) en
   `ClientesCRM.jsx` se corrigió con `parseFloat(c.score)`.
4. `NuevoTurnoModal` ya no queda montado siempre — `App.jsx` lo monta solo
   cuando está abierto, con `key` por slot (arregla el bug de que clickear un
   slot libre mostraba la cancha/hora del slot anterior).

---

## Lo que FALTA — Fases 2 a 7

### ⚠️ Advertencia sobre lo que dejé a medias

Estaba empezando la Fase 2 (reescribir `TurnosFijos.jsx` para leer del store
en vez de su propio `useState` local) cuando se cortó por presupuesto. **Ese
archivo quedó revertido a su versión de la Fase 1** (usa
`TURNOS_FIJOS_RECURRENTES` de `mockData.js` directo, estado local, se pierde
al cambiar de pestaña — el bug original, sin tocar). El intento de reescritura
rompía el build (`npm run build` fallaba en el import de
`useCanchasActivas`/`useConfig`/`precioMensualFijo` — no llegué a diagnosticar
si era un problema de export en `store/index.js`, un ciclo de imports, o un
typo). **Cuando retomes la Fase 2, andá con cuidado ahí específicamente:**
compilá después de cada import nuevo, no escribas el archivo entero de una.

### Fase 2 — Matar el estado huérfano (siguiente paso)

Objetivo: `TurnosFijos`, `CajaCantina` y `ConfiguracionComplejo` dejan de
tener estado propio / imports directos de `mockData.js` y pasan a leer y
escribir del store.

**`TurnosFijos.jsx`** (retomar acá, es lo que estaba a medio hacer):
- Reemplazar `useState(TURNOS_FIJOS_RECURRENTES)` por `useTurnosFijos()` +
  `useTurnoFijoActions()` del store (`src/store/index.js` ya los exporta).
- El día de semana viejo era un string libre ('Martes'); el turno fijo nuevo
  usa `diaSemana` numérico ISO (1=Lunes...7=Domingo) — hay una tabla
  `DIAS_SEMANA` en `src/lib/status.js` con `{n, corto, largo, plural}`. Usar
  `.plural` para el label de la card (arregla el bug de "Martess").
- La cancha ya no es un string libre, es `canchaId` (FK real) — usar
  `useCanchasActivas()` para el selector del modal de alta.
- El precio mensual se deriva con `precioMensualFijo(tf, cancha, ocurrencias,
  nightFrom)` de `src/lib/pricing.js`, no un número hardcodeado. Las
  ocurrencias del mes salen de `occurrencesInMonth(mesKey, diaSemana)` de
  `src/lib/date.js`.
- El estado "al día / pendiente" ya no es un string libre, es
  `tf.estadoPorMes[mesKey]` con valores `'al_dia'|'pendiente'|'deuda'` — hay
  labels en `ESTADO_MES_LABEL` (`src/lib/status.js`).
- Antes de escribir el JSX completo, importar UNA cosa a la vez y correr
  `npm run build` para ubicar exactamente qué import rompe.

**`CajaCantina.jsx`**:
- Borrar el `import { CANTINA_PRODUCTS, INITIAL_BOOKINGS } from
  '../data/mockData'` — usar `useProducts()`, `useBookingsForDate(fecha)`
  (con `useSelectedDate()`) en su lugar.
- Borrar el `useState(salesHistory)` local — usar `useSales()` +
  `useSaleActions().registrar()`.
- El mapa `PRODUCT_ICONS` local (con la clave rota `prod_stella` para un
  producto `prod_cerveza`) se borra — usar `iconForProduct(product)` de
  `src/lib/catalog.js`, que lee `product.iconKey` (ya seteado bien en
  `seed.js`).
- Al vender, `saleActions.registrar()` ya descuenta stock automáticamente
  (la lógica está en `crossSlice.js`, `SALE_CREATE`) — no hay que tocar
  stock a mano.
- Hay un `discountPercent` en el estado que nunca tuvo UI para setearlo
  (siempre 0) — se puede dejar así o agregar un input, no es bloqueante.

**`ConfiguracionComplejo.jsx`**:
- Borrar `useState(COMPLEX_INFO)` — usar `useConfig()` + `useConfigActions().actualizar(patch)`.
- Los 6 inputs de precio por cancha (`Precio Diurno`/`Precio Nocturno`) hoy
  son `defaultValue` sin `onChange` — decorativos, no guardan nada. Deben
  ser controlados y llamar a `useCanchaActions().actualizar(canchaId, {
  precioDia, precioNoche })`.
- `ToggleRow` tiene su propio `useState` por fila — cada toggle debe leer y
  escribir `config.integraciones.*` (`whatsappBotActivo`, `modo247`,
  `alertasSinSena`, `recordatorioAutomatico`, `ocrComprobantes`).
- `señaMinimaPorcentaje` ya vive en `config.pagos.senaMinimaPorcentaje` —
  conectar el input ahí. Una vez conectado, `NuevoTurnoModal` y
  `VistaPublicaJugador` deberían leer ese valor en vez de hardcodear 50%
  (hoy `basePrice/2` a mano) — eso es más bien Fase 5/6 pero vale la pena
  hacerlo apenas el dato exista.
- Las clases `.toggle-switch`/`.toggle-slider` YA están definidas en
  `index.css` (Fase 0.5) — el problema de hoy es solo de wiring, no de CSS.

**Salida de la Fase 2** (criterio de éxito):
```bash
grep -rn "mockData" src/components/   # debe dar 0 resultados
```
Cambiar de pestaña y volver no debe resetear nada. Una venta en Cantina baja
stock, sobrevive al F5, aparece en el historial. Los precios editados en
Configuración persisten y se reflejan en la Grilla (una vez migrada esa
lectura).

### Fase 3 — Fundación de fechas
- `ui.selectedDate` ya existe en el store (inicializa en `todayISO()`,
  accesible con `useSelectedDate()` / `useUIActions().setSelectedDate()`).
  Falta la UI: un componente `DateNav` con `‹ [📅 Hoy · fecha] ›  [Hoy]`
  usando `<input type="date">` nativo detrás de un trigger estilizado
  (da la rueda del SO en mobile gratis), más una tira de 7 días con punto
  de ocupación.
- Reemplaza las flechas muertas de `GrillaTurnos.jsx` (líneas ~213-222 en
  la versión pre-Fase-0.5, buscar `ChevronLeft`/`ChevronRight` sin
  `onClick`) y el header hardcodeado `"Hoy, Martes 5 de Agosto 2026"` — usar
  `formatLongDate(selectedDate)` de `lib/date.js`.
- `GrillaTurnos` ya recibe bookings correctamente filtrados por fecha desde
  `App.jsx` (`useBookingsForDate(selectedDate)` vía el adapter) — falta
  conectar el `DateNav` para que cambiar de día realmente cambie
  `selectedDate` en el store.
- Turnos fijos proyectados (`esVirtual: true`) ya aparecen en
  `selectBookingsForDate` cuando corresponde — probar navegando a otro día
  de la semana para verlos.
- `selectIsSlotFree` (en `selectors.js`) ya existe y `useBookingActions().crear()`
  ya lo usa para rechazar dobles reservas — no hay que reinventar esa parte,
  solo conectar la UI de fecha.

### Fase 4 — Infra de modales + CRUD total + login
Nada de esto existe todavía. Hay que crear:
- `src/components/ui/Modal.jsx`: portal a `#portal-root` (ya está en
  `index.html`), `role="dialog" aria-modal`, Escape, focus trap, scroll
  lock, estructura Header/Body(único scroll)/Footer sticky. Todos los
  modales existentes (`NuevoTurnoModal`, `DetalleTurnoModal`,
  `NuevoClienteModal`, `NuevoProductoModal`, `VentaExitosaModal`, el modal
  inline de `TurnosFijos`) deberían migrar a usar este shell — hoy cada uno
  reimplementa `.modal-overlay`/`.modal-content` a mano sin Escape ni focus
  trap.
- `ConfirmDialog` + `useConfirm()`: reemplaza los `window.confirm()`
  existentes (hay uno en `DetalleTurnoModal.jsx` al cancelar un turno).
- `Field` (wrapper de label/error/hint con `useId()`), reemplaza los
  `if (!x.trim()) return` silenciosos de los modales de alta.
- `Select` accesible que reemplace `CustomSelect.jsx` (hoy: sin teclado, sin
  roles ARIA, con dos props CSS inválidos `justify` en vez de
  `justifyContent` en las líneas ~42 y ~101, y su dropdown se recorta si
  está dentro de un modal con `overflow-y:auto` — portalearlo resuelve
  ambas cosas).
- Editar/borrar clientes, productos, turnos, turnos fijos: hoy solo existe
  Crear. `useClientActions/useProductActions/useBookingActions/
  useTurnoFijoActions` en `src/store/hooks.js` YA tienen `.actualizar()` y
  `.eliminar()` — falta la UI que los llame. Patrón recomendado: modales
  dual-mode (`mode="create"|"edit"`) montados solo cuando abiertos con
  `key={entity?.id ?? 'new'}`.
- Toast con acción "Deshacer": los hooks de borrado (`clientActions.eliminar`,
  `productActions.eliminar`, etc.) no capturan el registro borrado todavía —
  al llamar `.eliminar(id)` desde la UI, guardar el objeto ANTES de borrar y
  pasarlo como `action: { label: 'Deshacer', onClick: () => restaurar(obj) }`
  al toast (`useClientActions().restaurar` / `useProductActions().restaurar`
  / `useTurnoFijoActions().restaurar` ya existen en el store).
- Login local: `config.acceso` ya existe en el seed (`usuario: 'admin',
  password: 'tucan'`) — falta la pantalla `LoginScreen.jsx` y el gate en
  `App.jsx`/`main.jsx` que la muestre si no hay sesión. `ui.session` +
  `useUIActions().setSession()` ya existen para guardar la sesión (ojo:
  `ui` no se persiste — si querés que la sesión sobreviva al F5, hay que
  guardarla aparte, por ejemplo una clave propia de `localStorage`, no
  dentro del store principal).

### Fase 5 — Migración de estilos inline (la más larga)
Orden sugerido: Navbar/Sidebar (ya bastante migrados) → GrillaTurnos →
CajaCantina → ClientesCRM → TurnosFijos → ReportesAnalytics →
ConfiguracionComplejo → VistaPublicaJugador.

Esta es también la fase donde:
- **Se borra `src/store/legacyAdapter.js` entero** y `GrillaTurnos`,
  `NuevoTurnoModal`, `DetalleTurnoModal`, `ClientesCRM` pasan a consumir el
  store directo (sin adapter). Es el cambio de mayor riesgo de toda la
  reforma — hacerlo componente por componente, no los 4 juntos.
- Se arregla la grilla en mobile: hoy es una matriz con scroll horizontal
  (mal en el dispositivo donde se demuestra). Pasar a lista vertical por
  cancha bajo `md`, mantener la matriz con columna de hora `sticky` en
  desktop.
- CajaCantina en 769-1100px tiene una zona muerta (sidebar 232px + panel
  fijo de 340px estruja el catálogo) — usar `@container` (Tailwind v4 lo
  soporta nativo) en vez de media queries.
- Grillas fijas (`repeat(3,1fr)`, `1fr 1fr`) pasan a `repeat(auto-fit,
  minmax(...))`.

Grep gates para saber si terminó:
```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src/components/   # debe dar 0
grep -c "style={{" src/components/*.jsx        # debe bajar a casi 0
```

### Fase 6 — Hacer reales las cosas falsas
- `ReportesAnalytics.jsx` es 100% estático (`COURT_DATA`, `CANTINA_TOP`,
  `WEEK_DATA` hardcodeados, los 4 KPIs son strings fijos como `'$2.840.000'`).
  Reescribir para calcular todo desde el store (`useBookings`, `useSales`).
- `VistaPublicaJugador.jsx`: el flujo de reserva no crea ningún booking real
  ni abre WhatsApp, solo flipea a una pantalla de éxito. Conectar a
  `useBookingActions().crear()` con `canal: 'web'` + `openWhatsApp()` de
  `lib/whatsapp.js`.
- Botones muertos del Navbar sin `onClick`: selector de complejo (línea
  ~95-115 de `Navbar.jsx`), "Ver todas las notificaciones", "Centro de
  Ayuda". El selector de complejo debería, como mínimo, mostrar
  `config.complejo.nombre` en vez del `COMPLEX_INFO.name` hardcodeado de
  mockData.

### Fase 7 — Pulido final
Estados vacíos en todas las listas (algunas ya tienen, ej. `TurnosFijos` en
mi intento revertido tenía un `.empty-state` — replicar el patrón),
`prefers-reduced-motion` (ya está en `index.css` a nivel global, revisar que
ninguna animación nueva lo ignore), barrido de `focus-visible`, botón
"Reiniciar datos demo" (`useStoreMaintenance().reiniciarDemo()` ya existe en
el store) + export/import JSON en Configuración, favicon/meta ya están
hechos (Fase 0.5), build de producción final.

---

## Mapa de archivos clave

```
src/lib/                     utilidades puras — LEER ANTES de reescribir
  date.js                    único lugar donde se permite `new Date`
  pricing.js                 día/noche, seña, bookingTotals (todo derivado)
  format.js                  formatARS, formatARSCompact, etc.
  status.js                  DIAS_SEMANA, badgeForClient, enums y labels
  catalog.js                 PRODUCT_ICONS, iconForProduct, guessIconKey
  phone.js / whatsapp.js     normalizePhone, waLink, plantillas de mensaje

src/store/
  index.js                   superficie pública — importar SOLO de acá
  hooks.js                   TODOS los hooks de lectura/escritura
  selectors.js                selectBookingsForDate, selectBookingTotals, etc.
  actions.js                  catálogo completo de acciones
  legacyAdapter.js            ⚠️ TRANSITORIO — se borra en Fase 5
  repository/README.md        contrato para el futuro backend

src/data/
  mockData.js                 fixtures crudos, nadie más los importa
  seed.js                     normalización — LEER si hay dudas de modelo

tools/
  shot.mjs                    capturas Chrome headless + chequeo overflow
  test-persist.mjs            test e2e de persistencia (patrón a reusar)
```

## Reglas que no romper (están en `README.md` del proyecto también)

1. `new Date(...)` solo en `src/lib/date.js`.
2. Nada derivado se almacena — `bookingTotals()` siempre, nunca un
   `totalPrice` guardado a mano.
3. Cantina de un turno = `Sale` con `bookingId`, nunca un array embebido.
4. Sin `alert()`/`confirm()` nativos (falta migrar el que queda en
   `DetalleTurnoModal`).
5. Sin hex hardcodeado en componentes — todo por token.
6. Glow verde solo en `.btn-primary`.
7. Todo número lleva `.num`.

## Cómo verificar que algo no se rompió

```bash
npx oxlint src              # no "npm run lint" (hook rtk lo intercepta)
npx vitest run              # 70 tests, deben seguir en verde
npm run build                # debe compilar
node tools/shot.mjs          # capturas + overflow check, mirar el JSON de salida
```

Antes de cada commit de fase, correr los 4. El plan original (ver ruta al
inicio de este doc) tiene una checklist de click-through manual más
detallada en su sección "Verificación" — usarla al cerrar cada fase.
