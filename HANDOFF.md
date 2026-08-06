# TuCan — Handoff para continuar el trabajo

Estado real del repo al momento de escribir esto: **Fases 0 a 4 completas +
CRUD total (clientes, productos, turnos fijos, turnos) + ronda "multigestión"
(gastos, cierre de caja diario, gestión completa de canchas, últimos 2
componentes migrados fuera de `mockData.js`) + ronda de pulido visual
profesional (calendario propio, cero emojis en la UI, Cierre de Caja con
desglose real, Configuración en sub-secciones, mobile 100% sin overflow) +
ronda "modales/QR/export/prep Supabase" (bug de `position:fixed` roto en
TODOS los modales arreglado de raíz, Vista Pública movida a `/reserva` con
QR real, Export PDF funcional en Cierre de Caja, scaffolding de Supabase sin
wirear) + ronda "Cantina mobile + deploy" (historial reordenado en mobile,
íconos rotos en Reportes, ticket itemizado, `vercel.json`, demo poblada,
manual de usuario) + **ronda "zoom Cantina + ticket PDF" (ver sección
homónima al final: bug de zoom por doble-tap en Cantina, ticket pasó de
`window.print()` a PDF real con jsPDF, bug de orientación de página en ese
PDF, enlaces reales para "Vista Pública Web" y "Centro de Ayuda" en el menú
de perfil).**
Deploy YA conectado: Vercel sirve el repo (`https://github.com/infocodearg-hub/tucan`)
en auto-deploy desde `master` — dominio visto en la última sesión con URL
tipo `*-lovat.vercel.app` (nombre autogenerado por Vercel, puede cambiar).
Build limpio, 70/70 tests verdes, verificado con Puppeteer real de punta a
punta (crear/editar/borrar/deshacer en el navegador, no solo que compile).

```bash
git log --oneline
# <HEAD> fix: zoom por doble-tap en Cantina + ticket PDF real + enlaces del menu
# 2fcc740 fix: ticket imprimible sin paginas fantasma + cantina mobile mas densa
# 697e087 feat: gastos/cierre de caja, gestion de canchas, pulido visual, deploy prep
# 6bf3e14 docs: actualizar HANDOFF con el estado real tras CRUD completo
# 494bae5 feat: editar turno desde el detalle + modal en vivo
# e130c67 feat: editar turnos fijos + confirmacion y deshacer al borrar
# 3c59da0 feat: editar y borrar productos y clientes (CRUD completo)
# b25647e fix: overflow horizontal en mobile (Cantina, Clientes) + Reportes
# 8bcdfe1 feat(fase-3+4): DateNav + GrillaTurnos live + Login + ConfirmDialog
# 747b54d docs: actualizar HANDOFF con estado real Fase 2 completa
# 44407ac feat(fase-2): TurnosFijos + CajaCantina + Configuracion leen del store
# 1976579 feat(fase-1): store central con persistencia en localStorage
# 7f9cdca feat(fase-0.5): nuevo sistema de diseno Deep Pitch
# 7003bae chore(fase-0): limpieza, tooling y capa de utilidades
# de537b8 chore: snapshot inicial antes del pulido

npm install
npm run dev              # http://localhost:5173  (login demo: admin / tucan)
npx vitest run           # 70 tests
npm run build             # debe compilar sin error
npx oxlint src            # ~10 warnings preexistentes, ninguno bloqueante
node tools/shot.mjs        # capturas Chrome headless + chequeo de overflow
node tools/test-persist.mjs   # test e2e de persistencia (crear turno -> F5 -> persiste)
```

**IMPORTANTE — `npm run lint` roto por un hook externo (`rtk`)**, no por el
proyecto. Usar `npx oxlint src` directo.

**Patrón para probar cosas en el navegador con Puppeteer sin loguearte a
mano:** `page.evaluateOnNewDocument(() => localStorage.setItem('tucan_session_v1', JSON.stringify({loggedIn:true, ts:Date.now()})))`
antes del primer `page.goto` — salta el `LoginScreen`. `tools/shot.mjs` ya
lo hace. Para un test limpio desde la demo semilla, sumar
`localStorage.removeItem('tucan:state:v1')` en el mismo `evaluateOnNewDocument`.

---

## Lo que YA está hecho

### Fase 0 — Limpieza y base
Git inicializado, 14 componentes huérfanos + 2MB de assets borrados,
`oxlint`+`prettier`+`vitest` instalados, `src/lib/` completo (`date.js`,
`pricing.js`, `format.js`, `phone.js`, `whatsapp.js`, `status.js`,
`catalog.js`, `validate.js`, `id.js`). 47 tests.

### Fase 0.5 — Sistema de diseño
Tipografía Archivo (display) + Instrument Sans (UI) + Geist Mono (toda
cifra, clase `.num`). `src/index.css` reescrito con tokens `@theme`
(Tailwind v4), colores semánticos, `--nav-h` centralizado, modales →
bottom-sheet bajo 640px, breakpoints solo `min-width`.

### Fase 1 — Store central + persistencia
`src/store/` completo (8 slices, `crossSlice.js`, `selectors.js`,
`hooks.js`, `actions.js`, `migrations.js`, `schema.js`). `src/data/seed.js`
normaliza los fixtures viejos al modelo real (FKs, fechas ISO, `pagos[]`,
score numérico). `src/store/legacyAdapter.js` es la única pieza transitoria
que queda — traduce el modelo nuevo a la forma vieja para los 3
componentes que todavía no se reescribieron (ver más abajo).

### Fase 2 — Estado huérfano eliminado
`TurnosFijos`, `CajaCantina`, `ConfiguracionComplejo` leen y escriben del
store directo, sin imports de `mockData.js`.

### Fase 3 — Fechas reales
`DateNav.jsx`: chevrones + picker nativo + tira de 7 días con punto de
ocupación (`useDayKpis`). `GrillaTurnos` conectado a `ui.selectedDate`,
KPIs reales, turnos fijos proyectados aparecen en el día correcto.

