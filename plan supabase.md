# TuCan — Persistencia real en Supabase, auth y multi-tenant

## Contexto

Hoy la app corre 100% sobre `localStorage` con una sola clave global
(`tucan:state:v1`) y un login de mentira (`config.acceso = { usuario:'admin',
password:'tucan' }` guardado en texto plano dentro del mismo blob). Eso alcanza
para demo, pero no para entregarle una cuenta a cada complejo: los datos no
sobreviven a un cambio de dispositivo, dos personas del mismo complejo no ven lo
mismo, y todas las cuentas compartirían el mismo almacenamiento del navegador.

El objetivo de esta etapa es dejar la app lista para producción multi-tenant:
cada complejo con su cuenta, sus datos aislados a nivel base de datos (no solo a
nivel UI), login real de Supabase sin registro público, y una superficie de API
para que el bot de n8n pueda anotar turnos más adelante sin abrir un agujero.

La arquitectura actual ya está preparada para esto y no hay que rehacerla:

- `src/store/repository/` ya define el contrato de repositorio y `StoreProvider`
  solo conoce esa interfaz — nunca `localStorage` directo.
- El reducer es puro y ya funciona como "apply optimista local"
  (`src/store/reducer.js`, `crossSlice.js`).
- Los IDs se generan en el cliente con prefijo de dominio (`src/lib/id.js`,
  36^10 de entropía) — sirven como claves primarias de texto, así que una
  escritura optimista no necesita esperar un id del servidor.
- **No hace falta terminar la Fase 5 (`legacyAdapter`) antes.** El repositorio
  vive por debajo de los componentes; las dos cosas no se tocan.

**Decisiones tomadas con el usuario:** login por email real + contraseña; roles
dueño/empleado con permisos configurables por el dueño desde Configuración;
`/reserva` pública sigue viva pero escribiendo a través de una Edge Function
(el navegador anónimo nunca escribe directo en la base); cuentas nuevas
arrancan vacías con un wizard de alta; esquema versionado con Supabase CLI.

---

## Fase A — Base de datos: esquema, RLS y migraciones

`supabase/migrations/*.sql`, versionado en git (Supabase CLI).

### Tablas

| Tabla | Notas |
|---|---|
| `tenants` | `id uuid pk`, `slug text unique` (para `/reserva/<slug>`), `nombre`, `activo`, `onboarding_completo`, `created_at` |
| `memberships` | pk `(user_id, tenant_id)`, `rol` enum `dueno`/`empleado`, `permisos jsonb`, `nombre_mostrado` |
| `tenant_config` | 1 fila por tenant: `complejo/pagos/operacion/integraciones` como `jsonb`. **`acceso` no existe más.** |
| `canchas` | `id text`, `tenant_id`, + campos de `seed.js` (`nombre, subtitulo, deporte, precio_dia, precio_noche, color, activa, orden`) |
| `clients` | + `historico_previo jsonb`, `etiquetas jsonb` |
| `products` | igual que el slice |
| `bookings` | sin `pagos[]` embebido (ver `payments`) |
| `payments` | tabla propia: `booking_id`, `monto`, `metodo`, `fecha`, `nota`. Es plata: merece filas reales, no un JSON adentro del turno |
| `sales` | `items jsonb` — el ítem ya es un snapshot de precio inmutable, denormalizarlo es correcto |
| `turnos_fijos` | `estado_por_mes jsonb`, `excepciones jsonb` |
| `expenses` | igual que el slice |
| `tenant_api_keys` | `tenant_id`, `key_hash` (SHA-256), `nombre`, `activo`, `last_used_at` — para n8n (Fase G) |

Reglas de integridad que importan:

- Todas las tablas de datos: `tenant_id uuid not null`, `unique (tenant_id, id)`.
- **FKs compuestas**: `bookings (tenant_id, cancha_id) references canchas (tenant_id, id)`.
  Hace estructuralmente imposible referenciar una cancha de otro complejo.
- **Índice único parcial anti doble-reserva**:
  `unique (tenant_id, cancha_id, fecha, hora) where estado <> 'cancelado'`.
  Esta es la defensa real: el guard de `crossSlice.js` es de cliente y no
  protege contra panel + web pública + bot escribiendo a la vez.
- Índices de lectura: `bookings(tenant_id, fecha)`, `sales(tenant_id, fecha_hora)`,
  `expenses(tenant_id, fecha)`, `payments(tenant_id, fecha)`.

### Helpers y RLS

