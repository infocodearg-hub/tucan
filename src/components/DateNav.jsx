/**
 * DateNav.jsx — Fase 3
 *
 * Navegador de fechas: chevrones, picker nativo, tira de 7 días con punto
 * de ocupación. Escribe directamente en ui.selectedDate del store.
 */
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  useSelectedDate,
  useUIActions,
  useDayKpis,
} from '../store';
import {
  addDays,
  formatLongDate,
  relativeDayLabel,
  startOfWeek,
  rangeDays,
  todayISO,
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
        border:         `1px solid ${isSelected ? 'rgba(0,230,118,0.5)' : 'transparent'}`,
        background:     isSelected
          ? 'rgba(0,230,118,0.12)'
          : isToday
          ? 'rgba(0,230,118,0.05)'
          : 'transparent',
        transition:     'all 0.15s ease',
        minWidth:        48,
      }}
    >
      {/* Etiqueta: Hoy / Mañana / Ayer / "Vie 8" */}
      <span style={{
        fontSize:   '0.68rem',
        fontWeight:  isSelected ? 900 : isToday ? 800 : 600,
        color:       isSelected ? 'var(--green)' : isToday ? 'var(--green)' : 'var(--text-muted)',
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
          ? isSelected ? 'var(--green)' : 'rgba(0,230,118,0.6)'
          : 'var(--border-dim)',
        transition:     'background 0.2s',
      }} />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DateNav() {
  const selectedDate  = useSelectedDate();
  const { setSelectedDate } = useUIActions();
  const pickerRef     = useRef(null);

  const weekStart = startOfWeek(selectedDate);
  const weekDays  = rangeDays(weekStart, 7);

  const goDay = (delta) => setSelectedDate(addDays(selectedDate, delta));
  const goToday = () => setSelectedDate(todayISO());

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      gap:             10,
      padding:        '12px 14px',
      borderRadius:    14,
      background:     'var(--bg-card)',
      border:         '1px solid var(--border-dim)',
    }}>

      {/* Fila superior: chevrones + label + [Hoy] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="btn-icon"
          onClick={() => goDay(-1)}
          title="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Trigger del picker nativo */}
        <button
          onClick={() => pickerRef.current?.showPicker()}
          style={{
            flex:           1,
            display:        'flex',
            alignItems:     'center',
            gap:             7,
            padding:        '7px 12px',
            borderRadius:   10,
            background:     'var(--bg-surface)',
            border:         '1px solid var(--border-dim)',
            cursor:         'pointer',
            minWidth:        0,
          }}
        >
          <CalendarDays size={14} color="var(--green)" style={{ flexShrink: 0 }} />
          <span style={{
            fontWeight:     800,
            fontSize:       '0.84rem',
            color:          'var(--text-primary)',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
            whiteSpace:     'nowrap',
          }}>
            {formatLongDate(selectedDate)}
          </span>

          {/* Input nativo oculto — da la rueda del SO en mobile gratis */}
          <input
            ref={pickerRef}
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            style={{
              position:   'absolute',
              opacity:     0,
              pointerEvents: 'none',
              width:       0,
              height:      0,
            }}
          />
        </button>

        <button
          className="btn-icon"
          onClick={() => goDay(1)}
          title="Día siguiente"
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
