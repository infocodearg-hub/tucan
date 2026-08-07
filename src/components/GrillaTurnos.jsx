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
  Plus, Bot, CheckCircle2, DollarSign,
  Clock, Zap, ShoppingBag, Sparkles, Sun, Moon,
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

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  // Reservado desde la web o el bot y todavía sin confirmar. Se pinta apagado y
  // con borde punteado a propósito: es el único estado que puede desaparecer
  // solo, y de lejos tiene que leerse como "esto todavía no es tuyo".
  pending: {
    badgeClass: 'badge-pending', label: 'Sin confirmar',
    cardBorder: 'var(--color-border-strong)', cardBg: 'transparent',
    cardBorderStyle: 'dashed',
    barColor: 'var(--color-border-strong)', paidPercent: 0,
  },
  partial: {
    badgeClass: 'badge-partial', label: 'Señado',
    cardBorder: 'rgba(255,179,0,0.4)', cardBg: 'rgba(255,179,0,0.04)',
    barColor: 'var(--amber)', paidPercent: 50,
  },
  paid: {
    badgeClass: 'badge-paid', label: 'Pagado 100%',
    cardBorder: 'rgba(0,176,255,0.4)', cardBg: 'rgba(0,176,255,0.04)',
    barColor: 'var(--blue)', paidPercent: 100,
  },
  fixed: {
    badgeClass: 'badge-fixed', label: 'Turno Fijo',
    cardBorder: 'rgba(185,136,252,0.4)', cardBg: 'rgba(185,136,252,0.04)',
    barColor: 'var(--purple)', paidPercent: 100,
  },
  blocked: {
    badgeClass: 'badge-blocked', label: 'Bloqueado',
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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p className="label-caps truncate-2">{label}</p>
        <h4
          className="font-heading num truncate-1"
          style={{ fontSize: 'clamp(1.25rem, 4vw, 1.65rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.05 }}
        >
          {value}
        </h4>
        <p className="truncate-2" style={{ fontSize: '0.72rem', color: subColor, fontWeight: 600, lineHeight: 1.35 }}>
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
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--bg-card-hover)', border: '1px dashed var(--border-mid)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Plus size={14} color="var(--text-faint)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Disponible
          </p>
          <p className="num" style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 1 }}>
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
    <div
      className="slot-free"
      style={{ opacity: 0.35, cursor: 'default', pointerEvents: 'none' }}
      title="No disponible este día"
    >
      <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textAlign: 'center', width: '100%' }}>—</p>
    </div>
  );
}

