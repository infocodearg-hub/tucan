# Set&gol — costos reales y modelo de precios del SaaS

Metodología: donde hay un número medido de verdad (uso real de tokens contra
la instancia de n8n de hoy), se dice de dónde sale. Donde falta un dato para
cerrarlo del todo, se dice explícitamente qué falta — no se completa a ojo.
Todos los precios de proveedores están fechados a **agosto de 2026** y hay
que revisarlos antes de fijar precios en serio: OpenAI, Meta y Supabase
cambian tarifas sin previo aviso.

---

## 1. Lo que ya sabemos con certeza: costo por conversación de reserva

Se sacó agregando el `tokenUsage` real que devuelve el nodo "OpenAI Canchas"
del workflow de n8n, sobre dos conversaciones reales de hoy contra WhatsApp
(no un benchmark sintético):

| Conversación | Mensajes del cliente | Llamadas al modelo | Tokens in / out | Costo (gpt-4.1) |
|---|---|---|---|---|
| Reserva + cancelación simple | 8 | 14 | 86.330 / 459 | **USD 0,176** |
| Reserva con corrección de horario | 13 | 25 | 159.574 / 1.131 | **USD 0,330** |

**Por qué es tan alto en tokens para una charla tan corta**: el agente es un
`langchain.agent` en modo ReAct — cada vez que decide llamar a una
herramienta o responder, es una llamada NUEVA al modelo que reenvía el
system prompt completo (~6.300 tokens: reglas, protocolo, ejemplos) más todo
el historial de la conversación hasta ese punto. Una reserva con 2 idas y
vueltas de herramientas ya son 3-4 llamadas encadenadas; con una corrección
de horario (el bug que se arregló hoy) o una consulta larga, sube a 20+.

**La palanca real de costo es el modelo, no el volumen de charla**:

| Modelo | Precio (in / out, por millón de tokens) | Costo estimado por reserva completa |
|---|---|---|
| `gpt-4.1` (el que usa hoy) | USD 2,00 / 8,00 | **USD 0,18 – 0,33** |
| `gpt-4.1-mini` | USD 0,40 / 1,60 | **USD 0,035 – 0,066** (≈5× más barato) |

