/**
 * GrillaTurnos.jsx — Fase 3
 *
 * Conectado a DateNav: el header ya no tiene la fecha hardcodeada.
 * KPIs desde useDayKpis (reales, no calculados inline).
 * Filtros de cancha leen del store (canchas activas).
 * TIME_SLOTS y canchas vienen del store, no de mockData.
 *
 * Nota: sigue usando legacyAdapter vía props (bookings como array viejo-shape)
 * para GrillaTurnos/DetalleTurnoModal — eso se migra en Fase 5 cuando se
 * reescriban esos dos componentes directo al store.
 */
import React, { useState, useEffect } from 'react';
import {
  Plus, DollarSign, Clock, Zap, Sparkles, Sun, Moon, Eye, Utensils,
} from 'lucide-react';
import {
  useCanchasActivas,
  useDayKpis,
  useSelectedDate,
  useConfig,
} from '../store';
import { formatARS, formatARSCompact } from '../lib/format';
import { minutosPara, rangeDays, startOfWeek, dayOfWeek, DIAS_SEMANA } from '../lib/date';
import { horasHabilitadasEnFecha, horasUnion } from '../lib/disponibilidad';
import DateNav from './DateNav';

// ─── Medidas de la grilla ─────────────────────────────────────────────────────
// Espejo en JS de las custom properties `--slot-col-*` de index.css: el JS no
// puede leer variables CSS, y necesita los números para calcular el ancho
// mínimo del scrollport. Si cambiás uno, cambiá el otro.
const COL_HORA = 76;
const COL_DIA = 200;
const COL_SEMANA = 116;
const GAP = 8;
const PAD_X = 28; // padding lateral del wrapper interno (14px × 2)

/** Ancho real que necesita la grilla del día; abajo de esto tiene que scrollear. */
const anchoMinimoDia = (canchas) => COL_HORA + canchas * COL_DIA + canchas * GAP + PAD_X;
/** Ídem para la semana: 7 columnas fijas. */
const anchoMinimoSemana = () => COL_HORA + 7 * COL_SEMANA + 7 * GAP + PAD_X;

/**
 * Fondo de la celda de hora. Tiene que ser OPACO (color-mix contra la
 * superficie, no un rgba translúcido): la columna queda sticky mientras el
 * resto scrollea, y con transparencia se vería pasar el contenido por abajo.
 */
