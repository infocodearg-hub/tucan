/**
 * DisponibilidadHoraria.jsx — grilla día×hora editable desde Configuración.
 *
 * Antes el único horario era `config.operacion.slots`: un array plano, igual
 * los 7 días, que solo escribía el asistente de alta. Acá se edita de verdad,
 * día por día — sábado y domingo pueden tener más horas que un miércoles.
 *
 * Borrador local + botón "Guardar cambios" (no escribe al store en cada
 * click de un checkbox): con una grilla de 7×N casilleros, tipear al store
 * en cada toggle sería demasiado ruido. Se confirma todo junto, como en el
 * resto de los formularios largos de Configuración.
 *
 * `horasHabilitadasPorDia`/`horasHabilitadasEnFecha` (src/lib/disponibilidad.js)
 * son las que leen esto después — Grilla, Reportes, y su gemela en TypeScript
 * el bot y la web pública. Acá solo se ESCRIBE `config.operacion.disponibilidad`.
 */
import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useConfig, useConfigActions, useToast } from '../store';
import { DIAS_SEMANA_KEYS, horasHabilitadasPorDia } from '../lib/disponibilidad';
import { DIAS_SEMANA } from '../lib/date';
import CustomSelect from './CustomSelect';

const INTERVALOS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '60 minutos' },
  { value: 90, label: '90 minutos' },
];

const ANTICIPACIONES = [
  { value: 0, label: 'Sin restricción' },
  { value: 1, label: '1 hora' },
  { value: 2, label: '2 horas' },
  { value: 4, label: '4 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
];

/** Plantilla de horas `00:00..23:xx` según el intervalo elegido. */
function plantillaHoras(intervaloMin) {
  const out = [];
  const pasos = Math.round((24 * 60) / intervaloMin);
  for (let i = 0; i < pasos; i++) {
    const mins = i * intervaloMin;
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
}

export default function DisponibilidadHoraria() {
  const config = useConfig();
  const configActions = useConfigActions();
  const toast = useToast();
  const operacion = config?.operacion ?? {};

  const [intervaloMin, setIntervaloMin] = useState(operacion.intervaloMin ?? 60);
  const [duracionMin, setDuracionMin] = useState(operacion.duracionMin ?? 60);
  const [anticipacionMinHoras, setAnticipacionMinHoras] = useState(operacion.anticipacionMinHoras ?? 0);
  const [disponibilidad, setDisponibilidad] = useState(() => horasHabilitadasPorDia(operacion));

  // Si `operacion` cambia por fuera (otra pestaña, recarga de datos), se
  // relee el borrador — evita pisar con datos viejos algo que se guardó
  // desde otro lado en el medio.
  useEffect(() => {
    setIntervaloMin(operacion.intervaloMin ?? 60);
    setDuracionMin(operacion.duracionMin ?? 60);
    setAnticipacionMinHoras(operacion.anticipacionMinHoras ?? 0);
    setDisponibilidad(horasHabilitadasPorDia(operacion));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.operacion?.disponibilidad, config?.operacion?.slots]);

  const horas = plantillaHoras(intervaloMin);

  // Cambiar el intervalo regenera la plantilla de filas: se descartan del
  // borrador las horas que ya no caen en la grilla nueva (ej. 18:30 al pasar
  // de 30 a 60 minutos), para que lo que se ve marcado sea lo que se guarda.
  const handleIntervaloChange = (valor) => {
    const nuevas = new Set(plantillaHoras(valor));
    setDisponibilidad((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([dia, lista]) => [dia, lista.filter((h) => nuevas.has(h))])
      )
    );
    setIntervaloMin(valor);
  };

  const toggleCelda = (diaKey, hora) => {
    setDisponibilidad((prev) => {
      const actuales = prev[diaKey] ?? [];
      const nuevas = actuales.includes(hora)
        ? actuales.filter((h) => h !== hora)
        : [...actuales, hora].sort();
      return { ...prev, [diaKey]: nuevas };
    });
  };

  const seleccionarTodo = () => {
    setDisponibilidad(Object.fromEntries(DIAS_SEMANA_KEYS.map((k) => [k, [...horas]])));
  };

  const guardar = () => {
    // `slots` se sigue calculando (unión de todos los días) y guardando: es
    // lo que hoy todavía lee código que no pasó por
    // horasHabilitadasPorDia() (ej. `info_complejo` del bot, algunos
    // reportes). Que quede vacío rompería esos lugares para un tenant que
    // recién edita la grilla nueva.
    const slots = [...new Set(Object.values(disponibilidad).flat())].sort();
    configActions.actualizar({
      operacion: { intervaloMin, duracionMin, anticipacionMinHoras, disponibilidad, slots },
    });
    toast.success('Disponibilidad guardada');
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Intervalo de grilla</label>
          <CustomSelect options={INTERVALOS} value={intervaloMin} onChange={handleIntervaloChange} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Duración por defecto</label>
          <CustomSelect options={INTERVALOS} value={duracionMin} onChange={setDuracionMin} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Anticipación mínima</label>
          <CustomSelect options={ANTICIPACIONES} value={anticipacionMinHoras} onChange={setAnticipacionMinHoras} />
        </div>
      </div>
      <p className="form-hint">
        La duración todavía no cambia cuántos casilleros ocupa un turno en la grilla — un turno
        sigue siendo de un solo horario. Lo que sí hace efecto es la plantilla de abajo.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginTop: 10, flexWrap: 'wrap',
      }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Horarios habilitados por día
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={seleccionarTodo}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.76rem' }}
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            onClick={guardar}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.76rem' }}
          >
            <Save size={13} /> Guardar cambios
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left', padding: '6px 8px', fontSize: '0.66rem',
                color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Horario
              </th>
              {DIAS_SEMANA_KEYS.map((k) => (
                <th key={k} style={{
                  padding: '6px 8px', fontSize: '0.66rem', color: 'var(--text-faint)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {DIAS_SEMANA[Number(k)].corto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map((hora) => (
              <tr key={hora} style={{ borderTop: '1px solid var(--border-dim)' }}>
                <td className="num" style={{ padding: '5px 8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {hora}
                </td>
                {DIAS_SEMANA_KEYS.map((k) => {
                  const activo = (disponibilidad[k] ?? []).includes(hora);
                  return (
                    <td key={k} style={{ textAlign: 'center', padding: 3 }}>
                      <input
                        type="checkbox"
                        checked={activo}
                        onChange={() => toggleCelda(k, hora)}
                        style={{ width: 16, height: 16, accentColor: 'var(--celeste)', cursor: 'pointer' }}
                        aria-label={`${DIAS_SEMANA[Number(k)].largo} ${hora}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
