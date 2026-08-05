# 📝 Super Mega Prompt: Reconstrucción Completa de TuCan PRO

Copiá y pegá el siguiente prompt en cualquier Inteligencia Artificial (como Gemini, Claude, o GPT) para que reconstruya y arme este proyecto completo desde cero con la misma estética premium, interacciones, lógica y responsividad móvil que logramos en esta sesión.

---

```markdown
Actúa como un Desarrollador Frontend Senior experto en React, Vite y CSS moderno. Tu objetivo es construir e implementar desde cero una aplicación de gestión para complejos deportivos llamada "TuCan PRO" (Gestión Integral de Canchas, Cantina POS y CRM de Clientes).

La aplicación debe ser ultra-premium visualmente, usando una estética "Deep Pitch" (campo de fútbol nocturno: negros profundos, detalles verdes neón, efectos glassmorphism, sombras neón y animaciones sutiles). Toda la interactividad debe ser real (gestión de estados en memoria, creación de clientes, agregado de consumos, cobro de abonos y saldado de señas) y NO debes usar alertas nativas de JavaScript (`alert()`), sino componentes modales y notificaciones Toast personalizados.

A continuación se detalla la arquitectura, el sistema de diseño, y cada uno de los componentes a crear paso a paso.

---

## 1. CONFIGURACIÓN DEL PROYECTO Y TECNOLOGÍAS

- **Framework**: React (inicializado con Vite).
- **Estilos**: CSS Puro (Vanilla CSS) escrito en `src/index.css`. No usar TailwindCSS a menos que se configure explícitamente; toda la estética se define con variables personalizadas y selectores limpios.
- **Iconografía**: `lucide-react` para todos los íconos vectoriales.
- **Fuentes**: Importar 'Inter' y 'Outfit' desde Google Fonts para títulos y tipografía deportiva.

---

## 2. SISTEMA DE DISEÑO (Variables CSS en index.css)

Escribe el archivo `src/index.css` configurando el siguiente esquema de colores "Deep Pitch" y estilos globales:

```css
:root {
  /* Pitch Grass Palette */
  --green-glow: #00FF88;
  --green: #00E676;
  --green-dark: #00B359;
  --green-deep: #004D26;
  
  /* Turf Surfaces */
  --bg-pitch: #060B08;
  --bg-card: #0F1A13;
  --bg-card-hover: #16261C;
  --bg-surface: #122117;
  --bg-input: #0B140E;
  
  /* Accents */
  --volt: #C8FF00;
  --blue: #00B0FF;
  --cyan: #00E5FF;
  --purple: #B988FC;
  --amber: #FFB300;
  --red: #FF4F4F;
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-muted: #8AA897;
  --text-faint: #4E695A;
  
  /* Borders */
  --border-dim: rgba(0, 230, 118, 0.12);
  --border-mid: rgba(0, 230, 118, 0.25);
  --border-green: rgba(0, 230, 118, 0.45);
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* Clases Útiles globales */
body {
  background-color: var(--bg-pitch);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}
.font-heading { font-family: 'Outfit', sans-serif; }

/* Botones con brillo neón */
.btn-primary {
  background: linear-gradient(140deg, #00E676 0%, #00B359 100%);
  color: #040A06;
  font-weight: 800;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 18px rgba(0, 230, 118, 0.4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 6px 24px rgba(0, 230, 118, 0.55);
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-dim);
  padding: 10px 18px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

/* Modales Centrados y Fluidos */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 6, 0.82);
  backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-mid);
  box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 30px rgba(0,230,118,0.12);
  border-radius: var(--radius-xl);
  padding: 24px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Layout Shell fluida completa */
.app-container {
  display: flex;
  min-height: calc(100vh - 64px);
  width: 100%;
  max-width: 100%;
  position: relative;
}

/* Media Queries para Mobile (Bottom Nav y padding) */
@media (max-width: 768px) {
  .app-container { flex-direction: column; }
  .app-main-content {
    padding: 14px 12px calc(90px + env(safe-area-inset-bottom)) 12px !important;
    width: 100% !important;
  }
  .bottom-nav { display: flex !important; }
}
```

---

## 3. ESTADOS GLOBALES DE LA APLICACIÓN (`src/App.jsx`)

El componente raíz `App.jsx` debe manejar y orquestar los siguientes estados compartidos mediante Props en memoria:

1. `bookings`: Lista de reservas de la grilla (Mock inicial con estados `partial`, `paid`, `fixed`).
2. `products`: Lista de stock de la Cantina POS.
3. `clients`: Base de datos CRM de jugadores.
4. `activeTab`: Pestaña activa ('grilla', 'turnos_fijos', 'cantina', 'clientes', 'reportes', 'configuracion', 'vista_publica').
5. `toast`: Objeto temporal `{ message, type }` para notificaciones rápidas.
6. Handlers interactivos:
   - `handleSaveBooking(newBooking)`: Guarda una nueva reserva.
   - `handleSettleBooking(bookingId)`: Cambia el estado a 100% pagado.
   - `handleCancelBooking(bookingId)`: Elimina la reserva de la grilla.
   - `handleAddCantinaToBooking(bookingId, product)`: Añade un producto consumido directamente al total de la cancha.
   - `handleAddProduct(newProduct)`: Agrega producto al inventario.
   - `handleAddClient(newClient)`: Agrega jugador al CRM.

---

## 4. ESPECIFICACIÓN DE COMPONENTES INTERACTIVOS

### A. Selector Desplegable Premium (`CustomSelect.jsx`)
Crea un dropdown personalizado que reemplace el `<select>` nativo. Al hacer clic debe abrir una lista flotante con estilo glassmorphic, neón, hover activo y check en la opción seleccionada. Debe admitir íconos decorativos opcionales en las opciones.

### B. Notificaciones Toast (`Toast.jsx`)
Componente flotante posicionado abajo a la derecha con animación de entrada (`translateY`). Se cierra automáticamente tras 3.5 segundos. Recibe `message` y `type` (success, info, warning).

### C. Barra de Navegación Superior (`Navbar.jsx`)
- Contiene el logo de "TuCan PRO" con el lema "Gestión Integral de Canchas".
- Muestra el nombre del complejo, reloj digital dinámico de la hora actual en formato de 24hs (Ej: `22:15 hs`) e insignia flotante animada **"● Bot activo"** en verde neón.
- Selector de canchas compacto e información de perfil del usuario ("EM").

### D. Menú Lateral de Navegación (`Sidebar.jsx`)
- Ocupa el 100% de la altura disponible (`height: calc(100vh - 64px)`), con borde verde neón translúcido en la derecha.
- Los botones de navegación (`.sidebar-nav-item`) deben tener: hover neón, clase `.active` con fondo verde transparente, ícono de Lucide alieando y badges para avisos importantes ("En Vivo", "4 equipos", "QR").
- En la base inferior, incluye una tarjeta degradada de **"TuCan PRO"** y la marca de versión *"TuCan v3.0 · Argentina ● Online"*.

### E. Grilla Horaria Interactiva (`GrillaTurnos.jsx`)
- **KPIs**: 4 tarjetas que muestren Ocupación (%), Recaudación (señas vs restante), Cantidad de reservas gestionadas por la IA y total de Turnos Fijos. Asegura que los números y textos tengan tipografías auto-escalables con `clamp` para que no colisionen con los íconos decorativos.
- **Filtros**: Selector de deporte (Todos, Fútbol 5, Pádel) y filtros rápidos por Canchas en formato de botones horizontales táctiles.
- **Tabla de Horarios**: Grid de columnas dinámicas (Hora + Canchas seleccionadas).
  - Si un slot está libre: botón interactivo con el precio correspondiente del horario (Día/Noche). Abre `NuevoTurnoModal`.
  - Si el slot está reservado: muestra el nombre del cliente, badge de estado (Señado, Pagado 100%, Turno Fijo), barra de progreso financiera y consumos extras asignados. Al hacer clic abre `DetalleTurnoModal`.

### F. Caja y Cantina POS (`CajaCantina.jsx`)
- Selector de categorías por pestañas horizontales (Todas, Bebidas, Tragos, Snacks, Servicios).
- Grilla de productos interactivos mostrando foto (o íconos temáticos como `Beer`, `GlassWater`), stock y botón `+` para agregar al carrito lateral.
- **Carrito de Compras Lateral**: Muestra el desglose de productos agregados, cantidad, total a pagar, y un dropdown para asignar la venta a una cancha en juego o procesar como venta rápida de mostrador.
- Al confirmar la compra, abre el modal personalizado `VentaExitosaModal`.

### G. Comprobante de Cobro (`VentaExitosaModal.jsx`)
Reemplaza los molestos `alert()` del navegador por un ticket digital. Muestra:
- Círculo verde neón con check animado.
- Detalle de ítems vendidos con cantidades y totales.
- Método de cobro y asignación (Mostrador o Cancha).
- Botón interactivo para "Imprimir Ticket" y botón para "Cerrar".

### H. Modal Detalle de Turno (`DetalleTurnoModal.jsx`)
Al interactuar con una reserva activa, abre un modal centrado con:
- Datos del cliente, teléfono, hora, fecha y observaciones.
- Panel financiero: Valor total, seña abonada, barra visual de progreso y deuda pendiente en puerta en color naranja brillante (`--amber`).
- **Botón "Marcar como Saldado"**: Liquida la deuda pendiente.
- **Botón "+ Cantina"**: Permite imputar consumos adicionales de la cantina directamente al saldo final del turno.
- **Botón "Recordatorio WA"**: Prepara un enlace externo `https://wa.me/...` con un mensaje amigable de confirmación.
- **Botón "Cancelar Turno"**: Elimina la reserva liberando el casillero.

### I. CRM Clientes (`ClientesCRM.jsx`)
- Muestra la lista de jugadores ordenados por Scoring (del 1.0 al 10.0), partidos jugados, cancelaciones y dinero gastado.
- Categoriza a los clientes automáticamente con insignias elegantes usando íconos vectoriales (`Crown` para VIP, `ShieldCheck` para Capitán Fijo, `Award` para Cliente Fiel).
- Botón **"+ Nuevo Cliente"** que abre el formulario flotante para agregarlos.

### J. Reportes y Estadísticas (`ReportesAnalytics.jsx`)
- 4 KPIs financieros dinámicos con fuentes clamp.
- **Gráfico de Ocupación Semanal**: Barras verticales proporcionales con degradados según el nivel de ocupación (verde neón si supera el 90%).
- **Gráfico de Recaudación**: Barras de progreso horizontales por cada cancha comparando su rendimiento.
- **Top Ventas Cantina**: Tabla con los 4 productos más vendidos, stock restante y volumen recaudado.

---

## 5. REGLAS VISUALES IMPORTANTES

1. **Alineación Impecable**: En monitores de escritorio (PC), el `.app-container` debe ser fluido al 100% de la pantalla para que el menú de navegación lateral esté perfectamente alineado con el logo superior.
2. **Padding en Celular**: En móvil, la barra de navegación inferior (`.bottom-nav`) debe tener z-index elevado y el área de contenido principal debe tener un margen inferior (`padding-bottom: 100px`) para evitar que las tarjetas de productos se oculten detrás del menú táctil.
3. **Animación en Modales**: Todos los modales deben abrirse con una animación sutil de escala y opacidad (`@keyframes modal-pop`).
```

Genera todo el código para los componentes descritos, implementando los estados de React, manejadores y el CSS completo para lograr el resultado exacto.