```sql
-- STABLE + SECURITY DEFINER + search_path fijo
public.current_tenant_id() -> uuid
public.is_dueno()          -> boolean
public.has_perm(p text)    -> boolean   -- dueño: siempre true
```

- RLS `enable` + `force` en **todas** las tablas; cero políticas para `anon`.
- Política base por tabla: `using (tenant_id = (select public.current_tenant_id()))`
  y el mismo predicado en `with check`. El `(select ...)` no es cosmético:
  hace que Postgres lo evalúe una vez por statement y no por fila.
- `tenant_id` con `default public.current_tenant_id()` — el cliente nunca lo manda.
- `tenant_config` y `memberships`: escritura solo si `is_dueno()`.
- `expenses`: escritura y lectura requieren `has_perm('gestionar_gastos')`.

**Límite honesto de los permisos, a documentar en el código:** lo que se puede
hacer cumplir en la base es el acceso a gastos, a la configuración y a la
gestión de usuarios. "Ver Reportes" o "ver totales" es gating de UI, porque los
turnos y las ventas crudas son necesarios para operar la caja — un empleado con
acceso a la app siempre podría sumarlos por su cuenta. No se vende como
seguridad lo que es una comodidad de interfaz.

### Provisión de cuentas

Función `public.provision_tenant(nombre, slug, user_id)` (service_role): crea
tenant + `tenant_config` vacío + membership `dueno`. Se invoca desde el SQL
editor o un script `tools/provision.mjs`, nunca desde el front.

---

## Fase B — Auth en el cliente

- `npm i @supabase/supabase-js`. `src/lib/supabase.js` crea el cliente con
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`persistSession`,
  `autoRefreshToken`, `detectSessionInUrl:false`).
- `src/auth/AuthProvider.jsx` nuevo, por **fuera** de `StoreProvider` en
  `src/main.jsx`: expone `{ session, user, tenant, rol, permisos, loading,
  signIn, signOut }`, escucha `onAuthStateChange`, y al haber sesión resuelve la
  membership (tenant + rol + permisos).
- `LoginScreen.jsx` se reescribe: email + contraseña contra
  `signInWithPassword`. Se borran `hasActiveSession`/`saveSession`/
  `clearSession` y la clave `tucan_session_v1`; se borra el cartel
  "Demo: admin / tucan". Se agrega "Olvidé mi contraseña"
  (`resetPasswordForEmail`) + página `/recuperar`.
- `App.jsx`: el gate `useState(hasActiveSession())` pasa a leer `AuthProvider`;
  `onLogout` llama `signOut()` **y purga la caché local del tenant**.
- En el panel de Supabase: **deshabilitar el registro público** (Auth →
  Providers → Email → *Allow new users to sign up* = off), activar protección
  de contraseñas filtradas (HIBP) y rotación de refresh tokens.
- `tools/shot.mjs` y `tools/test-persist.mjs` inyectan hoy `tucan_session_v1`;
  hay que actualizarlos a inyectar una sesión de Supabase o apuntar a un usuario
  de prueba, si no todas las capturas quedan trabadas en el login.

---

## Fase C — Repositorio Supabase (el corazón de la etapa)

Archivos: `src/store/repository/supabaseRepo.js` (hoy esqueleto),
`mappers.js` (nuevo), `diff.js` (nuevo).

**Estrategia de escritura: diff por slice, no un mapper por acción.** Es la
decisión clave y no es arbitraria: los efectos que cruzan slices no están en el
payload de la acción (`SALE_CREATE` además baja stock de `products`;
`CLIENT_DELETE` limpia la FK en `bookings` y `turnosFijos`; el reducer genera el
`id` del booking adentro, no en el action creator). Comparar `prevState` contra
`nextState` slice por slice captura todo eso sin duplicar reglas de negocio.
Además es exactamente el contrato `save(next, prev)` que
`repository/README.md` ya había previsto.

- `diffSlice(prev, next)` → `{ inserted, updated, deleted }` por id. Funciones
  puras, testeables con vitest sin red.
- `mappers.js`: `toRow`/`fromRow` por entidad (camelCase JS ↔ snake_case SQL).
  Nada de columnas entrecomilladas en Postgres. `booking.pagos[]` se aplana a
  filas de `payments` al escribir y se re-anida al leer, para que ni selectores
  ni componentes se enteren del cambio.
- `save()` encola en una **cola serial** (una promesa encadenada) para que dos
  cambios rápidos no lleguen desordenados. Al fallar: toast de error + estado
  "sin conexión" + reintento; si el error es violación del índice único de slot,
  se hace `load()` completo y se avisa que el turno ya lo tomó otro — resincronizar
  es más honesto que un rollback parcial inventado.