### Fase 4 — Login + ConfirmDialog + CRUD total ✅

- **`LoginScreen.jsx`**: gate local contra `config.acceso` (usuario `admin`
  / contraseña `tucan`), sesión en una clave de `localStorage` separada del
  store (`tucan_session_v1` — `ui` no se persiste a propósito).
- **`ConfirmDialog.jsx` + `useConfirm()`**: reemplaza todo `window.confirm()`
  del proyecto. Promesa async, `role="alertdialog"`. **No tiene** portal ni
  focus-trap todavía (ver "Lo que falta").
- **CRUD completo en las 4 entidades editables:**
  - **Productos** (`CajaCantina.jsx` + `NuevoProductoModal.jsx` dual-mode):
    crear, editar (lápiz en cada card), borrar (dentro del modal de
    edición) con confirm + toast "Deshacer".
  - **Clientes** (`ClientesCRM.jsx` + `NuevoClienteModal.jsx` dual-mode):
    crear, editar, borrar (lápiz/tacho en cada card) con confirm + deshacer.
    El picker de "categoría/badge inicial" que existía en el alta se
    **eliminó** — las etiquetas del CRM se derivan del comportamiento real
    (`badgeForClient`), elegir una a mano nunca tuvo efecto.
  - **Turnos fijos** (`TurnosFijos.jsx`): ya tenía crear/borrar (Fase 2), se
    agregó **editar** (mismo patrón dual-mode) y el borrar ahora pasa por
    `ConfirmDialog` + deshacer (antes ejecutaba directo al click).
  - **Turnos individuales** (`DetalleTurnoModal.jsx`): ya tenía
    saldar/cancelar/cargar-cantina/WhatsApp; se agregó **editar** (nombre,
    teléfono, notas) con un formulario inline dentro del mismo modal.
- **Patrón dual-mode usado en todos lados**: un solo componente maneja
  crear y editar (`producto`/`cliente`/`tf` = `null` en alta, objeto en
  edición). Evita la deriva que ya pasó una vez con turnos fijos
  (`'21:00 hs'` vs `'21:00'` en dos componentes distintos).
- **Toast "Deshacer"**: `useToast().info(msg, { action: { label, onClick } })`
  — el shape correcto es `{ action: {...} }`, NO `{ label, onClick }` sueltos
  (`Toast.jsx` lee específicamente la prop `action`). Cada borrado usa
  `xxxActions.restaurar(objetoBorrado)`, que ya existía en el store.

### Ronda "multigestión" — gastos, cierre de caja, canchas, últimos 2 bugs de mockData

Trabajo posterior a Fase 4, hecho de una — no tiene número de fase propio
en el plan original (el plan de esta ronda vive/vivió en
`~/.claude/plans/necesito-que-analices-todo-bubbly-tiger.md`).

- **Slice `expenses` nueva** (`src/store/slices/expenses.js`): gastos con
  `fecha, concepto, monto, categoria, notas`. Mismo molde CRUD que
  `products`/`clients` (`crear/actualizar/eliminar/restaurar`). Se agregó a
  `PERSIST_WHITELIST` y a `createInitialState()` — **no hizo falta subir
  `SCHEMA_VERSION` ni tocar `migrations.js`**: `StoreProvider.jsx` hidrata con
  `{ ...fresh, ...persisted, ui: fresh.ui }`, así que una key nueva ausente
  en un blob viejo de localStorage cae sola al default de `fresh`. Ese
  patrón vale para cualquier slice nueva futura, mientras no cambie la
  FORMA de una entidad existente (ahí sí hace falta migración de verdad).
  UI: pestaña "Gastos" dentro de `ReportesAnalytics.jsx` (`NuevoGastoModal.jsx`
  dual-mode, confirm + deshacer).
- **Cierre de caja diario**: pestaña nueva en `ReportesAnalytics.jsx`,
  selector `selectCierreCajaDelDia(state, fecha)` en `selectors.js`. **Ojo
  con esto si lo tocás**: NO es lo mismo que `selectDayKpis` (agrupa por
  `booking.fecha`, o sea "turnos que se juegan ese día") ni que
  `selectCajaDelDia` (suma TODAS las ventas del día sin filtrar
  `bookingId`). El cierre de caja agrupa por `pago.fecha.slice(0,10)` (plata
  que efectivamente entró ese día, sin importar cuándo se juega el turno) y
  solo cuenta ventas de mostrador SIN `bookingId` — las que tienen
  `bookingId` ya están adentro de los pagos del turno, sumarlas de nuevo
  duplicaría la plata.
- **Gestión completa de canchas**: `ConfiguracionComplejo.jsx` ahora tiene
  alta (`NuevoCanchaModal.jsx`), edición completa (no solo precio),
  desactivar/reactivar (`activa` toggle) y borrado duro **solo si está
  inactiva y sin turnos activos** — el borrado valida `state.bookings`
  ANTES de despachar (no se puede leer `ui.lastError` del `crossSlice` en
  el mismo tick del dispatch, ya mordió una vez con `DetalleTurnoModal`).
  El store ya tenía `useCanchaActions().crear/eliminar` desde Fase 1-2, era
  pura falta de UI.
- **`NuevoTurnoModal.jsx` — el bug de mockData que HANDOFF venía marcando
  como "el más importante que falta" está arreglado.** Ya no importa
  `COMPLEX_INFO`/`TIME_SLOTS`/`CANTINA_PRODUCTS` de `data/mockData.js`:
  usa `useCanchasActivas()`, `config.operacion.slots`, `useProducts()` +
  `iconForProduct()`, y `precioSlot()`/`isNightSlot()` de `lib/pricing.js`
  en vez de reimplementar el cálculo de nocturno a mano. Se sacó el
  checkbox "Registrar como Turno Fijo Recurrente" — no hacía nada real
  (`App.jsx` nunca creaba un `TurnoFijo` con eso tildado, solo un booking
  suelto; era un control que mentía). **Sigue** detrás de
  `legacyAdapter.js` para el `onSaveBooking` que le pasa `App.jsx` — eso es
  Fase 5, no se tocó.
