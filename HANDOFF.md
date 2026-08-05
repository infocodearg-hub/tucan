# TuCan — Handoff para continuar el trabajo

Estado real del repo al momento de escribir esto: **Fases 0 a 4 completas +
CRUD total (clientes, productos, turnos fijos, turnos) + fixes de
responsive.** Build limpio, 70/70 tests verdes, verificado con Puppeteer
real (no solo compila — se probó crear/editar/borrar/deshacer de punta a
punta en el navegador). Nada sin commitear.

```bash
git log --oneline
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
npx oxlint src            # 17 warnings preexistentes, ninguno bloqueante
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

**3 componentes siguen sin migrar al store directo**, hablan a través de
`src/store/legacyAdapter.js`:
- `GrillaTurnos.jsx` — recibe `bookings` como prop (shape legacy) desde
  `App.jsx`.
- `NuevoTurnoModal.jsx` — **ojo**: además de legacyAdapter, todavía importa
  `COMPLEX_INFO`/`TIME_SLOTS`/`CANTINA_PRODUCTS` **directo de
  `data/mockData.js`** para sus selectores de cancha/horario/cantina. Esto
  significa que si alguien agrega o edita una cancha desde Configuración,
  el modal de nuevo turno **no lo va a reflejar** — sigue mostrando las 3
  canchas hardcodeadas de la demo. Es el bug más importante que queda sin
  tocar; edita canchas desde Configuración y confirmá el síntoma antes de
  arrancar.
- `ClientesCRM.jsx` — solo para **lectura** (crear/editar/borrar ya van
  directo al store desde Fase 4); falta migrar el listado/las stats.

Orden sugerido: `Navbar`/`Sidebar` (ya bastante migrados) → `GrillaTurnos`
→ `NuevoTurnoModal` (arreglar el bug de mockData de paso) →
`DetalleTurnoModal` → `ClientesCRM` → `CajaCantina` (pulido visual, ya
migrado en datos) → `TurnosFijos` (ídem) → `ReportesAnalytics` →
`ConfiguracionComplejo` → `VistaPublicaJugador`.

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
grep -rn "mockData" src/components/             # debe dar 0 (hoy: NuevoTurnoModal.jsx)
```

### Fase 6 — Hacer reales las cosas que faltan

- `ReportesAnalytics.jsx` sigue con `COURT_DATA`/`CANTINA_TOP`/`WEEK_DATA`
  hardcodeados (se arregló la presentación — labels truncados, plata sin
  formatear, barras invisibles — pero los números en sí siguen siendo de
  mentira). Reescribir para calcular desde `useBookings`/`useSales`/
  `useDayKpis`.
- `VistaPublicaJugador.jsx`: el flujo de reserva pública no crea ningún
  booking real ni abre WhatsApp — solo cambia a una pantalla de éxito.
  Conectar a `useBookingActions().crear()` con `canal:'web'` +
  `waLink()` de `lib/whatsapp.js`.
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
  selectors.js                selectBookingsForDate, selectIsSlotFree, etc.
  legacyAdapter.js             ⚠️ TRANSITORIO — se borra en Fase 5

src/components/
  GrillaTurnos.jsx            ⚠️ usa legacyAdapter (Fase 5)
  NuevoTurnoModal.jsx         ⚠️ usa legacyAdapter + importa mockData directo (Fase 5)
  DetalleTurnoModal.jsx       ⚠️ usa legacyAdapter (Fase 5) — CRUD de edición ya ok
  ClientesCRM.jsx             ⚠️ lectura vía legacyAdapter (Fase 5) — CRUD ya va directo
  TurnosFijos.jsx             ✅ store directo, CRUD completo
  CajaCantina.jsx             ✅ store directo, CRUD completo
  ConfiguracionComplejo.jsx   ✅ store directo
  ConfirmDialog.jsx           useConfirm() — sin portal/focus-trap todavía
  LoginScreen.jsx             gate local, sesión en localStorage aparte
  DateNav.jsx                 navegación de fecha, ya completo

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
