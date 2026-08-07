/**
 * useNotificaciones — la campana del navbar, con datos reales.
 *
 * Hoy las notificaciones se DERIVAN del estado: no hay tabla, se calculan las
 * alertas vigentes (`lib/notificaciones.js`) y se recalculan solas cuando el
 * Realtime del store recarga. El "leído" vive en localStorage porque la slice
 * `ui` está deliberadamente fuera de PERSIST_WHITELIST (ver store/schema.js).
 *
 * Cuando exista la tabla `notificaciones` en la base, se reemplaza el cuerpo de
 * este hook manteniendo la firma de abajo y el shape de cada item — el Navbar
 * no se toca.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { construirNotificaciones } from '../lib/notificaciones.js';
import { useBookingsForRange, useConfig } from '../store';
import { useAuth } from '../auth/AuthProvider';
import { puedeVerTab } from '../auth/permisos';
import { useDerivacionesAbiertas } from '../components/DerivacionesBot';
import { addDays, todayISO } from '../lib/date';

/** Se olvidan las marcas viejas: una alerta de hace dos semanas ya no vuelve. */
export const DIAS_RETENCION_LEIDAS = 14;
/** Tope duro para que la clave no crezca sin techo en un complejo con mucho movimiento. */
export const MAX_LEIDAS = 300;

const MS_DIA = 86_400_000;

/**
 * Prefijo `tucan:ui:` a propósito: `purgarCacheLocal()` (AuthProvider) borra
 * `tucan:cache:*` y `tucan:state:*`, así que esto sobrevive al logout. El
 * sufijo de tenant evita que quien administra dos complejos arrastre el estado
 * de uno al otro.
 */
const claveLeidas = (tenantId) => `tucan:ui:notif-leidas:${tenantId ?? 'anon'}`;

function leerLeidas(tenantId) {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const crudo = window.localStorage.getItem(claveLeidas(tenantId));
    if (!crudo) return {};
    const parsed = JSON.parse(crudo);
    return parsed?.leidas && typeof parsed.leidas === 'object' ? parsed.leidas : {};
  } catch {
    // Modo privado agresivo o JSON corrupto: arrancar de cero es aceptable,
    // el peor caso es que la campana muestre como no leído algo ya visto.
    return {};
  }
}

/** Purga por edad y después por cantidad, en ese orden. */
function podar(mapa, ahoraMs) {
  const corte = ahoraMs - DIAS_RETENCION_LEIDAS * MS_DIA;
  let entradas = Object.entries(mapa).filter(([, ts]) => ts >= corte);
  if (entradas.length > MAX_LEIDAS) {
    entradas.sort((a, b) => b[1] - a[1]);
    entradas = entradas.slice(0, MAX_LEIDAS);
  }
  return Object.fromEntries(entradas);
}

function guardarLeidas(tenantId, mapa) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      claveLeidas(tenantId),
      JSON.stringify({ v: 1, leidas: mapa })
    );
  } catch {
    // Cuota llena: la campana sigue funcionando, solo se olvida qué se leyó.
  }
}

/**
 * @param {object} opciones
 * @param {(bookingId: string, fecha: string) => void} opciones.onAbrirTurno
 * @param {(tab: string) => void} opciones.onIrATab
 */
export function useNotificaciones({ onAbrirTurno, onIrATab } = {}) {
  const auth = useAuth();
  const config = useConfig();
  const tenantId = auth?.tenantId ?? null;

  // Rango acotado: ayer y anteayer por las señas sin validar, hoy y mañana por
  // los pendientes que están por vencer. Traer todo el store sería gratis en
  // memoria pero recalcularía de más en cada recarga del Realtime.
  const hoy = todayISO();
  const bookings = useBookingsForRange(addDays(hoy, -2), addDays(hoy, 1));

  const puedeTurnos = auth?.puede?.('gestionar_turnos') ?? false;
  // Reusa el hook que ya existe para el badge del sidebar: trae su propio canal
  // de Realtime con el truco de useId(), así que no abrimos ninguno nuevo.
  const { derivaciones } = useDerivacionesAbiertas({
    enabled: !!auth && puedeVerTab('derivaciones', auth),
  });

  const [leidas, setLeidas] = useState(() => leerLeidas(tenantId));
  // El reloj es estado y no un contador: los "vence en X min" tienen que
  // moverse solos aunque no cambie ni un dato de la base.
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setAhoraMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Cambiar de complejo tiene que traer las marcas de ESE complejo.
  useEffect(() => { setLeidas(leerLeidas(tenantId)); }, [tenantId]);

  const items = useMemo(() => {
    const base = construirNotificaciones({
      bookings: puedeTurnos ? bookings : [],
      derivaciones: derivaciones ?? [],
      config,
      ahoraMs,
    });
    return base.map((n) => ({ ...n, leida: !!leidas[n.id] }));
  }, [bookings, derivaciones, config, leidas, puedeTurnos, ahoraMs]);

  const unreadCount = items.filter((n) => !n.leida).length;

  const marcarLeida = useCallback((id) => {
    setLeidas((prev) => {
      if (prev[id]) return prev;
      const siguiente = podar({ ...prev, [id]: Date.now() }, Date.now());
      guardarLeidas(tenantId, siguiente);
      return siguiente;
    });
  }, [tenantId]);

  const marcarTodasLeidas = useCallback(() => {
    setLeidas((prev) => {
      const ahora = Date.now();
      const siguiente = { ...prev };
      for (const n of items) siguiente[n.id] = ahora;
      const podado = podar(siguiente, ahora);
      guardarLeidas(tenantId, podado);
      return podado;
    });
  }, [items, tenantId]);

  const abrir = useCallback((item) => {
    if (!item) return;
    marcarLeida(item.id);
    if (item.target?.kind === 'booking') {
      onAbrirTurno?.(item.target.bookingId, item.target.fecha);
    } else if (item.target?.kind === 'tab') {
      onIrATab?.(item.target.tab);
    }
  }, [marcarLeida, onAbrirTurno, onIrATab]);

  return { items, unreadCount, marcarLeida, marcarTodasLeidas, abrir };
}
