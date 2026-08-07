/**
 * DateNav.jsx — Fase 3 + calendario propio
 *
 * Navegador de fechas: chevrones, calendario propio (popover), tira de 7
 * días con punto de ocupación. Escribe directamente en ui.selectedDate del
 * store.
 *
 * El calendario es propio (no `<input type="date">` + showPicker()) porque
 * el picker nativo del SO no se puede estilar — quedaba un cuadro gris
 * genérico pegoteado sobre el resto de la UI, sin relación visual con la
 * app.
 */
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  useSelectedDate,
  useUIActions,
  useDayKpis,
} from '../store';
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysInMonth,
  formatLongDate,
  formatMediumDate,
  formatMonth,
  monthKey,
  relativeDayLabel,
  startOfWeek,
  rangeDays,
  todayISO,
  DIAS_SEMANA,
} from '../lib/date';

// ─── Mini KPI dot por día ─────────────────────────────────────────────────────
// Llama useDayKpis por separado para cada celda de la tira
function DayCell({ date, isSelected, onClick }) {
  const kpis    = useDayKpis(date);
  const isToday = date === todayISO();
  const hasOccupation = kpis.ocupados > 0;

  return (
    <button
      onClick={() => onClick(date)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:             3,
        padding:        '7px 10px',
        borderRadius:   10,
        cursor:         'pointer',
        border:         `1px solid ${isSelected ? 'rgb(from var(--celeste) r g b / 0.5)' : 'transparent'}`,
        background:     isSelected
          ? 'rgb(from var(--celeste) r g b / 0.12)'
          : isToday
          ? 'rgb(from var(--celeste) r g b / 0.05)'
          : 'transparent',
        transition:     'all 0.15s ease',
        minWidth:        48,
        flexShrink:      0,
      }}
    >
      {/* Etiqueta: Hoy / Mañana / Ayer / "Vie 8" */}
      <span style={{
        fontSize:   '0.68rem',
        fontWeight:  isSelected ? 900 : isToday ? 800 : 600,
        color:       isSelected ? 'var(--celeste)' : isToday ? 'var(--celeste)' : 'var(--text-muted)',
        lineHeight:  1,
        whiteSpace:  'nowrap',
      }}>
        {relativeDayLabel(date)}
      </span>

      {/* Punto de ocupación */}
      <span style={{
        width:          6,
        height:         6,
        borderRadius:   '50%',
        background:     hasOccupation
          ? isSelected ? 'var(--celeste)' : 'rgb(from var(--celeste) r g b / 0.6)'
          : 'var(--border-dim)',
        transition:     'background 0.2s',
      }} />
    </button>
  );
}