- **`VistaPublicaJugador.jsx`** también dejó de importar `mockData.js`.
  Ahora pide nombre/teléfono del jugador (antes no los pedía — iba directo
  de "elegí cancha/horario" a una pantalla de éxito fake), crea un booking
  real (`canal:'web'`) vía `useBookingActions().crear()`, respeta el guard
  de slot ocupado (antes ese guard no existía en este flujo — reservar dos
  veces el mismo horario mostraba éxito las dos veces) y abre WhatsApp con
  `openWhatsApp()` + `msgConsultaPublica()` de `lib/whatsapp.js`.
- **Pulido dirigido** (no barrido completo, decisión explícita del
  usuario): sacado `fontFamily:'Outfit, sans-serif'` hardcodeado en
  `ClientesCRM.jsx` (fuente que no existe en los tokens reales); badge
  "4 equipos" fijo en `Sidebar.jsx` ahora sale de
  `useTurnosFijos().filter(tf => tf.activo).length`; hovers armados a mano
  con `onMouseEnter/onMouseLeave` mutando `style` en `CajaCantina.jsx`
  (cards de producto) y `TurnosFijos.jsx` (pencil/trash) pasaron a CSS
  puro (`.product-card-hoverable`, `.row-icon-btn`, `.chip-hoverable` en
  `index.css`).
- **Verificado con Puppeteer real, no solo build**: crear/borrar/deshacer
  un gasto (con chequeo de que el borrado sobrevive al debounce de 300ms
  de `localStorageRepo`), cierre de caja renderiza sin `NaN`, crear una
  cancha nueva y verla aparecer **sin recargar** en el selector de
  `NuevoTurnoModal` (la prueba directa de que el bug de mockData está
  resuelto), reserva desde Vista Pública crea un booking real en el store.

### Ronda "pulido visual profesional" — calendario, emojis, cierre de caja, configuración, mobile

Trabajo posterior a la ronda "multigestión", disparado por capturas de pantalla reales del usuario mostrando 3 problemas concretos.

- **`DateNav.jsx` — calendario propio.** El picker de fecha usaba
  `pickerRef.current.showPicker()` sobre un `&lt;input type="date"&gt;`
  oculto — eso abre el calendario **nativo del sistema operativo**, que es
  imposible de estilar con CSS (por eso se veía gris y genérico,
  desconectado del resto de la UI). Se reemplazó por un calendario propio
  (`CalendarPopover`, componente interno del mismo archivo): grid de días,
  navegación de mes con `addMonths()`, cierre con click-afuera + Escape,
  reusa `.dropdown-menu`/`--z-popover` ya existentes en `index.css`. Se
  agregó `daysInMonth(mKey)` a `src/lib/date.js` (único lugar donde puede
  haber `new Date`, ver regla #1). El input nativo desapareció del todo —
  si hace falta la rueda nativa de iOS/Android en algún punto futuro, hoy
  ya no existe ese fallback, es 100% calendario propio en todas las
  plataformas.
- **Cero emojis en la UI real.** Se relevó con grep todo el árbol de
  componentes y se reemplazó cada emoji por un ícono `lucide-react`
  (☀️/🌙 → `Sun`/`Moon` en `GrillaTurnos`, `NuevoTurnoModal`,
  `VistaPublicaJugador`, `ConfiguracionComplejo`, `NuevoCanchaModal`;
  🔵/🟡 → `CheckCircle2`/`Clock` en `DetalleTurnoModal`; ✓/⚠ →
  `CheckCircle2`/`AlertCircle` en `TurnosFijos`; 💬/💰/⚠️ →
  `MessageSquare`/`DollarSign`/`AlertTriangle` en `Navbar`; el isotipo ⚽ de
  `Navbar`/`LoginScreen`/`VistaPublicaJugador` → ícono `Volleyball`).
  **A propósito NO se tocaron** `src/lib/whatsapp.js` ni el bloque de
  mensaje de `DetalleTurnoModal.jsx:74-81` (WhatsApp) — son texto de
  mensajes reales que se mandan a clientes, emoji ahí es estilo normal de
  mensajería de negocio, no "la UI se ve poco profesional". Tampoco se tocó
  `WhatsappCopilot.jsx` (sigue inalcanzable desde cualquier menú).
- **Cierre de Caja con desglose real.** Antes solo mostraba los 4 números
  agregados + la lista de gastos — no había forma de ver QUÉ turno se
  cobró ni QUÉ se vendió en mostrador. Selector nuevo
  `selectPagosDelDia(state, fecha)` en `src/store/selectors.js` (recorre
  `state.bookings`, aplana `pagos[]`, filtra por `pago.fecha` — mismo
  criterio que ya usaba `selectCierreCajaDelDia` para `ingresosTurnos`, no
  se inventó un criterio nuevo) + hook `usePagosDelDia`. La pestaña ahora
  muestra 3 listas: "Turnos cobrados hoy" (de `usePagosDelDia`), "Ventas de
  mostrador hoy" (de `useCajaDelDia(...).ventas` filtrado a `!bookingId` —
  mismo filtro que ya usa `ingresosCantina` del selector agregado, para que
  sumen exacto sin doble conteo) y "Gastos del día" (como antes).
