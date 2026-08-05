# TuCan — Gestión de complejos de canchas

SaaS de gestión para complejos deportivos argentinos: grilla de turnos, turnos fijos,
caja/POS de cantina, CRM de clientes, reportes y vista pública de reserva para el jugador.

**Stack:** React 19 · Vite 6 · Tailwind CSS v4 · lucide-react. Sin backend: el estado vive
en un store propio persistido en `localStorage`, con una costura de repositorio lista para
migrar a una API real (Supabase) sin tocar componentes.

## Comandos

```bash
npm install
npm run dev            # servidor de desarrollo
npm run dev -- --host  # accesible desde el celular en la misma red
npm run build          # build de producción a dist/
npm run preview        # sirve el build

npm run lint           # oxlint
npm run format         # prettier --write
npm test               # vitest (lógica pura)
npm run check          # lint + test + build
```

> Si `npm run lint` devuelve un error de parseo de JSON, es el proxy `rtk` interceptando
> el script. Correr `npx oxlint src` directamente.

## Estructura

```
src/
  lib/          utilidades puras y sin estado — la base de todo
    date.js       ÚNICO archivo donde se permite construir `new Date`
    pricing.js    día/noche, seña, totales derivados de un turno
    format.js     moneda ARS, números, porcentajes
    phone.js      normalización de teléfonos argentinos a E.164
    whatsapp.js   links wa.me + plantillas de mensajes
    status.js     enums, etiquetas y variantes visuales
    catalog.js    categorías e íconos de cantina
    validate.js   validadores de formulario
    id.js         IDs con prefijo (sin `crypto.randomUUID`, que falla fuera de HTTPS)
  store/        estado global: reducer por slices + persistencia
  components/   vistas y UI
  data/         fixtures de demo y su normalización
```

## Reglas del proyecto

Están para evitar que vuelvan bugs que ya costaron caro:

1. **`new Date(...)` solo dentro de `src/lib/date.js`.** Las fechas de negocio son strings
   `YYYY-MM-DD`. `new Date('2026-08-04')` se parsea como UTC medianoche y en Argentina
   (UTC−3) se muestra como el día anterior.
2. **Nada derivado se almacena.** El total de un turno, su saldo y su estado de pago se
   calculan siempre con `bookingTotals()`. Guardarlos garantiza que se desincronicen.
3. **La cantina cargada a un turno son `Sale` con `bookingId`**, nunca un array dentro del
   turno. Una sola fuente de verdad para que el mismo peso no se cuente dos veces.
4. **Sin `alert()` ni `confirm()` nativos.** Usar `useConfirm()` y el sistema de toasts.
5. **Sin colores hexadecimales en componentes.** Todo sale de los tokens de `@theme`.
6. **El glow verde vive en una sola clase: `.btn-primary`.** Nada más brilla.
7. **Todo número (plata, hora, porcentaje) lleva la clase `.num`** para tener cifras
   tabulares y que no bailen al actualizarse.

## Deploy

SPA pura, sin backend — build estático servible en cualquier hosting.

1. Push a GitHub (rama `master`/`main`).
2. En [vercel.com](https://vercel.com): "Add New… → Project" → importar el repo.
3. Configuración de build (Vercel la detecta sola por ser Vite, pero por las dudas):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. No hace falta ninguna variable de entorno todavía (Supabase sigue sin conectar,
   ver `src/store/repository/supabaseRepo.js`).
5. `vercel.json` en la raíz ya tiene el rewrite SPA necesario para que `/reserva`
   (la página pública de reserva, ver `src/main.jsx`) funcione en producción —
   sin esto, Vercel devuelve 404 en cualquier ruta que no sea `/`.

## Estado del producto

Funciona end-to-end con datos locales. Lo que queda para vender en serio:
backend con Supabase (auth + multi-complejo), bot real de WhatsApp, cobro online con
Mercado Pago, y PWA instalable.