// ─── Calendario propio (popover) ───────────────────────────────────────────────
function CalendarPopover({ selectedDate, onSelect, onClose }) {
  const [viewMonth, setViewMonth] = useState(monthKey(selectedDate));
  const ref = useRef(null);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const first = `${viewMonth}-01`;
  const leadBlanks = dayOfWeek(first) - 1; // 0 si el 1° cae lunes
  const total = daysInMonth(viewMonth);
  const cells = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...Array.from({ length: total }, (_, i) => `${viewMonth}-${String(i + 1).padStart(2, '0')}`),
  ];
  const today = todayISO();
  const weekdayLabels = DIAS_SEMANA.slice(1).map((d) => d.corto[0]);

  return (
    <>
      {/* Solo se ve en mobile, donde el calendario pasa a ser un diálogo
          centrado: da algo que tocar para cerrar y despega el panel del
          fondo. En desktop queda oculto (ver .calendario-backdrop). */}
      <div className="calendario-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="dropdown-menu calendario-popover"
        role="dialog"
        aria-label="Elegir fecha"
      >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          type="button"
          className="btn-icon"
          style={{ width: 30, height: 30 }}
          onClick={() => setViewMonth(monthKey(addMonths(first, -1)))}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="font-heading" style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
          {formatMonth(viewMonth)}
        </span>
        <button
          type="button"
          className="btn-icon"
          style={{ width: 30, height: 30 }}
          onClick={() => setViewMonth(monthKey(addMonths(first, 1)))}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {weekdayLabels.map((l, i) => (
          <span key={i} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {l}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((iso, i) => {
          if (!iso) return <span key={`b${i}`} />;
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => { onSelect(iso); onClose(); }}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: isSelected ? 900 : isToday ? 800 : 600,
                cursor: 'pointer',
                color: isSelected ? 'var(--on-accent)' : isToday ? 'var(--celeste)' : 'var(--text-primary)',
                background: isSelected ? 'var(--celeste)' : isToday ? 'rgb(from var(--celeste) r g b / 0.1)' : 'transparent',
                border: isToday && !isSelected ? '1px solid rgb(from var(--celeste) r g b / 0.35)' : '1px solid transparent',
              }}
            >
              {Number(iso.slice(-2))}
            </button>
          );
        })}
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DateNav() {
  const selectedDate  = useSelectedDate();
  const { setSelectedDate } = useUIActions();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const weekStart = startOfWeek(selectedDate);
  const weekDays  = rangeDays(weekStart, 7);

  const goDay = (delta) => setSelectedDate(addDays(selectedDate, delta));
  const goToday = () => setSelectedDate(todayISO());

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignSelf:       'flex-start',
      gap:             10,
      padding:        '12px 14px',
      borderRadius:    14,
      background:     'var(--bg-card)',
      border:         '1px solid var(--border-dim)',
      width:           '100%',
      maxWidth:        '100%',
      boxSizing:       'border-box',
    }}>

      {/* Fila superior: chevrones + label + [Hoy] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
        <button
          className="btn-icon"
          onClick={() => goDay(-1)}
          title="Día anterior"
          style={{ flexShrink: 0 }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 0 }}>
          <button
            onClick={() => setIsCalendarOpen((o) => !o)}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:             7,
              padding:        '7px 12px',
              borderRadius:   10,
              background:     'var(--bg-surface)',
              border:         `1px solid ${isCalendarOpen ? 'var(--celeste)' : 'var(--border-dim)'}`,
              cursor:         'pointer',
              minWidth:        0,
              boxSizing:       'border-box',
            }}
          >
            <CalendarDays size={14} color="var(--celeste)" style={{ flexShrink: 0 }} />
            <span className="date-nav-long" style={{
              fontWeight:     800,
              fontSize:       '0.84rem',
              color:          'var(--text-primary)',
              overflow:       'hidden',
              textOverflow:   'ellipsis',
              whiteSpace:     'nowrap',
            }}>
              {formatLongDate(selectedDate)}
            </span>
            <span className="date-nav-short" style={{
              fontWeight:     800,
              fontSize:       '0.84rem',
              color:          'var(--text-primary)',
              overflow:       'hidden',
              textOverflow:   'ellipsis',
              whiteSpace:     'nowrap',
            }}>
              {formatMediumDate(selectedDate)}
            </span>
          </button>

          {isCalendarOpen && (
            <CalendarPopover
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              onClose={() => setIsCalendarOpen(false)}
            />
          )}
        </div>

        <button
          className="btn-icon"
          onClick={() => goDay(1)}
          title="Día siguiente"
          style={{ flexShrink: 0 }}
        >
          <ChevronRight size={16} />
        </button>

        {selectedDate !== todayISO() && (
          <button
            onClick={goToday}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, flexShrink: 0 }}
          >
            Hoy
          </button>
        )}
      </div>

      {/* Tira de 7 días */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:             2,
        overflowX:      'auto',
        paddingBottom:   2,
        width:          '100%',
        WebkitOverflowScrolling: 'touch',
      }}>
        {weekDays.map((date) => (
          <DayCell
            key={date}
            date={date}
            isSelected={date === selectedDate}
            onClick={setSelectedDate}
          />
        ))}
      </div>
    </div>
  );
}