Fuente: [OpenAI API Pricing 2026](https://pecollective.com/tools/openai-api-pricing/).
Cambiar de modelo es un campo del nodo "OpenAI Canchas" en n8n, no requiere
tocar código de la app ni del prompt.

**Whisper (transcripción de audios)**: USD 0,006/minuto
([fuente](https://tokenmix.ai/blog/whisper-api-pricing)). Es marginal — el
audio típico de un cliente pidiendo un turno dura 5-10 segundos, o sea
centavos de centavo por mensaje de voz. No cambia la cuenta de arriba en
ningún escenario realista.

---

## 2. Costos fijos — compartidos entre TODOS los complejos

Esto es lo bueno del esquema actual: un solo n8n, un solo Chatwoot y un solo
proyecto de Supabase con RLS multi-tenant atienden a cualquier cantidad de
complejos. Sumar el complejo #50 no duplica nada de esto.

| Ítem | Costo/mes | Notas |
|---|---|---|
| VPS (n8n + Chatwoot) | < USD 20 | Dato tuyo, ya lo estás pagando |
| Supabase Pro | USD 25 | 100 GB storage, 2M invocaciones de Edge Functions, 50k MAU de Auth, USD 10 de crédito de cómputo incluido — [fuente](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/) |
| Vercel Pro | USD 20 | El plan gratuito (Hobby) prohíbe uso comercial para terceros en sus términos — un SaaS que le cobra a otros complejos necesita el plan pago |
| Dominio + verificación WhatsApp Business | ~USD 2-3/mes prorrateado | Costo anual bajo, no crece con clientes |
| **Total fijo** | **≈ USD 65-70/mes** | Independiente de cuántos complejos haya, hasta que alguno de estos planes se quede corto (ver §5) |

---

## 3. Costo variable por complejo

Lo único que escala con la cantidad de clientes:

- **LLM + Whisper del bot**: el número medido en §1, multiplicado por la
  cantidad de reservas/consultas que procese el bot ese mes.
- **WhatsApp Cloud API oficial** — el ítem con más incertidumbre, ver §4.
- **Supabase por encima de lo incluido**: con 100 GB de storage y 2M
  invocaciones de Edge Function en el plan base, un complejo individual
  (fotos de comprobantes, turnos, consultas del bot) consume una fracción
  mínima. Esto empieza a importar recién con decenas de complejos activos
  simultáneamente — no es un costo por-cliente real hasta ese punto.

---

## 4. El plazo que hay que tener en el radar: WhatsApp deja de ser gratis

Hoy, cuando un cliente le escribe primero al bot, se abre una "ventana de
servicio" de 24 horas donde las respuestas de texto libre no tienen costo.
**Desde el 1° de octubre de 2026, Meta cobra por TODO mensaje de negocio,
incluidas las respuestas dentro de esa ventana** — no solo las plantillas de
marketing que ya se cobraban antes
([fuente](https://blueticks.co/blog/whatsapp-business-api-pricing-2026)).

No encontré la tarifa específica de mensajes de servicio para Argentina en
las fuentes disponibles — las que hay hablan de rangos generales (mensajes
de utilidad/servicio corren 80-90% más baratos que los de marketing, que en
EE.UU. rondan USD 0,025). **Esto queda marcado como el dato que falta
confirmar contra el rate card oficial de Meta antes de anunciar precios
finales** — es la pieza más grande de incertidumbre de todo este documento,
y entra en vigencia en 2 meses.

Con una conversación de reserva típica de 8-13 mensajes del cliente (y
otros tantos del bot), aun a una tarifa baja de servicio esto podría sumar
unos centavos más por reserva — no cambia el orden de magnitud del costo,
pero sí hay que absorberlo en el precio del plan antes de esa fecha.

---

## 5. Planes propuestos

Punto de partida para validar, no el precio final. Asume ~30 días de
actividad y un complejo que efectivamente usa el bot (no todos los
complejos van a tener el mismo volumen — un pádel de barrio con 3 canchas no
es lo mismo que un polideportivo con 10).

| | **Pro** | **Plus** | **Max** |
|---|---|---|---|
| Bot | `gpt-4.1-mini`, sin audio (o audio limitado) | `gpt-4.1-mini` con audio completo (Whisper) | `gpt-4.1` completo — el que corre hoy, más preciso en casos ambiguos |
| Funciones | Reservas, cancelaciones, derivaciones | + Turnos fijos, recordatorios automáticos | + Reportes avanzados, multi-cancha/multi-sede |
| Conversaciones/mes (estimado) | ~40 | ~120 | ~300 |
| Costo variable LLM/Whisper | USD 1,4 – 2,6 | USD 4,2 – 7,9 | USD 54 – 99 |
| + WhatsApp (a confirmar, ver §4) | + unos USD | + unos USD | + unos USD |
| **Costo variable total/mes (estimado)** | **≈ USD 3-5** | **≈ USD 8-12** | **≈ USD 60-105** |

El salto de costo entre Plus y Max es grande a propósito: es la diferencia
real entre `gpt-4.1-mini` y `gpt-4.1` medida en §1 (5×), aplicada a un
volumen mayor. Si el margen de Max queda muy ajustado, la palanca más
efectiva no es subir el precio — es ofrecer `gpt-4.1-mini` también en Max
para complejos de alto volumen y reservar `gpt-4.1` para quien realmente lo
necesite (multi-idioma, casos ambiguos frecuentes).

### Precio sugerido

Con el fijo compartido (§2, ≈USD 65-70/mes entre todos los clientes) más el
variable de cada plan, y apuntando a un margen bruto del 75-85% (estándar
sano para un SaaS chico, dejando lugar para soporte y las derivaciones que
terminan atendiendo ustedes a mano):

| Plan | Costo total estimado/mes (con 1 solo cliente) | Precio sugerido/mes (USD) | Precio sugerido/mes (ARS, referencia) |
|---|---|---|---|
| Pro | ~USD 8-10 (con parte del fijo prorrateado) | **USD 25-30** | **≈ $37.500 - $45.000** |
| Plus | ~USD 13-17 | **USD 45-55** | **≈ $67.500 - $82.500** |
| Max | ~USD 65-110 | **USD 140-180** | **≈ $210.000 - $270.000** |

Conversión de referencia a **$1.500 ARS/USD** (dólar oficial, agosto 2026 —
[fuente](https://www.cronista.com/finanzas-mercados/dolar-oficial-asi-abre-la-cotizacion-este-miercoles-5-de-agosto/)),
con 33% de volatilidad anual en los últimos 12 meses. **Recomendación
práctica**: cobrar en ARS pero indexado al dólar del día (o actualizar el
precio en ARS mensualmente) — es lo que hace la mayoría del SaaS argentino
para no licuar el margen con la inflación, dado que casi todo el costo real
(OpenAI, Supabase, Vercel) está dolarizado.

**El fijo se diluye rápido**: con 5 clientes en Plus, el fijo compartido
(~USD 70) son ~USD 14 por complejo — ya el margen del plan mejora solo por
tener más de un cliente. Con 20 clientes, es prácticamente ruido. La
estructura de costos de este SaaS premia la escala desde el día uno, que es
exactamente lo que hace atractivo venderlo a "cualquier complejo del país".

### Punto de equilibrio

Con el fijo de ≈USD 70/mes, hacen falta entre 2 y 3 clientes en el plan Pro
(o 1-2 en Plus) para cubrir la infraestructura compartida, antes de que
cualquier venta adicional sea prácticamente todo margen (el variable por
cliente es bajo comparado con el precio sugerido).

---

## 6. Lo que falta para que este número sea definitivo

1. **Tarifa real de WhatsApp Cloud API para Argentina después del 1° de
   octubre de 2026** — el ítem más importante pendiente, ver §4.
2. **Volumen real por complejo**: los "~40 / ~120 / ~300 conversaciones/mes"
   de §5 son una estimación razonable, no un dato medido — el complejo de
   Rodrigo (el que se usó para las pruebas de esta sesión) todavía no tiene
   un mes completo de uso real en producción para calibrar contra eso.
3. **Cuántos complejos entran antes de que Supabase Pro o el VPS actual
   necesiten upgrade** — con el volumen de hoy falta bastante margen, pero
   vale la pena revisarlo cada tanto a medida que se sumen clientes, no
   asumirlo indefinido.

Ninguno de estos tres bloquea salir a buscar los primeros clientes con los
precios de §5 — son ajustes finos, no correcciones de orden de magnitud.