const estiloCeldaHora = (isNight) => {
  const tinte = isNight ? 'var(--cyan)' : 'var(--amber)';
  return {
    background: `color-mix(in srgb, ${tinte} 7%, var(--color-surface-1))`,
    border: `1px solid color-mix(in srgb, ${tinte} 22%, var(--color-surface-1))`,
  };
};

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  // Reservado desde la web o el bot y todavía sin confirmar. Se pinta apagado y
  // con borde punteado a propósito: es el único estado que puede desaparecer
  // solo, y de lejos tiene que leerse como "esto todavía no es tuyo".
  pending: {
    badgeClass: 'badge-pending', label: 'Sin confirmar', labelCorto: 'S/C',
    cardBorder: 'var(--color-border-strong)', cardBg: 'transparent',
    cardBorderStyle: 'dashed',
    barColor: 'var(--color-border-strong)', paidPercent: 0,
  },
  partial: {
    badgeClass: 'badge-partial', label: 'Señado', labelCorto: 'Señado',
    cardBorder: 'rgba(255,179,0,0.4)', cardBg: 'rgba(255,179,0,0.04)',
    barColor: 'var(--amber)', paidPercent: 50,
  },
  paid: {
    badgeClass: 'badge-paid', label: 'Pagado 100%', labelCorto: 'Pagado',
    cardBorder: 'rgba(0,176,255,0.4)', cardBg: 'rgba(0,176,255,0.04)',
    barColor: 'var(--blue)', paidPercent: 100,
  },
  fixed: {
    badgeClass: 'badge-fixed', label: 'Turno Fijo', labelCorto: 'Fijo',
    cardBorder: 'rgba(185,136,252,0.4)', cardBg: 'rgba(185,136,252,0.04)',
    barColor: 'var(--purple)', paidPercent: 100,
  },
  blocked: {
    badgeClass: 'badge-blocked', label: 'Bloqueado', labelCorto: 'Bloq.',
    cardBorder: 'rgba(255,79,79,0.35)', cardBg: 'rgba(255,79,79,0.04)',
    barColor: 'var(--red)', paidPercent: 0,
  },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor = 'var(--celeste)', icon, accent = 'green' }) {
  const accents = {
    green:  { iconBg: 'rgb(from var(--celeste) r g b / 0.12)', iconBorder: 'rgb(from var(--celeste) r g b / 0.3)',   iconColor: 'var(--celeste)' },
    blue:   { iconBg: 'rgba(0,176,255,0.12)', iconBorder: 'rgba(0,176,255,0.3)',   iconColor: 'var(--blue)' },
    volt:   { iconBg: 'rgba(200,255,0,0.12)', iconBorder: 'rgba(200,255,0,0.3)',   iconColor: 'var(--volt)' },
    purple: { iconBg: 'rgba(185,136,252,0.12)',iconBorder: 'rgba(185,136,252,0.3)',iconColor: 'var(--purple)' },
  };
  const a = accents[accent] || accents.green;

  return (
    <div className="kpi-card">
      {/* .kpi-label / .kpi-sub reservan su alto aunque el texto ocupe menos:
          así las 4 cifras quedan alineadas en la misma horizontal. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p className="label-caps kpi-label">{label}</p>
        <h4
          className="font-heading num truncate-1"
          style={{ fontSize: 'clamp(1.25rem, 4vw, 1.65rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.05 }}
        >
          {value}
        </h4>
        <p className="kpi-sub" style={{ fontSize: '0.72rem', color: subColor, fontWeight: 600, lineHeight: 1.35 }}>
          {sub}
        </p>
      </div>
      <div className="kpi-icon" style={{ background: a.iconBg, border: `1px solid ${a.iconBorder}`, color: a.iconColor }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Free Slot ────────────────────────────────────────────────────────────────
function FreeSlot({ cancha, slotTime, isNight, onClick }) {
  const price = isNight ? cancha.precioNoche : cancha.precioDia;
  return (
    <div
      className="slot-free"
      onClick={onClick}
      title={`Disponible — Agendar turno ${slotTime} hs en ${cancha.nombre}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7,
          background: 'var(--bg-card-hover)', border: '1px dashed var(--border-mid)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Plus size={13} color="var(--text-faint)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="truncate-1" style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Disponible
          </p>
          <p className="num truncate-1" style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 1 }}>
            {formatARS(price)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Disabled Slot (vista Semana: hora no habilitada ESE día puntual) ─────────
function DisabledSlot() {
  return (
    <div className="slot-disabled" title="No disponible este día">
      <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>—</p>
    </div>
  );
}

// ─── Booked Slot ──────────────────────────────────────────────────────────────
/**
 * Tres líneas de alto fijo: quién · cuánto pagó (barra) · qué falta.
 *
 * La clave para que no se rompa como antes no es mostrar menos, es que cada
 * línea tenga una sola cosa elástica: el texto de plata se trunca con
 * ellipsis y todo lo demás lleva `flex-shrink: 0`. Antes competían cuatro
 * elementos elásticos en una fila de 72px útiles y se pisaban entre sí.
 *
 * `compact` = columna angosta (vista semana): el estado va como punto de
 * color en vez de badge, y los importes en formato corto ("$18 mil").
 */
function BookedSlot({ booking, onClick, compact = false }) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.partial;
  const minutosRestantes = minutosPara(booking.expiraAt);
  const saldo = (booking.totalPrice || 0) - (booking.depositPaid || 0);
  const plata = compact ? formatARSCompact : formatARS;

  // Lo que no entra en la card no se pierde: se cuenta en el tooltip.
  const detalle = [
    booking.clientName,
    cfg.label,
    booking.channel === 'bot_ai' ? 'Reservó el bot' : null,
    booking.senaSinValidar ? 'Seña sin validar' : null,
    booking.cantinaExtras?.length > 0 ? `Cantina: ${booking.cantinaExtras.length}` : null,
    booking.status === 'pending' && minutosRestantes != null
      ? (minutosRestantes > 0 ? `Se libera en ${minutosRestantes} min` : 'Venciendo…')
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="slot-booked"
      onClick={onClick}
      style={{ borderColor: cfg.cardBorder, background: cfg.cardBg, borderStyle: cfg.cardBorderStyle }}
      title={detalle}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {compact && (
          <span className="slot-status-dot" style={{ background: cfg.barColor }} />
        )}
        <span
          className="font-heading truncate-1"
          style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)', flex: 1, minWidth: 0 }}
        >
          {booking.clientName}
        </span>
        {!compact && (
          <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
            {cfg.label}
          </span>
        )}
      </div>

      <div className="payment-bar-track">
        <div className="payment-bar-fill" style={{ width: `${cfg.paidPercent}%`, background: cfg.barColor }} />
      </div>

      <div className="slot-finance">
        {/* Un turno sin confirmar no tiene plata que mostrar: lo único que
            importa es cuánto le queda antes de liberarse solo. */}
        {booking.status === 'pending' ? (
          <span className="num truncate-1" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)' }}>
            {minutosRestantes == null
              ? 'Sin confirmar'
              : minutosRestantes > 0
                ? `Vence en ${minutosRestantes} min`
                : 'Venciendo…'}
          </span>
        ) : saldo > 0 ? (
          <span className="num truncate-1" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {plata(booking.depositPaid)}
            {' · '}
            <span style={{ color: 'var(--amber)', fontWeight: 800 }}>Resta {plata(saldo)}</span>
          </span>
        ) : (
          <span
            className="truncate-1"
            style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--green)' }}
          >
            Pagado {plata(booking.depositPaid)}
          </span>
        )}

        {(booking.senaSinValidar || booking.cantinaExtras?.length > 0) && (
          <span className="slot-finance-alertas">
            {booking.senaSinValidar && (
              <Eye size={11} color="var(--color-partial-500)" />
            )}
            {booking.cantinaExtras?.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.66rem', fontWeight: 800, color: 'var(--volt)' }}>
                <Utensils size={11} />{booking.cantinaExtras.length}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GrillaTurnos({ bookings, weekBookings = [], onOpenNuevoTurnoWithSlot, onOpenBookingDetails }) {
  const [filterCancha, setFilterCancha] = useState('all');
  const [filterSport,  setFilterSport]  = useState('all');
  // 'dia' (de siempre) o 'semana' — la semana necesita UNA sola cancha
  // (columnas = días), así que reusa el mismo filtro de cancha de abajo.
  const [vista, setVista] = useState('dia');

  const canchasActivas = useCanchasActivas();
  const selectedDate   = useSelectedDate();
  const kpis           = useDayKpis(selectedDate);
  const config         = useConfig();

  const diasSemana = rangeDays(startOfWeek(selectedDate), 7);
  const timeSlotsDia    = horasHabilitadasEnFecha(config?.operacion, selectedDate);
  const timeSlotsSemana = horasUnion(config?.operacion);
  const timeSlots = vista === 'semana' ? timeSlotsSemana : timeSlotsDia;

  // Filtrado de canchas para la grilla
  const filteredCanchas = canchasActivas.filter((c) => {
    if (filterCancha !== 'all' && c.id !== filterCancha) return false;
    if (filterSport  !== 'all' && c.deporte !== filterSport)  return false;
    return true;
  });

  // La vista Semana muestra UNA cancha (columnas = 7 días) — no existe
  // "Todas" ahí. El chip "Todas" se oculta más abajo cuando vista==='semana',
  // y este efecto fija la primera cancha activa apenas se entra a esa vista
  // con el filtro todavía en "all", para que el chip resaltado coincida
  // siempre con lo que se está mostrando (nada de resolverlo solo local y
  // dejar la UI ambigua). Al volver a Día no hace falta resetear nada: el
  // chip "Todas" reaparece solo y el usuario lo puede tocar de nuevo.
  useEffect(() => {
    if (vista !== 'semana' || filterCancha !== 'all') return;
    const primera = canchasActivas.find((c) => filterSport === 'all' || c.deporte === filterSport);
    if (primera) setFilterCancha(primera.id);
  }, [vista, filterCancha, filterSport, canchasActivas]);

  const canchaSemana = vista === 'semana' ? (filteredCanchas[0] ?? null) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─── Header ─── */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Grilla de Turnos</h1>
          <p className="section-subtitle">Panel de reservas en tiempo real</p>
        </div>
      </div>

      {/* ─── Fase 3: DateNav conectado al store ─── */}
      <DateNav />

      {/* ─── Vista Día / Semana ─── */}
      <div className="tab-switcher" style={{ alignSelf: 'flex-start' }}>
        <button className={`tab-btn ${vista === 'dia' ? 'active' : ''}`} onClick={() => setVista('dia')}>
          Día
        </button>
        <button className={`tab-btn ${vista === 'semana' ? 'active' : ''}`} onClick={() => setVista('semana')}>
          Semana
        </button>
      </div>

      {/* ─── KPI Cards (datos reales del store) ─── */}
      <div className="kpi-grid">
        <KpiCard
          label="Ocupación"
          value={`${kpis.ocupacionPct}%`}
          sub={
            kpis.sinConfirmar > 0
              ? `${kpis.ocupados} de ${kpis.totalSlots} · ${kpis.sinConfirmar} sin confirmar`
              : `${kpis.ocupados} de ${kpis.totalSlots} turnos`
          }
          subColor={kpis.sinConfirmar > 0 ? 'var(--amber)' : 'var(--green)'}
          icon={<Zap size={18} />}
          accent="green"
        />
        <KpiCard
          label="Recaudado (Señas)"
          value={formatARSCompact(kpis.recaudado)}
          sub={`Resta cobrar: ${formatARSCompact(kpis.pendiente)}`}
          subColor="var(--amber)"
          icon={<DollarSign size={18} />}
          accent="blue"
        />
        <KpiCard
          label="Bot IA WhatsApp"
          value={`${kpis.reservasBot} Res.`}
          sub="Reservas automáticas"
          subColor="var(--volt)"
          icon={<Sparkles size={18} />}
          accent="volt"
        />
        <KpiCard
          label="Turnos Fijos"
          value={`${kpis.turnosFijosHoy} Eq.`}
          sub="Activos este día"
          subColor="var(--purple)"
          icon={<Clock size={18} />}
          accent="purple"
        />
      </div>

      {/* ─── Filters ─── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, minWidth: 0,
        padding: '10px 14px', borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
      }}>
        {/* Sport Filter */}
        <div className="tab-switcher" style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
          {[
            { key: 'all',      label: 'Todos' },
            { key: 'futbol5',  label: 'Fútbol 5' },
            { key: 'padel',    label: 'Pádel' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`tab-btn ${filterSport === key ? 'active' : ''}`}
              onClick={() => setFilterSport(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Court Filter — en vista Semana no existe "Todas": se ve una sola
            cancha a la vez (columnas = 7 días), así que el chip se oculta
            para no sugerir algo que no se puede mostrar. */}
        <div className="tab-switcher" style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
          {vista === 'dia' && (
            <button
              className={`tab-btn ${filterCancha === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCancha('all')}
            >
              Todas
            </button>
          )}
          {canchasActivas.map((c) => (
            <button
              key={c.id}
              className={`tab-btn ${filterCancha === c.id ? 'active' : ''}`}
              onClick={() => setFilterCancha(vista === 'dia' && filterCancha === c.id ? 'all' : c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color ?? 'var(--celeste)', flexShrink: 0 }} />
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      {vista === 'dia' ? (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div className="turno-grid-scroll">
          <div style={{
            minWidth: anchoMinimoDia(filteredCanchas.length),
            width: '100%',
            padding: '14px 14px 18px',
          }}>

            {/* Column Headers */}
            <div
              className="turno-grid-row"
              style={{
                marginBottom: 10,
                gridTemplateColumns: `${COL_HORA}px repeat(${filteredCanchas.length}, minmax(var(--slot-col-dia), 1fr))`,
              }}
            >
              <div
                className="turno-col-head is-sticky"
                style={{
                  justifyContent: 'center',
                  fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-faint)',
                }}
              >
                Hora
              </div>

              {filteredCanchas.map((cancha) => (
                <div
                  key={cancha.id}
                  className="turno-col-head"
                  style={{ borderTop: `3px solid ${cancha.color ?? 'var(--celeste)'}` }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h4 className="font-heading truncate-1" style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      {cancha.nombre}
                    </h4>
                    <p className="truncate-1" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {cancha.subtitulo ?? cancha.deporte} · Noche: {formatARSCompact(cancha.precioNoche)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 900, padding: '2px 7px', borderRadius: 99,
                    background: `rgb(from ${cancha.color ?? 'var(--celeste)'} r g b / 0.1)`,
                    border: `1px solid rgb(from ${cancha.color ?? 'var(--celeste)'} r g b / 0.27)`,
                    color: cancha.color ?? 'var(--celeste)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                  }}>
                    Activa
                  </span>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeSlots.map((slotTime) => {
                const hour    = parseInt(slotTime.split(':')[0], 10);
                const isNight = hour >= 19 || slotTime === '00:00';

                return (
                  <div
                    key={slotTime}
                    className="turno-grid-row"
                    style={{
                      gridTemplateColumns: `${COL_HORA}px repeat(${filteredCanchas.length}, minmax(var(--slot-col-dia), 1fr))`,
                    }}
                  >
                    {/* Time Cell */}
                    <div className="turno-time-cell" style={estiloCeldaHora(isNight)}>
                      <span className="font-heading num" style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {slotTime}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isNight ? 'var(--cyan)' : 'var(--amber)',
                        padding: '2px 5px', borderRadius: 4,
                      }}>
                        {isNight ? <Moon size={9} /> : <Sun size={9} />}
                      </span>
                    </div>

                    {/* Court Slots */}
                    {filteredCanchas.map((cancha) => {
                      const booking = bookings.find((b) => b.canchaId === cancha.id && b.time === slotTime);
                      return booking ? (
                        <BookedSlot
                          key={cancha.id}
                          booking={booking}
                          onClick={() => onOpenBookingDetails(booking)}
                        />
                      ) : (
                        <FreeSlot
                          key={cancha.id}
                          cancha={cancha}
                          slotTime={slotTime}
                          isNight={isNight}
                          onClick={() => onOpenNuevoTurnoWithSlot(cancha.id, slotTime, selectedDate)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      ) : !canchaSemana ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          borderRadius: 16, padding: 32, textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No hay ninguna cancha activa para mostrar la semana.
          </p>
        </div>
      ) : (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div className="turno-grid-scroll">
          <div style={{ minWidth: anchoMinimoSemana(), width: '100%', padding: '14px 14px 18px' }}>

            {/* Subtítulo: qué cancha se está mirando */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: canchaSemana.color ?? 'var(--celeste)' }} />
              <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                {canchaSemana.nombre}
              </h4>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {filteredCanchas.length > 1 ? '· elegí una sola cancha arriba para ver otra' : ''}
              </span>
            </div>

            {/* Column Headers: 7 días */}
            <div
              className="turno-grid-row"
              style={{
                marginBottom: 10,
                gridTemplateColumns: `${COL_HORA}px repeat(7, minmax(var(--slot-col-semana), 1fr))`,
              }}
            >
              <div
                className="turno-col-head is-sticky"
                style={{
                  justifyContent: 'center',
                  fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-faint)',
                }}
              >
                Hora
              </div>
              {diasSemana.map((fecha) => {
                const [, mm, dd] = fecha.split('-');
                const esHoy = fecha === selectedDate;
                return (
                  <div
                    key={fecha}
                    className="turno-col-head"
                    style={{
                      flexDirection: 'column', justifyContent: 'center', gap: 0, padding: '6px',
                      background: esHoy ? 'rgb(from var(--celeste) r g b / 0.08)' : undefined,
                      borderColor: esHoy ? 'rgb(from var(--celeste) r g b / 0.35)' : undefined,
                    }}
                  >
                    <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {DIAS_SEMANA[dayOfWeek(fecha)].corto}
                    </h4>
                    <p className="num" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{dd}/{mm}</p>
                  </div>
                );
              })}
            </div>

            {/* Time Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeSlots.map((slotTime) => {
                const hour    = parseInt(slotTime.split(':')[0], 10);
                const isNight = hour >= 19 || slotTime === '00:00';

                return (
                  <div
                    key={slotTime}
                    className="turno-grid-row"
                    style={{
                      gridTemplateColumns: `${COL_HORA}px repeat(7, minmax(var(--slot-col-semana), 1fr))`,
                    }}
                  >
                    <div className="turno-time-cell" style={estiloCeldaHora(isNight)}>
                      <span className="font-heading num" style={{ fontWeight: 900, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {slotTime}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isNight ? 'var(--cyan)' : 'var(--amber)',
                        padding: '2px 5px', borderRadius: 4,
                      }}>
                        {isNight ? <Moon size={9} /> : <Sun size={9} />}
                      </span>
                    </div>

                    {diasSemana.map((fecha) => {
                      const habilitada = horasHabilitadasEnFecha(config?.operacion, fecha).includes(slotTime);
                      if (!habilitada) return <DisabledSlot key={fecha} />;

                      const booking = weekBookings.find(
                        (b) => b.canchaId === canchaSemana.id && b.date === fecha && b.time === slotTime
                      );
                      return booking ? (
                        <BookedSlot key={fecha} booking={booking} onClick={() => onOpenBookingDetails(booking)} compact />
                      ) : (
                        <FreeSlot
                          key={fecha}
                          cancha={canchaSemana}
                          slotTime={slotTime}
                          isNight={isNight}
                          onClick={() => onOpenNuevoTurnoWithSlot(canchaSemana.id, slotTime, fecha)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