- `load()`: una consulta por tabla, ensamblado al shape exacto de
  `createInitialState()`. **Ventana de 180 días** en `bookings`/`sales`/
  `payments`/`expenses` para que la carga inicial no crezca sin techo; queda
  documentado como el punto a tocar el día que Reportes necesite histórico largo.
- `loadSync()` devuelve la **caché local del tenant** (`tucan:cache:<tenantId>`)
  para que la app pinte al instante, y `load()` la reconcilia. La clave global
  `tucan:state:v1` de hoy desaparece: es una fuga entre cuentas en una PC
  compartida.
- `StoreProvider.jsx`: recibe `tenantId`, muestra splash mientras resuelve
  `load()`, despacha `store/hydrate` (la acción ya existe en `actions.js`), y
  limpia todo al desmontar/cerrar sesión.
- **Realtime**: canal por tenant con filtro `tenant_id=eq.<id>` → `load()`
  con debounce de ~400ms. Así un turno cargado por el bot o por el otro empleado
  aparece solo. Ignorar el eco de las escrituras propias comparando el resultado
  antes de hidratar (hidratar con un estado idéntico dispara re-render inútil).

---

## Fase D — Roles y permisos configurables

- Capacidades (claves en `memberships.permisos`): `gestionar_turnos`,
  `gestionar_turnos_fijos`, `vender_cantina`, `gestionar_productos`,
  `gestionar_clientes`, `gestionar_gastos`, `ver_reportes`,
  `eliminar_registros`. **Configuración y gestión de usuarios: solo dueño, no
  configurable** — si el empleado pudiera editar permisos, el rol no significa nada.
- `ConfiguracionComplejo.jsx`: sub-sección nueva "Usuarios y permisos" (visible
  solo para el dueño), con la lista de miembros y un toggle por capacidad.
  Reusa el patrón `.tab-switcher`/`.tab-btn` que ese archivo ya adoptó.
- `usePermisos()` en el AuthProvider + gating en `Sidebar.jsx`, `Navbar.jsx`,
  el bottom-nav de `App.jsx` y los botones de borrado. Un tab sin permiso no se
  renderiza (no se muestra deshabilitado).
- Edge Function `invitar-miembro`: el dueño autenticado da de alta a su empleado
  (Admin API del lado del servidor). Sin esto el dueño depende de nosotros para
  sumar gente.

---

## Fase E — Wizard de alta

`src/components/OnboardingWizard.jsx`, se muestra cuando
`canchas.length === 0`. Pasos: datos del complejo → canchas (nombre, deporte,
precio día/noche) → horarios (`config.operacion.slots`) → datos de cobro
(alias/CBU). Al terminar marca `tenants.onboarding_completo` y despacha las
acciones del store que ya existen (`createCancha`, `updateConfig`) — cero
lógica de escritura nueva.

---

## Fase F — Vista pública `/reserva` sin exponer la base

- Ruta pasa a `/reserva/<slug>`; `src/main.jsx` extrae el slug del pathname
  (ya hace un chequeo de `pathname`, se extiende). `vercel.json` ya reescribe SPA.
- Edge Function `public-reserva`, la única que toca la base para esta página:
  - `GET ?slug=&fecha=` → canchas activas + slots libres. Solo campos públicos
    (jamás CBU, alias, teléfono del dueño ni datos de otros clientes).
  - `POST` → crea el turno con `canal:'web'`. Rate limit por IP + validación
    server-side; el conflicto de horario lo resuelve el índice único parcial,
    no un `select` previo (que sería una condición de carrera).
  - CORS restringido al dominio de la app.
- `VistaPublicaJugador.jsx` deja de usar `useCanchasActivas`/`useBookingActions`
  y pasa a `fetch` contra la función. Deja de necesitar `StoreProvider`.
- El QR de Configuración pasa a apuntar a `${origin}/reserva/<slug>`.
- Se mantiene el estado `reservado` para estas reservas (no se agrega un estado
  `pendiente` nuevo): tocar el enum obligaría a revisar `status.js`, selectores y
  la grilla, y no es lo que se pidió ahora. Queda anotado como opción futura.

---

## Fase G — Superficie para el bot de n8n

