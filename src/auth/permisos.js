/**
 * Catálogo de permisos del rol "empleado".
 *
 * El dueño los prende y apaga desde Configuración → Usuarios y permisos. El
 * dueño siempre los tiene todos: no son configurables para su propio rol.
 *
 * IMPORTANTE — hasta dónde llega cada uno:
 *   - `gestionar_gastos` y la configuración del complejo se hacen cumplir en la
 *     base (RLS): sin permiso, la fila directamente no se puede leer ni escribir.
 *   - `ver_reportes` es gating de interfaz. Los turnos y las ventas crudas hacen
 *     falta para operar la caja, así que no se pueden esconder a nivel base sin
 *     romper la app. Esconde el tab de Reportes y los totales, no los datos.
 * Está documentado a propósito: no vender como seguridad lo que es comodidad.
 */

export const PERMISOS = [
  {
    key: 'gestionar_turnos',
    label: 'Cargar y editar turnos',
    detalle: 'Reservar, editar, cobrar y cancelar turnos de la grilla.',
    nivel: 'base',
  },
  {
    key: 'gestionar_turnos_fijos',
    label: 'Gestionar turnos fijos',
    detalle: 'Altas, bajas y cambios en los equipos con horario fijo.',
    nivel: 'base',
  },
  {
    key: 'vender_cantina',
    label: 'Vender en la cantina',
    detalle: 'Registrar ventas del mostrador y cargar consumos a un turno.',
    nivel: 'base',
  },
  {
    key: 'gestionar_clientes',
    label: 'Gestionar clientes',
    detalle: 'Crear y editar las fichas de clientes del CRM.',
    nivel: 'base',
  },
  {
    key: 'gestionar_productos',
    label: 'Administrar el catálogo',
    detalle: 'Cambiar precios, stock y productos de la cantina.',
    nivel: 'base',
  },
  {
    key: 'gestionar_gastos',
    label: 'Cargar gastos',
    detalle: 'Registrar salidas de plata. Sin esto tampoco ve los gastos cargados.',
    nivel: 'base',
  },
  {
    key: 'ver_reportes',
    label: 'Ver reportes y cierre de caja',
    detalle: 'Acceso a la sección Reportes: totales del día, cierre de caja y gastos.',
    nivel: 'base',
  },
  {
    key: 'eliminar_registros',
    label: 'Eliminar registros',
    detalle: 'Borrar turnos, clientes, productos o gastos. Sin esto solo puede editar.',
    nivel: 'sensible',
  },
];

/** Todo en `true` — es lo que ve un dueño. */
export const PERMISOS_DUENO = Object.freeze(
  Object.fromEntries(PERMISOS.map((p) => [p.key, true]))
);

/** Mismos valores por defecto que el `default` de la columna en la base. */
export const PERMISOS_EMPLEADO_DEFAULT = Object.freeze({
  gestionar_turnos: true,
  gestionar_turnos_fijos: true,
  vender_cantina: true,
  gestionar_clientes: true,
  gestionar_productos: false,
  gestionar_gastos: false,
  ver_reportes: false,
  eliminar_registros: false,
});

/**
 * Ausente = denegado, siempre. Nunca al revés: un permiso que todavía no existe
 * en la fila de un empleado viejo no debe quedar habilitado por omisión.
 */
export function puede(permisos, key) {
  return permisos?.[key] === true;
}

/**
 * Qué permiso pide cada sección del panel. Vive acá y no en cada menú para que
 * el sidebar, la barra de abajo del celular y el ruteo de `App.jsx` no se
 * puedan desincronizar (un tab escondido en un menú pero alcanzable desde el
 * otro no esconde nada).
 *
 * `null` = visible para todo el equipo. `SOLO_DUENO` = no configurable.
 */
export const SOLO_DUENO = Symbol('solo-dueno');

export const PERMISO_POR_TAB = {
  grilla: null,
  turnos_fijos: 'gestionar_turnos_fijos',
  cantina: 'vender_cantina',
  clientes: 'gestionar_clientes',
  reportes: 'ver_reportes',
  configuracion: SOLO_DUENO,
  // Mismo permiso que ya exige la política `bot_derivaciones_update` en la
  // base para marcar "atendida": quien puede tocar turnos, atiende acá.
  derivaciones: 'gestionar_turnos',
};

/** @param {{ esDueno: boolean, puede: (key: string) => boolean }} auth */
export function puedeVerTab(tab, auth) {
  const requerido = PERMISO_POR_TAB[tab];
  if (requerido === SOLO_DUENO) return auth.esDueno;
  if (!requerido) return true;
  return auth.puede(requerido);
}