// ─── Booked Slot ──────────────────────────────────────────────────────────────
function BookedSlot({ booking, onClick }) {
  const cfg     = STATUS_CONFIG[booking.status] || STATUS_CONFIG.partial;
  const balance = (booking.totalPrice || 0) - (booking.depositPaid || 0);
  const minutosRestantes = minutosPara(booking.expiraAt);

  return (
    <div
      className="slot-booked"
      onClick={onClick}
      style={{ borderColor: cfg.cardBorder, background: cfg.cardBg, borderStyle: cfg.cardBorderStyle }}
      title={
        booking.status === 'pending'
          ? `${booking.clientName} — Sin confirmar${minutosRestantes != null ? `, se libera en ${minutosRestantes} min` : ''}`
          : `${booking.clientName} — Click para ver detalles`
      }
    >
      {/* Top: Name + Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <span className="font-heading" style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {booking.clientName}
          </span>
          {booking.channel === 'bot_ai' && (
            <span style={{
              fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6,
              background: 'rgb(from var(--green) r g b / 0.15)', border: '1px solid rgb(from var(--green) r g b / 0.3)',
              color: 'var(--green)', fontWeight: 800, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Bot size={9} />IA
            </span>
          )}
        </div>
        <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.62rem', padding: '2px 7px', flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>

      {/* Payment bar */}
      <div className="payment-bar-track">
        <div className="payment-bar-fill" style={{ width: `${cfg.paidPercent}%`, background: cfg.barColor }} />
      </div>

      {/* Bottom: Finance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {/* En un turno sin confirmar no hay plata que mostrar: lo único que
              importa es cuánto le queda antes de liberarse. */}
          {booking.status === 'pending' ? (
            <span
              className="num truncate-1"
              style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)' }}
            >
              <Clock size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
              {minutosRestantes == null
                ? 'Esperando confirmación'
                : minutosRestantes > 0
                  ? `Se libera en ${minutosRestantes} min`
                  : 'Venciendo…'}
            </span>
          ) : (
          <>
          <span className="num" style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatARS(booking.depositPaid)}
          </span>
          {balance > 0 ? (
            <span className="num" style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--amber)' }}>
              · Resta {formatARS(balance)}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 800, color: 'var(--green)' }}>
              <CheckCircle2 size={11} /> OK
            </span>
          )}
          </>
          )}
        </div>
        {booking.senaSinValidar && (
          <span
            title="Seña declarada por WhatsApp — falta revisar el comprobante"
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.66rem', fontWeight: 800, color: 'var(--color-partial-500)', flexShrink: 0 }}
          >
            <Clock size={10} /> sin validar
          </span>
        )}
        {booking.cantinaExtras?.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 800, color: 'var(--volt)' }}>
            <ShoppingBag size={10} />{booking.cantinaExtras.length}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
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
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{
            minWidth: filteredCanchas.length > 1 ? 540 : 320,
            width: '100%',
            padding: '14px 14px 18px',
          }}>

            {/* Column Headers */}
            <div style={{
              display: 'grid',
              gap: 8,
              marginBottom: 10,
              gridTemplateColumns: `76px repeat(${filteredCanchas.length}, minmax(200px, 1fr))`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px', borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-faint)',
              }}>
                Hora
              </div>

              {filteredCanchas.map((cancha) => (
                <div key={cancha.id} style={{
                  padding: '8px 12px', borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-dim)',
                  borderTop: `3px solid ${cancha.color ?? 'var(--celeste)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      {cancha.nombre}
                    </h4>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {cancha.subtitulo ?? cancha.deporte} · Noche: {formatARSCompact(cancha.precioNoche)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 900, padding: '2px 7px', borderRadius: 99,
                    background: `rgb(from ${cancha.color ?? 'var(--celeste)'} r g b / 0.1)`,
                    border: `1px solid rgb(from ${cancha.color ?? 'var(--celeste)'} r g b / 0.27)`,
                    color: cancha.color ?? 'var(--celeste)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
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
                    style={{
                      display: 'grid',
                      gap: 8,
                      alignItems: 'center',
                      gridTemplateColumns: `76px repeat(${filteredCanchas.length}, minmax(200px, 1fr))`,
                    }}
                  >
                    {/* Time Cell */}
                    <div style={{
                      padding: '8px 4px', borderRadius: 10,
                      background: isNight ? 'rgba(0,229,255,0.04)' : 'rgba(255,179,0,0.04)',
                      border: `1px solid ${isNight ? 'rgba(0,229,255,0.15)' : 'rgba(255,179,0,0.12)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}>
                      <span className="font-heading num" style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {slotTime}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isNight ? 'var(--cyan)' : 'var(--amber)',
                        background: isNight ? 'rgba(0,229,255,0.1)' : 'rgba(255,179,0,0.1)',
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
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ minWidth: 760, width: '100%', padding: '14px 14px 18px' }}>

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
            <div style={{
              display: 'grid', gap: 8, marginBottom: 10,
              gridTemplateColumns: `76px repeat(7, minmax(96px, 1fr))`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px', borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-faint)',
              }}>
                Hora
              </div>
              {diasSemana.map((fecha) => {
                const [, mm, dd] = fecha.split('-');
                const esHoy = fecha === selectedDate;
                return (
                  <div key={fecha} style={{
                    padding: '8px 6px', borderRadius: 12, textAlign: 'center',
                    background: esHoy ? 'rgb(from var(--celeste) r g b / 0.08)' : 'var(--bg-surface)',
                    border: `1px solid ${esHoy ? 'rgb(from var(--celeste) r g b / 0.35)' : 'var(--border-dim)'}`,
                  }}>
                    <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {DIAS_SEMANA[dayOfWeek(fecha)].corto}
                    </h4>
                    <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{dd}/{mm}</p>
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
                    style={{
                      display: 'grid', gap: 8, alignItems: 'center',
                      gridTemplateColumns: `76px repeat(7, minmax(96px, 1fr))`,
                    }}
                  >
                    <div style={{
                      padding: '8px 4px', borderRadius: 10,
                      background: isNight ? 'rgba(0,229,255,0.04)' : 'rgba(255,179,0,0.04)',
                      border: `1px solid ${isNight ? 'rgba(0,229,255,0.15)' : 'rgba(255,179,0,0.12)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}>
                      <span className="font-heading num" style={{ fontWeight: 900, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {slotTime}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isNight ? 'var(--cyan)' : 'var(--amber)',
                        background: isNight ? 'rgba(0,229,255,0.1)' : 'rgba(255,179,0,0.1)',
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
                        <BookedSlot key={fecha} booking={booking} onClick={() => onOpenBookingDetails(booking)} />
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
