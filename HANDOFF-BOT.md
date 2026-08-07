# Traspaso — TuCan (sistema de canchas) + bot de WhatsApp

Pegá este archivo entero como primer mensaje en la sesión nueva de Claude Code,
abierta en `c:\Users\Rodrigo\Desktop\CODEARG PAGINAS WEBS\sistema de canchas`.

---

## Qué es esto

App de gestión de canchas (React 19 + Vite 6 + Tailwind v4, store propio a base
de reducer, sin Redux) sobre Supabase con RLS multi-tenant. Encima hay un bot de
WhatsApp en n8n que reserva turnos, cobra la seña y los confirma.

Circuito completo, ya funcionando:

1. El jugador entra a `/reserva/<slug>`, elige cancha y horario.
2. El turno nace **`pendiente`**, ocupa el slot y vence a los 60 minutos
   (configurable). Aparece en la grilla del dueño con el chip "Sin confirmar".
3. Se lo manda al WhatsApp del bot con `Reserva #XXXXXX` en la primera línea.
4. El bot lo reconoce por el código, le pasa alias, CBU y monto de la seña.
5. Llega el comprobante → se sube a Storage con URL firmada → el pago se
   registra **sin validar** → el turno pasa a confirmado.
6. El dueño valida la seña a mano desde el panel cuando quiere.

`pg_cron` corre `expirar_pendientes` cada 5 minutos, y como el panel es
Realtime, el slot vencido se libera solo en la pantalla del dueño.

## Reglas que NO se rompen

- **Nunca pegar en el chat la `service_role` ni la contraseña de la base.** Lo
  mismo vale para `N8N_API_KEY`: abre la instancia entera de n8n. Todo eso vive
  en `.env.local`, que está en `.gitignore`.
- **No commitear ni pushear a `master` sin que el dueño lo diga.** El demo que
  ven sus socios se sirve de esa rama. Hoy hay bastante trabajo sin commitear
  (mirá `git status`): es a propósito.
- Reglas del repo: `new Date` solo en `src/lib/date.js`; el store se importa
  solo desde `'../store'`; `minWidth: 0` en los hijos de grid/flex; nada de
  `alert`/`confirm`; nada de hex hardcodeado (van variables CSS); `.num` en los
  números.
- Voseo argentino en todo lo que ve el usuario.

## Herramientas para trabajar (ya configuradas, andan)

```bash
node tools/n8n.mjs list                # workflows de la instancia
node tools/n8n.mjs pull                # baja el bot al repo (hacelo SIEMPRE antes de editar)
node tools/n8n.mjs push                # sube el del repo a la instancia
node tools/n8n.mjs diff                # qué cambiaría un push
node tools/n8n.mjs execs --n 15        # últimas ejecuciones
node tools/n8n.mjs exec <id>           # qué nodo falló y con qué respuesta
node tools/n8n.mjs chat <id>           # qué pidió el cliente, qué tools llamó, qué contestó
node tools/n8n.mjs prompt              # el system prompt vivo

npm run test:bot                       # 49 asserts contra la función desplegada
npx vitest run                         # 97 tests del front
npm run build
npx supabase functions deploy bot      # desplegar la Edge Function
deno check supabase/functions/bot/index.ts
```

`node tools/n8n.mjs chat <id>` es la herramienta principal para depurar el bot:
muestra el payload exacto que mandó cada tool. Los dos últimos bugs salieron de
ahí, no de leer código.

El workflow es `Canchas — Bot de Reservas V1`, id `ZNMrgdxH8mWC3wan`, activo.
Comparte el inbox de Chatwoot del lubricentro con una whitelist.

## Los tres bugs que se arreglaron hoy (2026-08-06), por si vuelven

1. **`Fecha inválida` en `ver_disponibilidad`.** Un tool de n8n no omite los
   parámetros que el modelo dejó vacíos: los manda como `""`. `String(x ?? y)`
   no atrapa la cadena vacía. Arreglado con `limpiarBody()` en la puerta de
   `supabase/functions/bot/index.ts`, que descarta `""`, `"null"`, `"n/a"` y
   compañía antes del switch de acciones.
2. **`Esa cancha no existe` al reservar.** El id (`cancha_k3n8…`) es opaco y el
   agente lo tiene solo durante la ejecución en la que llamó a
   `ver_disponibilidad`: la memoria de n8n guarda la charla, no las respuestas
   crudas de las tools. Dos mensajes después manda `cancha_1`, porque eso fue lo
   que él escribió. Arreglado con `resolverCancha()`, que resuelve por id, por
   nombre, o por el número que tenga el nombre, y devuelve la lista completa con
   los ids cuando no puede.
3. **El bot contestaba igual cuando la tool fallaba** ("a las 14 no tengo
   libre", "listo, te lo reservo"). Reglas nuevas en el system prompt.

**El patrón detrás de los tres: lo que el modelo tiene en la cabeza dura un
mensaje.** Todo lo que sea un identificador opaco se va a perder. Si aparece
otro caso así, la solución no es apretar el prompt: es que el servidor acepte
también la forma humana del dato.

## Lo que quedó pendiente

Del bot:
- El respaldo de `cancelar_turno` sin `bookingId` (resuelve por código o
  teléfono, y solo si queda uno) **no tiene test**. El camino peligroso —mandar
  un id que no existe— sí lo tiene y pasa: no cae al respaldo, contesta 403.
- Falta la mitad simétrica de la whitelist: los workflows del lubricentro y de
  Gianni tienen que **excluir** el número de prueba, o contestan dos bots sobre
  la misma conversación.
- Correr las pruebas de comprensión de `n8n/README - Bot Canchas.md` §6.

De la app, de la etapa anterior:
- Empleado con permisos recortados, de punta a punta.
- Que el logout no deje `tucan:cache:*`.
- Aislamiento entre dos cuentas distintas.
- Protección de contraseñas filtradas (HIBP) en Supabase Auth.
- `npm run test:e2e` **nunca se corrió en esta máquina**: borra el tenant y se
  llevaría puestos los datos de demo. Preguntá antes.

Antes de salir a producción: `APP_ORIGIN` al dominio real, Site URL y Redirect
URLs de Auth, y confirmar en el panel que "Allow new users to sign up" siga en
**OFF** (`supabase config push` ya lo revirtió una vez sin avisar).

## Cómo trabajar

El dueño prueba el bot por WhatsApp y cuenta qué pasó. El ciclo es: mirar la
ejecución con `chat`, encontrar la causa real (casi nunca es lo que parece),
arreglar del lado que corresponda, desplegar, correr `npm run test:bot`, y
sumar el caso a `tools/test-bot.mjs` para que no vuelva.

Está en castellano rioplatense, con comentarios que explican **por qué** está
así cada cosa —no qué hace— y sin pedir permiso para cada paso obvio.