Edge Function `bot`, autenticada con `x-api-key` verificada contra
`tenant_api_keys.key_hash`. La `service_role` vive solo dentro de la función,
nunca en n8n ni en el front. Endpoints: disponibilidad de un día, crear turno,
buscar cliente por teléfono, listar turnos del día. Rate limit por API key.
En Configuración: generar/revocar la clave (se muestra una sola vez).

Con esto la app queda lista para armar el flujo de n8n sin volver a tocar la base.

---

## Fase H — Hardening y verificación

Checklist de seguridad. **`[x]` significa verificado, no "escrito".** Un
checklist que se tilda solo porque el código existe es peor que no tenerlo: da
por cubierto algo que nadie miró.

Verificado leyendo el código:

- [x] `service_role` no aparece en ningún archivo de `src/` ni en el bundle.
- [x] RLS `enable` + `force` en todas las tablas; ninguna política para `anon`.
- [x] Funciones `SECURITY DEFINER` con `search_path` fijo y `revoke execute` a `anon`.
- [x] `config.acceso` eliminado del modelo, de `seed.js` y de `Navbar.jsx`.
- [x] Caché local con clave por tenant y purga en `signOut`. (Tenía una fuga: el
      `flush()` del desmontaje de `StoreProvider` reescribía la caché justo
      después de purgarla. Corregido.)
- [x] `.env` fuera de git, `.env.example` actualizado.

Pendiente hasta probar contra el proyecto real — no se puede verificar leyendo
código:

- [ ] Registro público deshabilitado en el panel de Supabase. `config.toml` solo
      vale para el entorno local; el proyecto de la nube se configura aparte.
- [ ] Protección de contraseñas filtradas (HIBP) activa en el panel.
- [ ] Site URL y Redirect URLs configuradas (si no, el mail de recuperación no
      vuelve a la app).
- [ ] Prueba cruzada real: dos cuentas en dos navegadores. Con el `id` de un
      registro de la cuenta A, intentar leerlo y editarlo desde la sesión B →
      debe fallar en la base, no simplemente no mostrarse.
- [ ] Doble reserva simultánea del mismo slot (panel + Edge Function a la vez) →
      una gana, la otra recibe error claro (índice único parcial `23505`).
- [ ] Cerrar sesión no deja ninguna clave `tucan:cache:*` en `localStorage`.

Verificación funcional:

```bash
npx vitest run          # 70 tests actuales + los nuevos de diff/mappers, en verde
npm run build           # debe compilar
npx oxlint src          # sin warnings nuevos
node tools/shot.mjs     # capturas + overflow (actualizado a la sesión de Supabase)
supabase db reset       # las migraciones deben aplicar limpias desde cero
```

Más un pase con Puppeteer real sobre el build de producción: login → crear turno
→ F5 → el turno sigue → logout → login con la otra cuenta → no aparece nada de
la primera. Compilar no es verificar, mismo criterio que las rondas anteriores.

---

## Archivos críticos

**Nuevos**: `supabase/migrations/*.sql`, `supabase/functions/{public-reserva,bot,invitar-miembro}/`,
`src/lib/supabase.js`, `src/auth/AuthProvider.jsx`,
`src/store/repository/{mappers.js,diff.js}`, `src/components/OnboardingWizard.jsx`,
`tools/provision.mjs`.

**Reescritos**: `src/store/repository/supabaseRepo.js` (hoy es un esqueleto con
TODOs), `src/components/LoginScreen.jsx`, `src/components/VistaPublicaJugador.jsx`.

**Modificados**: `src/store/StoreProvider.jsx` (hidratación async + splash +
realtime), `src/main.jsx` (AuthProvider + ruta con slug), `src/App.jsx` (gate de
auth + gating por permisos), `src/store/schema.js` y `src/data/seed.js` (sacar
`acceso`, seed solo para desarrollo), `src/components/ConfiguracionComplejo.jsx`
(usuarios/permisos, API key del bot, QR con slug), `src/components/Navbar.jsx`,
`src/components/Sidebar.jsx`, `.env.example`, `README.md`, `HANDOFF.md`.

**Sin tocar**: `hooks.js`, `selectors.js`, `reducer.js`, `crossSlice.js`,
`slices/*`, `lib/*` y los componentes de CRUD. Ese es justamente el punto del
seam de repositorio, y es la razón por la que la Fase 5 (`legacyAdapter`) puede
seguir pendiente sin bloquear nada de esto.

## Orden de ejecución

A → B → C son secuenciales y son el 70% del trabajo (sin ellas no hay nada que
probar). D, E, F, G se pueden entregar y revisar de a una. H se verifica al
final pero cada ítem se va cumpliendo en su fase.