- **`ConfiguracionComplejo.jsx` en sub-secciones (tabs).** Antes era un
  único grid de 4 `Section` apretadas en columnas de 320px mínimo. Ahora es
  el mismo patrón `.tab-switcher`/`.tab-btn` que ya usan
  `ReportesAnalytics`/`CajaCantina`/`TurnosFijos` (`TABS = [Complejo,
  Canchas, Cobros, Bot IA]`), cada `Section` a ancho completo. De paso se
  arregló la fila de gestión de cada cancha (nombre + botones editar/
  ocultar/borrar chocaban a poco ancho porque era una sola fila sin
  `flexWrap` ni `minWidth:0`) — pasó a 2 líneas: nombre + botones arriba
  (con `minWidth:0`+ellipsis en el nombre, botones `flexShrink:0`),
  subtítulo/deporte/badge "Inactiva" como caption abajo. Ya no puede chocar
  sin importar el ancho.
- **`GrillaTurnos.jsx`**: los filtros de deporte (tab-switcher) y de cancha
  (fila de pills con estilos inline separados) eran dos sistemas visuales
  distintos apilados — se unificaron, ambos usan `.tab-btn` (la fila de
  cancha suma un puntito de color del `c.color` como prefijo).
- **Mobile real, no solo "no se ve tan mal"**: se corrigió un overflow
  horizontal genuino en `VistaPublicaJugador.jsx` (la fila "Resumen & CTA"
  con `justify-content:space-between` sin `flexWrap` empujaba el botón
  "Reservar por WhatsApp" fuera del viewport a 320px) agregando
  `flexWrap:'wrap'` + `minWidth:0` en el texto — mismo patrón de siempre,
  documentado en la regla #8 de abajo. Verificado con Puppeteer real en
  320/360/390/768/1024/1440: `docW === scrollW` en todas, 0 elementos con
  `right > docW`. Lo único que sigue "desbordando" en el chequeo automático
  es la matriz de `GrillaTurnos` en mobile y las tiras horizontales de
  filtros/días — son contenedores con `overflowX:auto` **a propósito**
  (scroll horizontal interno intencional, no un bug), ya documentado como
  pendiente de Fase 5 (pasar la matriz a lista vertical por cancha en
  mobile).

### Bugs reales encontrados y arreglados en esta sesión
(más allá de los ya documentados en el plan original y en el historial de
commits anterior)

1. **Overflow horizontal en Cantina a cualquier ancho móvil.** La grilla
   POS (`1fr 340px` fijo) nunca colapsaba a una columna, y el ítem de grid
   "Left: Catálogo" no tenía `minWidth:0` — **los ítems de CSS Grid no se
   achican por debajo de su contenido mínimo por default**, así que una
   fila de tabs sin wrap reventaba el track y desbordaba la página entera
   ~30px a la derecha. Fix: clase `.pos-grid` (1 columna hasta 1100px) +
   `minWidth:0` en los dos ítems del grid. Este patrón (`minWidth:0` en
   cualquier ítem de grid/flex que contenga texto sin wrap) es la causa
   más probable de overflow futuro — revisarlo primero.
2. **ClientesCRM desbordaba a 320-360px**: buscador `width:200` fijo +
   botón "Nuevo Cliente" en una fila sin `flexWrap`, dentro de
   `.section-header` que en mobile usa `align-items:flex-start` (no
   `stretch`) — el contenedor no se ajustaba al viewport. Fix: `flexWrap` +
   buscador con `flex:1 1 160px`.
3. **Gráfico de "Ocupación Semanal" en Reportes con barras invisibles.**
   `height: ${pct}%` se resolvía contra un padre sin altura definida
   (`auto`) — una altura porcentual sobre un padre sin altura fija se
   resuelve como `auto`, así que las barras siempre caían al mínimo de
   8px. Fix: envoltorio intermedio con `flex:1` dentro del contenedor de
   110px, para que el porcentaje tenga contra qué resolverse.
4. **`DetalleTurnoModal` mostraba una foto congelada.** `selectedBookingDetail`
   en `App.jsx` se seteaba una vez al hacer click y nunca se releía —
   saldar un turno o cargar cantina no se veía reflejado en el modal ya
   abierto hasta cerrarlo y reabrirlo. Se agregó `liveBookingDetail`, que
   relee por id desde `bookings` (ya recalculado en cada render) en vez de
   arrastrar el objeto viejo. Los turnos fijos que se materializan a mitad
   de una acción (virt_xxx → bkg_yyy) empujan su id nuevo al snapshot para
   que la relectura los siga encontrando.
5. El "Complejo El Maracaná" que parecía superpuesto al botón "+ Turno" en
   capturas de pantalla `fullPage` era **un artefacto de Puppeteer**
   (elementos `position:sticky`/`fixed` se "fantasman" en capturas
   full-page con scroll simulado), no un bug real — verificado con
   screenshot de viewport real. Si algo se ve mal solo en un `fullPage`
   pero no en un screenshot normal, sospechar esto antes de perseguir un
   bug que no existe.

---

## Lo que FALTA — Fase 5 en adelante

### Fase 5 — Migración de estilos inline + borrar legacyAdapter (la más larga)

**4 componentes siguen sin migrar al store directo**, hablan a través de
`src/store/legacyAdapter.js` (el import directo de `mockData.js` que tenían
`NuevoTurnoModal.jsx` y `VistaPublicaJugador.jsx` **ya se arregló** en la
ronda "multigestión" de arriba — lo que queda acá es específicamente la
migración de `legacyAdapter`, no mockData):
- `GrillaTurnos.jsx` — recibe `bookings` como prop (shape legacy) desde
  `App.jsx`.
- `NuevoTurnoModal.jsx` — ya lee canchas/horarios/productos/precios del
  store real (ver ronda "multigestión"). Sigue recibiendo `onSaveBooking`
  desde `App.jsx`, que arma el booking a partir del objeto legacy que este
  modal todavía produce en `handleSubmit` — migrarlo del todo significa que
  el modal llame `useBookingActions().crear()` directo y `App.jsx` deje de
  necesitar el traductor.
- `DetalleTurnoModal.jsx` — usa `legacyAdapter` para mostrar el turno; el
  CRUD de edición (saldar/cancelar/cantina/editar) ya va directo al store
  desde Fase 4.
