/**
 * Versión de esquema y forma del estado inicial.
 *
 * Subir SCHEMA_VERSION obliga a escribir una migración en migrations.js.
 * PERSIST_WHITELIST decide qué se guarda: `ui` queda afuera a propósito,
 * ver la nota en persist.js.
 */

import { createSeedData } from '../data/seed.js';
import { nowISO, todayISO } from '../lib/date.js';

export const SCHEMA_VERSION = 1;

export const PERSIST_WHITELIST = [
  'meta',
  'config',
  'canchas',
  'bookings',
  'clients',
  'products',
  'turnosFijos',
  'sales',
  'expenses',
];

function createUIState() {
  return {
    activeTab: 'grilla',
    selectedDate: todayISO(),
    modal: null,
    toasts: [],
    lastError: null,
    // La sesión real vive en AuthProvider (Supabase Auth). Este campo queda
    // para lo que la UI necesite marcar sobre la sesión, nunca credenciales.
    session: null,
  };
}

/**
 * Estado de una cuenta nueva: sin datos.
 *
 * Es el que usa la app real. Un complejo que recién se da de alta arranca vacío
 * y carga lo suyo con el asistente de alta — sembrarle el complejo de
 * demostración obligaría a borrar a mano turnos, clientes y gastos que nunca
 * existieron.
 *
 * `config` arranca con la forma completa pero en blanco: los componentes leen
 * `config.operacion.slots` y compañía sin preguntar si existe.
 */
export function createEmptyState() {
  return {
    meta: { schemaVersion: SCHEMA_VERSION, updatedAt: nowISO() },
    config: {
      complejo: { nombre: '', ciudad: '', direccion: '', telefono: '' },
      pagos: {
        alias: '',
        cbu: '',
        titular: '',
        senaMinimaPorcentaje: 50,
        // Lo único que el bot dice sobre la plata de un turno cancelado.
        politicaSena: 'credito',
      },
      operacion: {
        slots: [],
        horaNocturnaDesde: '19:00',
        permitirCargaRetroactiva: false,
        // Cuánto se le guarda el horario a quien reservó por la web y no señó.
        minutosExpiracionPendiente: 60,
        horasMinimasCancelacion: 12,
        horarioAtencion: { desde: '09:00', hasta: '23:59' },
        // Intervalo con el que se arma la plantilla de horas al editar
        // `disponibilidad` desde Configuración (no reescribe `slots` solo).
        intervaloMin: 60,
        // Informativo por ahora: no cambia cuántos casilleros de grilla ocupa
        // un turno (ver horasHabilitadasPorDia en src/lib/disponibilidad.js).
        duracionMin: 60,
        // 0 = sin restricción. Horas mínimas de antelación para reservar.
        anticipacionMinHoras: 0,
        // Mapa día ISO ('1' Lunes … '7' Domingo) → horas habilitadas ese día.
        // Vacío = tenant viejo, sin migrar: horasHabilitadasPorDia() cae a
        // `slots` replicado los 7 días, que es el comportamiento de siempre.
        disponibilidad: {},
      },
      integraciones: {
        whatsappBotActivo: false,
        modo247: false,
        alertasSinSena: true,
        recordatorioAutomatico: false,
        ocrComprobantes: false,
        maxTurnosActivosPorTelefono: 2,
        exigirValidacionManual: false,
      },
    },
    canchas: [],
    bookings: [],
    clients: [],
    products: [],
    turnosFijos: [],
    sales: [],
    expenses: [],
    ui: createUIState(),
  };
}

/**
 * Estado con el complejo de demostración cargado.
 *
 * Ya NO es lo que ve una cuenta real: queda para los tests y para levantar la
 * app sin backend mientras se desarrolla.
 */
export function createInitialState() {
  const seed = createSeedData();
  return {
    meta: { schemaVersion: SCHEMA_VERSION, updatedAt: nowISO() },
    ...seed,
    expenses: seed.expenses ?? [],
    ui: createUIState(),
  };
}