- `ClientesCRM.jsx` — solo para **lectura** (crear/editar/borrar ya van
  directo al store desde Fase 4); falta migrar el listado/las stats.

Orden sugerido: `Navbar`/`Sidebar` (ya bastante migrados) → `GrillaTurnos`
→ `NuevoTurnoModal` (terminar de sacarlo de legacyAdapter, ya no depende de
mockData) → `DetalleTurnoModal` → `ClientesCRM` → `CajaCantina` (pulido
visual, ya migrado en datos) → `TurnosFijos` (ídem) → `ReportesAnalytics`
→ `ConfiguracionComplejo` (ya migrado, solo falta el pulido de estilos
inline) → `VistaPublicaJugador` (ídem, ya no depende de mockData).

Cuando los 4 (`GrillaTurnos`, `NuevoTurnoModal`, `DetalleTurnoModal`,
`ClientesCRM`) estén migrados: **borrar `src/store/legacyAdapter.js`
entero** y las importaciones `toLegacyBookings`/`toLegacyClient` en
`App.jsx` (junto con el `useMemo` que las envuelve y el comentario "Capa de
compatibilidad"). Hacerlo componente por componente, no los 4 juntos — es
el cambio de mayor radio de impacto de todo lo que queda.

También en esta fase:
- Grilla en mobile: hoy es una matriz con scroll horizontal (mal en el
  dispositivo donde se demuestra). Pasar a lista vertical por cancha bajo
  `md`, mantener la matriz con columna de hora `sticky` en desktop.
- Grillas fijas (`repeat(3,1fr)` en el picker de método de pago de
  Cantina, por ejemplo) → `repeat(auto-fit, minmax(...))`.
- `CustomSelect.jsx` sigue sin teclado ni roles ARIA, y su dropdown se
  recorta si vive dentro de un modal con `overflow-y:auto` (portalearlo
  resuelve ambos).
- `Modal.jsx` shell reusable (portal, Escape, focus-trap, scroll-lock) —
  hoy cada modal reimplementa `.modal-overlay`/`.modal-content` a mano.
  `ConfirmDialog` ya usa esas clases pero sin portal/focus-trap; sería el
  primer candidato a migrar una vez que exista el shell.

Grep gates:
```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src/components/   # debe dar 0
grep -c "style={{" src/components/*.jsx         # debe bajar a casi 0
grep -rn "mockData" src/components/             # ya da 0 desde la ronda "multigestión"
```

### Fase 6 — Hacer reales las cosas que faltan

- `ReportesAnalytics.jsx` pestaña **"Resumen"** sigue con
  `COURT_DATA`/`CANTINA_TOP`/`WEEK_DATA` hardcodeados (se arregló la
  presentación — labels truncados, plata sin formatear, barras invisibles
  — pero los números en sí siguen siendo de mentira). Las pestañas
  **"Gastos"** y **"Cierre de Caja"**, agregadas en la ronda
  "multigestión", **sí son reales**. Reescribir "Resumen" para calcular
  desde `useBookings`/`useSales`/`useDayKpis` — ojo con no reinventar la
  distinción ingresos-turno vs ingresos-cantina que ya resolvió
  `selectCierreCajaDelDia`, hay que reusarla o replicar el mismo cuidado
  con el doble conteo.
- `VistaPublicaJugador.jsx` ✅ **ya hecho** en la ronda "multigestión" — crea
  booking real (`canal:'web'`) y abre WhatsApp.
- Selector de complejo del Navbar y demás botones sin `onClick` que
  queden tras la Fase 5.

### Fase 7 — Pulido final
Estados vacíos en listas que no los tengan, `prefers-reduced-motion`
(ya global en `index.css`, revisar animaciones nuevas), barrido de
`focus-visible`, botón "Reiniciar datos demo" (`useStoreMaintenance().reiniciarDemo()`
ya existe en el store), export/import JSON en Configuración.

---

## Mapa de archivos clave

```
src/lib/                     utilidades puras — LEER ANTES de reescribir
  date.js                    único lugar donde se permite `new Date`
  pricing.js / format.js / status.js / catalog.js / phone.js / whatsapp.js

src/store/
  index.js                   superficie pública — importar SOLO de acá
                              (nunca de 'store/hooks', 'store/slices/*', etc)
  hooks.js                   TODOS los hooks de lectura/escritura
  selectors.js                selectBookingsForDate, selectIsSlotFree,
                               selectCierreCajaDelDia y selectPagosDelDia
                               (mismo criterio de fecha de pago entre las
                               dos, no lo desincronices), etc.
  slices/expenses.js          gastos — mismo molde que products.js
  legacyAdapter.js             ⚠️ TRANSITORIO — se borra en Fase 5

src/components/
  GrillaTurnos.jsx            ⚠️ usa legacyAdapter (Fase 5)
  NuevoTurnoModal.jsx         ⚠️ usa legacyAdapter (Fase 5) — ya NO importa mockData
  DetalleTurnoModal.jsx       ⚠️ usa legacyAdapter (Fase 5) — CRUD de edición ya ok
  ClientesCRM.jsx             ⚠️ lectura vía legacyAdapter (Fase 5) — CRUD ya va directo
  TurnosFijos.jsx             ✅ store directo, CRUD completo
  CajaCantina.jsx             ✅ store directo, CRUD completo
  ConfiguracionComplejo.jsx   ✅ store directo, canchas editables completas (alta/baja/edición)
  VistaPublicaJugador.jsx     ✅ store directo, reserva real + WhatsApp.
                               Página standalone en /reserva (ver main.jsx) —
                               sacada del panel de admin, ya no es un tab.
  ReportesAnalytics.jsx       ✅ tabs Gastos/Cierre de Caja reales, Exportar PDF
                               real en Cierre de Caja · ⚠️ tab Resumen sigue mock
  NuevoGastoModal.jsx         dual-mode, calcado de NuevoProductoModal.jsx
  NuevoCanchaModal.jsx        dual-mode, calcado de NuevoProductoModal.jsx
  ConfirmDialog.jsx           useConfirm() — sin portal/focus-trap todavía
  LoginScreen.jsx             gate local, sesión en localStorage aparte
  DateNav.jsx                 navegación de fecha + calendario propio
                               (CalendarPopover interno) — ya no usa
                               showPicker() nativo
  VentaExitosaModal.jsx       ✅ ticket se descarga como PDF (exportTicketPDF),
                               ya NO usa window.print()/@media print — ver
                               ronda "zoom Cantina + ticket PDF" más abajo
  Navbar.jsx                  "Vista Pública Web" → <a href="/reserva"
                               target="_blank">, "Centro de Ayuda" → <a> al
                               manual publicado (MANUAL_URL, hardcodeada
                               arriba del componente) — antes ninguno de los
                               dos hacía nada

src/lib/pdfExport.js          exportCierreCajaPDF() (ya existía) +
                               exportTicketPDF() nueva — rollo térmico 80mm,
                               alto dinámico, orientación resuelta a mano
                               (ver regla #12)

tools/
  shot.mjs                    capturas Chrome headless + chequeo overflow
                              (ya inyecta sesión para saltar el login)
  test-persist.mjs            test e2e de persistencia
```

## Reglas que no romper

1. `new Date(...)` solo en `src/lib/date.js`.
2. Nada derivado se almacena — `bookingTotals()`/`selectBookingTotals`
   siempre, nunca un total guardado a mano.
3. Cantina de un turno = `Sale` con `bookingId`, nunca un array embebido.
4. Sin `alert()`/`confirm()` nativos — usar `useConfirm()`.
5. Sin hex hardcodeado en componentes — todo por token.
6. Todo número lleva `.num`.
7. **Importar del store SOLO desde `'../store'`** — nunca de
   `'../store/hooks'`, `'../store/slices/*'`, etc. Rompe el build de forma
   no obvia (ya pasó una vez).
8. **Cualquier ítem de grid/flex que contenga texto sin wrap necesita
   `minWidth:0` explícito** — si no, no se achica por debajo de su
   contenido mínimo y desborda la página. Causa #1 de overflow en este
   proyecto, va a volver a pasar si no se tiene presente.
9. Modales dual-mode (`entidad=null` alta, `entidad=objeto` edición) en vez
   de dos componentes separados — dos componentes garantizan que los
   campos diverjan con el tiempo.
10. Toast con acción: `toast.info(msg, { action: { label, onClick } })` —
    el objeto va anidado bajo `action`, no suelto.
11. **Nunca dejar `animation-fill-mode: both/forwards` en un contenedor
    ancestro de modales** (`.app-main-content` lo tuvo y rompió TODOS los
    `position:fixed` del proyecto — ver "Ronda modales/QR/export/prep
    Supabase" más abajo). Cualquier `transform` residual en un ancestro,
    aunque sea `translateY(0)`, cambia el containing block de sus hijos
    `fixed` de "viewport" a "ese ancestro".
12. **jsPDF con más de una dimensión variable: fijar `orientation` a mano.**
    Con `format:[w,h]` y sin `orientation` explícito, jsPDF asume 'portrait'
    y **da vuelta el papel** si `h < w` — un ticket corto (pocos ítems) queda
    angosto en vez de bajito, y todo lo alineado a la derecha se corta fuera
    de la hoja. Pasó en `exportTicketPDF` (`pdfExport.js`): se ve bien con
    contenido largo (por casualidad ya sale "portrait") y roto con poco
    contenido. Fix: `orientation: alto >= ancho ? 'portrait' : 'landscape'`.
13. **`touch-action: manipulation` en `html` no es opcional en una app con
    tarjetas cliqueables repetidas** (Cantina: tocás el mismo producto
    varias veces para sumar unidades). Sin eso, Chrome Android lee el
    segundo tap como doble-tap → zoom de página real (no cosmético): todo
    se ve "gigante como en PC", y como el zoom cambia el layout viewport,
    los modales `position:fixed` se posicionan mal encima. No confundir con
    el bug de la regla #11 (ese es un `transform` que rompe el *containing
    block*; este es el navegador zoomeando la página entera — el nav sigue
    presente en el video/captura, solo que gigante, esa es la señal para
    distinguirlos).

## Cómo verificar que algo no se rompió

```bash
npx oxlint src              # no "npm run lint" (hook rtk lo intercepta)
npx vitest run              # 70 tests, deben seguir en verde
npm run build                 # debe compilar
node tools/shot.mjs           # capturas + overflow check en 390/768/1440 + 320
```

Para cualquier feature de CRUD nueva, verificar con Puppeteer de verdad
(no solo que compile) — el patrón usado en esta sesión: abrir la app con
sesión inyectada, click en los botones reales via `page.evaluate`, y
chequear el DOM resultante. Ver los commits de esta sesión (`git show
<hash>` de los últimos 4) si hace falta un ejemplo del patrón completo.

---

## Ronda "modales/QR/export/prep Supabase"

Usuario probó el demo y mandó 4 capturas + una lista de arreglos puntuales.
Resumen de lo que se tocó:

**Ícono invisible en varios modales (Nuevo Gasto, etc.)** — causa raíz: a
`src/index.css` le faltaba el alias corto `--text-secondary` (solo existía
`--color-text-secondary`, sin acortar como sus hermanos `--text-primary`/
`--text-muted`/`--text-faint`). Un `stroke: var(--text-secondary)` con la
variable indefinida cae al valor inicial `none` → ícono invisible. Una sola
línea de fix en el alias block, arregla los 5 archivos que usaban esa
variable de un saque.

**Dropdowns nativos sin estilo** — quedaban 2 `<select>` crudos en todo el
proyecto: "Asignar Venta A" en `CajaCantina.jsx` y el `NativeSelect` interno
de `TurnosFijos.jsx` (usado 3 veces). Los dos reemplazados por
`CustomSelect.jsx`, que ya es el único dropdown estilizado del proyecto.

**Modal "Nuevo Producto" aparecía fuera de vista (bug real, no solo ese
modal)** — la causa NO estaba en `NuevoProductoModal.jsx`. `<main
className="app-main-content animate-enter">` tenía `animation: enter-up
0.32s ... both`, y el keyframe `to` fija `transform: translateY(0)`. Con
`fill-mode: both` ese transform queda pegado en el elemento para siempre
después de que la animación termina — y **cualquier** transform en un
ancestro, aunque sea `translateY(0)` (visualmente un no-op), cambia el
containing block de sus descendientes `position:fixed` de "viewport" a "ese
ancestro". En páginas cortas casi no se nota; en Cantina, con una grilla
larga de productos, `.app-main-content` es altísimo y el modal terminaba
anclado a ese alto total, lejos del scroll real. Fix: sacar `both` del
`animation` shorthand en `.animate-enter` (`index.css`). Esto arregla **todos**
los modales del proyecto, no solo el de productos — ver regla #11 arriba.
Diagnosticado midiendo `getBoundingClientRect()` real con Puppeteer antes de
tocar nada (antes del fix: `top:-1128, height:1972` en vez de `top:0,
height:844` — el alto de la página completa en vez del viewport).

**Vista Pública / QR** — sacada del panel de administración (comentada en
`Sidebar.jsx` y en la rama de `App.jsx`, no borrada) y movida a su propia
página en `/reserva`. `src/main.jsx` decide con `window.location.pathname`
si renderiza `<App/>` o `<VistaPublicaJugador/>` standalone — ambas dentro
del mismo `<StoreProvider>` porque el componente depende de sus hooks
(`useConfig`, `useCanchasActivas`, `useBookingActions`). `VistaPublicaJugador.jsx`
perdió el header "Vista previa..." (era texto para el dashboard, no tiene
sentido en la página real que ve el cliente) y ahora ocupa toda la pantalla
centrada. El QR real (antes era un ícono + texto fijo `tucan.app/maracana`,
decorativo) vive ahora en **Configuración → Complejo**, sección "Reserva
Online" (`EnlaceReservaPublica` dentro de `ConfiguracionComplejo.jsx`):
genera el QR client-side con la librería `qrcode` apuntando a
`${location.origin}/reserva`, más botón de copiar el link.

**Export PDF real en Cierre de Caja** — el botón "Exportar" no tenía
`onClick` y encima vivía en el tab "Resumen", que renderiza datos mock
(`COURT_DATA`/`CANTINA_TOP`/`WEEK_DATA`, no conectados al store todavía). Se
sacó de ahí y se puso en el tab "Cierre de Caja", que sí tiene datos reales.
Nuevo `src/lib/pdfExport.js` con `exportCierreCajaPDF(...)` (usa `jspdf`,
100% client-side): arma un PDF con nombre/dirección/teléfono del complejo,
los 4 KPIs del día y las 3 listas itemizadas (turnos cobrados, ventas de
mostrador, gastos). Mismo dato que ya se ve en pantalla, ninguna cuenta
nueva.

**Prep para Supabase — solo scaffolding, nada wireado todavía.** El usuario
pidió dejar el terreno listo sin tocar el comportamiento actual (el demo
sigue 100% sobre localStorage). Se agregó:
- `src/store/repository/supabaseRepo.js` — esqueleto con el mismo contrato
  que `localStorageRepo.js` (ver `repository/README.md`), cada función con
  su `// TODO`, **no importado desde ningún lado**.
- `.env.example` — placeholders `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  (ya estaba contemplado en `.gitignore` con `!.env.example`). No se creó
  `.env` real ni se instaló `@supabase/supabase-js` — eso se hace recién el
  día que se conecte de verdad.
- Mapeo para ese día: cada slice de `PERSIST_WHITELIST` en `schema.js`
  (`canchas`, `bookings`, `clients`, `products`, `turnosFijos`, `sales`,
  `expenses`) → una tabla, mismo shape que el array actual. `config` es un
  objeto único anidado, necesita tabla de una sola fila (o key/value), no
  un array. `meta`/`schemaVersion` deja de tener sentido con un backend real
  (las migraciones pasan a ser de la base). El reducer ya tiene la acción
  `store/hydrate` pensada para carga async — falta que `StoreProvider` llame
  `repo.load()` y muestre un loading state mientras resuelve, el README de
  `repository/` ya lo documenta como seam pendiente.

---

## Ronda "Cantina mobile + deploy" (previa a esta)

Usuario ya tenía el repo en GitHub (`infocodearg-hub/tucan`) y pidió dejarlo
listo para Vercel + mandarlo a sus socios. Además reportó 4 bugs puntuales
con capturas.

- **Historial de ventas tapaba el ticket en mobile** — `.pos-grid` pasó a
  `grid-template-areas` explícito (`"catalog" "ticket" "historial"` en
  mobile, reordenado a 2 columnas desde 1100px) para que el orden visual no
  dependa del orden del DOM. Los 3 hijos de `.pos-grid` llevan
  `pos-grid-catalog`/`pos-grid-ticket`/`pos-grid-historial`.
- **Íconos rotos en Reportes → Gastos** — la fila de cada gasto pasó de una
  línea a dos (concepto arriba, fecha+categoría+acciones abajo) para que los
  botones de editar/borrar no compitieran por espacio con el badge de fecha.
- **Label desalineado en Nuevo Turno** — `"Nombre del Cliente / Equipo *"`
  se envolvía a 2 líneas y desalineaba el input contra "Teléfono WhatsApp".
  Acortado a `"Cliente / Equipo *"`.
- **Ticket itemizado** — primera versión del ticket de venta, con ítem por
  línea, precio unitario, nombre del complejo. Esta versión imprimía con
  `window.print()` + portal + `@media print` — **reemplazada por completo**
  en la ronda siguiente (ver abajo) porque salía en blanco en Chrome Android.
- **Deploy**: `vercel.json` con rewrite SPA (`/reserva` necesita esto, sin
  rewrite Vercel devuelve 404 en cualquier ruta que no sea `/`), sección
  "Deploy" en `README.md`, remote de GitHub conectado y pusheado.
- **Demo poblada**: `mockData.js`/`seed.js` con más turnos/clientes/gastos,
  todos con `dayOffset` relativo a "hoy" (nunca fechas literales) para que
  la demo no se vea vacía en ningún día que se abra. De paso se corrigió un
  bug real en `schema.js` (`createInitialState()` hacía `...seed, expenses:
  []`, pisando el `expenses` sembrado — cambiado a `expenses: seed.expenses
  ?? []`).
- **Manual de usuario**: Artifact HTML publicado, link en la sección de
  abajo (es el mismo que ahora enlaza "Centro de Ayuda" en el navbar).

---

## Ronda "zoom Cantina + ticket PDF" (la más reciente)

Usuario mandó un **video con audio** mostrando el bug desde el celular real
("entro a Cantina y se ve como si fuera desktop, gigante"). Sin herramienta
de transcripción de audio disponible, se extrajeron frames con `ffmpeg`
(`fps=1.5`) y se leyeron como imágenes — el video mostró el bottom-nav de la
app *presente pero gigante* y la página paneable horizontalmente, lo cual
descarta un bug de CSS/breakpoint (ahí el nav directamente desaparecería o
el layout cambiaría de estructura) y apunta a zoom real de página.

**Bug 1 — zoom por doble-tap en Cantina.** Causa: en Cantina se toca la
misma tarjeta de producto varias veces seguidas para sumar unidades al
carrito — es la única pantalla de la app con ese patrón de tap repetido en
el mismo punto. Chrome Android interpreta el segundo tap rápido como
doble-tap y zoomea la página (nada de esto es cosmético: es el navegador
cambiando el layout viewport de verdad, por eso después "cuando le doy a
confirmar venta se abre super mal el modal" — el modal `position:fixed` se
posiciona mal porque el viewport visual ya no coincide con el layout
viewport). Fix de una línea: `touch-action: manipulation` en `html`
(`index.css`) — mata el doble-tap-zoom, el pinch manual con dos dedos sigue
andando (no se usó `user-scalable=no`, eso rompe accesibilidad). Ver regla
#13. De paso, `.pos-grid-historial` era el único hijo de `.pos-grid` sin
`min-width:0` (regla #8) — corregido aunque no era la causa de este bug en
particular.

Diagnóstico verificado con Puppeteer real (`isMobile:true, hasTouch:true`,
Android UA) en 320/360/375/390/412px sobre el build de producción: sin el
fix, cero overflow de documento a ningún ancho — confirmando que el bug
nunca fue overflow de CSS, sino zoom de navegador. Con el fix, se repitió
el mismo test y quedó igual de limpio.

**Bug 2 — ticket salía en blanco al "imprimir".** Causa: `window.print()`
sobre un portal oculto con `@media print` funciona en Chrome de escritorio
pero no en el "Guardar como PDF" de Android — ese flujo arma su propia
instantánea de la página y el nodo que solo existía en el media `print` no
siempre entraba, dando una hoja vacía (a veces duplicada, según cómo
paginaba). Fix: se dejó de depender del print del navegador — nuevo
`exportTicketPDF(sale)` en `pdfExport.js` arma el PDF a mano con jsPDF
(misma librería que ya usaba `exportCierreCajaPDF`), rollo térmico de 80mm
de ancho con alto dinámico (el pedido crece el papel, no salta de página).
`VentaExitosaModal.jsx` perdió el portal de impresión y el `@media print`
de `index.css` — ya no existen, todo el archivo quedó ~50 líneas más corto.
Botón pasó de "Imprimir Ticket" a "Descargar Ticket".

**Bug 3 — ticket con pocos ítems salía cortado** (encontrado por el usuario
después del fix del Bug 2, con una venta de 3 ítems real). Causa: ver regla
#12 — jsPDF con `format:[80, alto]` y sin `orientation` explícito asume
'portrait' y da vuelta el papel cuando `alto < 80`, angostándolo a
~68mm mientras el texto seguía alineado a 74mm. Fix: `orientation: alto >=
80 ? 'portrait' : 'landscape'`. Verificado con 1/3/6 ítems (cruza el punto
exacto donde el alto pasa de menor a mayor que 80mm): las tres hojas salen
de 80mm de ancho, 1 sola página cada una.

**Enlaces muertos en el menú de perfil** — "Vista Pública Web" llamaba
`navSetTab('vista_publica')`, un tab que quedó comentado desde que esa vista
se mudó a `/reserva` (ronda "modales/QR"); no hacía nada. "Centro de Ayuda"
no tenía ni `onClick`. Los dos pasaron a ser `<a target="_blank"
rel="noopener noreferrer">`: el primero a `/reserva` (misma URL que el QR de
Configuración), el segundo a `MANUAL_URL` (constante arriba de
`Navbar.jsx`) — el manual de usuario Artifact ya publicado en la ronda
anterior. Se sumó `text-decoration:none` a `.dropdown-item` en `index.css`
para que el `<a>` no saliera subrayado entre los `<button>` del mismo menú.

**Metodología a repetir**: cuando un bug mobile no reproduce con overflow de
CSS ni con las herramientas de siempre, medir con Puppeteer en vez de leer
código a ciegas — mismo criterio que la regla #11. Y cuando el usuario manda
video, extraer frames con `ffmpeg` en vez de intentar leer el binario
directo (el tool de lectura de archivos no soporta `.mp4`).

Dependencias nuevas: `qrcode`, `jspdf` (ambas 100% client-side, sin backend).
