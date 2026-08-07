/**
 * OnboardingWizard.jsx — alta de un complejo nuevo.
 *
 * Una cuenta recién creada arranca vacía: sin canchas no hay grilla, así que
 * esta es la primera pantalla que ve el dueño. Cuatro pasos, todos editables
 * después desde Configuración — la idea es que pueda empezar a cargar turnos en
 * cinco minutos, no que deje todo perfecto acá.
 *
 * No escribe nada hasta el final: los pasos intermedios son estado local. Así
 * volver atrás no deja canchas a medio crear en la base.
 */
import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Clock, CreditCard, MapPin, Plus, Trash2, Volleyball,
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { DEPORTE_OPTIONS } from '../lib/status';
import { normalizePhone } from '../lib/phone';
import { useCanchaActions, useConfigActions, useToast } from '../store';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';

const COLOR_SWATCHES = [
  'var(--celeste)', 'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--red)', 'var(--volt)',
];

const PASOS = [
  { id: 'complejo', label: 'Tu complejo', icon: MapPin },
  { id: 'canchas', label: 'Canchas', icon: Volleyball },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'cobros', label: 'Cobros', icon: CreditCard },
];

const canchaVacia = (i) => ({
  nombre: `Cancha ${i + 1}`,
  deporte: 'futbol5',
  precioDia: '',
  precioNoche: '',
  color: COLOR_SWATCHES[i % COLOR_SWATCHES.length],
});

/** Genera `['18:00', '19:00', …]` desde/hasta con el paso elegido, en minutos. */
function generarSlots(desde, hasta, pasoMin) {
  const aMinutos = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const aTexto = (min) =>
    `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  const inicio = aMinutos(desde);
  // Un complejo que cierra a las 02:00 cruza la medianoche: se le suma un día
  // para que el rango no quede vacío en vez de generar los turnos de la noche.
  const fin = aMinutos(hasta) <= inicio ? aMinutos(hasta) + 24 * 60 : aMinutos(hasta);

  const out = [];
  for (let m = inicio; m < fin; m += pasoMin) out.push(aTexto(m));
  return out;
}

export default function OnboardingWizard() {
  const { tenantId, refrescarMembership } = useAuth();
  const configActions = useConfigActions();
  const canchaActions = useCanchaActions();
  const toast = useToast();

  const [paso, setPaso] = useState(0);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [complejo, setComplejo] = useState({ nombre: '', ciudad: '', direccion: '', telefono: '' });
  const [canchas, setCanchas] = useState([canchaVacia(0)]);
  const [horario, setHorario] = useState({ desde: '09:00', hasta: '23:00', paso: '60' });
  const [slots, setSlots] = useState(() => generarSlots('09:00', '23:00', 60));
  const [horaNocturnaDesde, setHoraNocturnaDesde] = useState('19:00');
  const [cobros, setCobros] = useState({ alias: '', cbu: '', senaMinimaPorcentaje: '50' });

  const setCancha = (i, patch) =>
    setCanchas((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const regenerarSlots = (next) => {
    setHorario(next);
    setSlots(generarSlots(next.desde, next.hasta, Number(next.paso)));
  };

  // ─── validación por paso ───────────────────────────────────────────────────
  const validarPaso = () => {
    if (paso === 0) {
      if (!complejo.nombre.trim()) return 'Poné el nombre del complejo.';
      return '';
    }
    if (paso === 1) {
      if (!canchas.length) return 'Cargá al menos una cancha.';
      for (const c of canchas) {
        if (!c.nombre.trim()) return 'Todas las canchas necesitan un nombre.';
        if (c.precioDia === '' || Number(c.precioDia) < 0) {
          return `Falta el precio de día de "${c.nombre}".`;
        }
        if (c.precioNoche === '' || Number(c.precioNoche) < 0) {
          return `Falta el precio de noche de "${c.nombre}".`;
        }
      }
      return '';
    }
    if (paso === 2) {
      if (!slots.length) return 'El rango horario no genera ningún turno.';
      return '';
    }
    return '';
  };

  const avanzar = () => {
    const err = validarPaso();
    if (err) return setError(err);
    setError('');
    setPaso((p) => p + 1);
  };

  // ─── guardado final ────────────────────────────────────────────────────────
  const finalizar = async () => {
    setError('');
    setGuardando(true);

    configActions.actualizar({
      complejo: {
        nombre: complejo.nombre.trim(),
        ciudad: complejo.ciudad.trim(),
        direccion: complejo.direccion.trim(),
        telefono: normalizePhone(complejo.telefono) ?? complejo.telefono.trim(),
      },
      pagos: {
        alias: cobros.alias.trim(),
        cbu: cobros.cbu.trim(),
        senaMinimaPorcentaje: Number(cobros.senaMinimaPorcentaje) || 50,
      },
      operacion: { slots, horaNocturnaDesde, permitirCargaRetroactiva: false },
    });

    canchas.forEach((c, i) => {
      canchaActions.crear({
        nombre: c.nombre.trim(),
        subtitulo: '',
        deporte: c.deporte,
        precioDia: Number(c.precioDia),
        precioNoche: Number(c.precioNoche),
        color: c.color,
        activa: true,
        orden: i,
      });
    });

    // Marca informativa: la app decide qué mostrar mirando si hay canchas, no
    // esta bandera. Sirve para saber desde afuera qué cuentas terminaron el alta.
    if (tenantId) {
      const { error: err } = await supabase
        .from('tenants')
        .update({ onboarding_completo: true })
        .eq('id', tenantId);
      if (err) console.warn('[tucan] no se pudo marcar el alta como completa', err);
      await refrescarMembership();
    }

    setGuardando(false);
    toast.success('¡Listo! Ya podés empezar a cargar turnos.');
  };

  const PasoIcon = PASOS[paso].icon;

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-pitch)', padding: '32px 20px',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    }}>
      <div style={{ width: '100%', maxWidth: 620 }}>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="font-heading" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
            Configurá tu complejo
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Cuatro pasos rápidos. Todo esto se puede cambiar después desde Configuración.
          </p>
        </div>

        {/* Progreso */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {PASOS.map((p, i) => (
            <div
              key={p.id}
              title={p.label}
              style={{
                flex: 1, height: 4, borderRadius: 99,
                background: i <= paso ? 'var(--celeste)' : 'var(--border-dim)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          borderRadius: 18, padding: '24px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <PasoIcon size={17} style={{ color: 'var(--celeste)' }} />
            <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {PASOS[paso].label}
            </h2>
            <span className="num" style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-faint)' }}>
              {paso + 1} / {PASOS.length}
            </span>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 14, borderRadius: 10,
              background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)',
              color: 'var(--red)', fontSize: '0.8rem', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* ─── Paso 1: datos del complejo ─── */}
          {paso === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Nombre del complejo *">
                <input
                  className="form-input" value={complejo.nombre} autoFocus
                  placeholder="Complejo El Maracaná"
                  onChange={(e) => setComplejo({ ...complejo, nombre: e.target.value })}
                />
              </Campo>
              <Campo label="Ciudad">
                <input
                  className="form-input" value={complejo.ciudad} placeholder="Córdoba"
                  onChange={(e) => setComplejo({ ...complejo, ciudad: e.target.value })}
                />
              </Campo>
              <Campo label="Dirección">
                <input
                  className="form-input" value={complejo.direccion} placeholder="Av. Colón 1234"
                  onChange={(e) => setComplejo({ ...complejo, direccion: e.target.value })}
                />
              </Campo>
              <Campo label="Teléfono / WhatsApp">
                <input
                  className="form-input" value={complejo.telefono} placeholder="351 234 5678"
                  onChange={(e) => setComplejo({ ...complejo, telefono: e.target.value })}
                />
              </Campo>
            </div>
          )}

          {/* ─── Paso 2: canchas ─── */}
          {paso === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {canchas.map((c, i) => (
                <div key={i} style={{
                  padding: 14, borderRadius: 12, background: 'var(--bg-surface)',
                  border: '1px solid var(--border-dim)', display: 'flex',
                  flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 99, background: c.color, flexShrink: 0,
                    }} />
                    <input
                      className="form-input" value={c.nombre} placeholder="Nombre"
                      style={{ flex: '1 1 140px', minWidth: 0 }}
                      onChange={(e) => setCancha(i, { nombre: e.target.value })}
                    />
                    {canchas.length > 1 && (
                      <button
                        type="button" className="row-icon-btn" aria-label={`Quitar ${c.nombre}`}
                        onClick={() => setCanchas((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    <Campo label="Deporte" compacto>
                      <CustomSelect
                        options={DEPORTE_OPTIONS}
                        value={c.deporte}
                        onChange={(v) => setCancha(i, { deporte: v })}
                      />
                    </Campo>
                    <Campo label="Precio de día" compacto>
                      <input
                        className="form-input num" type="number" min="0" value={c.precioDia}
                        placeholder="0"
                        onChange={(e) => setCancha(i, { precioDia: e.target.value })}
                      />
                    </Campo>
                    <Campo label="Precio de noche" compacto>
                      <input
                        className="form-input num" type="number" min="0" value={c.precioNoche}
                        placeholder="0"
                        onChange={(e) => setCancha(i, { precioNoche: e.target.value })}
                      />
                    </Campo>
                  </div>
                </div>
              ))}

              <button
                type="button" className="btn-secondary"
                style={{ justifyContent: 'center', padding: '10px' }}
                onClick={() => setCanchas((prev) => [...prev, canchaVacia(prev.length)])}
              >
                <Plus size={15} /> Agregar otra cancha
              </button>
            </div>
          )}

          {/* ─── Paso 3: horarios ─── */}
          {paso === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <Campo label="Abre a las" compacto>
                  <input
                    className="form-input num" type="time" value={horario.desde}
                    onChange={(e) => regenerarSlots({ ...horario, desde: e.target.value })}
                  />
                </Campo>
                <Campo label="Cierra a las" compacto>
                  <input
                    className="form-input num" type="time" value={horario.hasta}
                    onChange={(e) => regenerarSlots({ ...horario, hasta: e.target.value })}
                  />
                </Campo>
                <Campo label="Duración del turno" compacto>
                  <CustomSelect
                    options={[
                      { value: '60', label: '1 hora' },
                      { value: '90', label: '1 hora y media' },
                      { value: '120', label: '2 horas' },
                    ]}
                    value={horario.paso}
                    onChange={(v) => regenerarSlots({ ...horario, paso: v })}
                  />
                </Campo>
              </div>

              <Campo label="A partir de qué hora cobrás tarifa de noche">
                <input
                  className="form-input num" type="time" value={horaNocturnaDesde}
                  style={{ maxWidth: 160 }}
                  onChange={(e) => setHoraNocturnaDesde(e.target.value)}
                />
              </Campo>

              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>
                  Turnos que se van a poder reservar ({slots.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip-hoverable num"
                      title="Quitar este horario"
                      onClick={() => setSlots((prev) => prev.filter((x) => x !== s))}
                      style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700,
                        background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 8 }}>
                  Tocá un horario para sacarlo (por ejemplo, si a esa hora entrenás vos).
                </p>
              </div>
            </div>
          )}

          {/* ─── Paso 4: cobros ─── */}
          {paso === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Estos datos se los mandás al jugador cuando reserva. Podés dejarlos vacíos
                y completarlos después.
              </p>
              <Campo label="Alias para transferencias">
                <input
                  className="form-input" value={cobros.alias} placeholder="maracana.canchas"
                  onChange={(e) => setCobros({ ...cobros, alias: e.target.value })}
                />
              </Campo>
              <Campo label="CBU / CVU">
                <input
                  className="form-input num" value={cobros.cbu} placeholder="0000000000000000000000"
                  onChange={(e) => setCobros({ ...cobros, cbu: e.target.value })}
                />
              </Campo>
              <Campo label="Seña mínima (% del turno)">
                <input
                  className="form-input num" type="number" min="0" max="100"
                  value={cobros.senaMinimaPorcentaje} style={{ maxWidth: 120 }}
                  onChange={(e) => setCobros({ ...cobros, senaMinimaPorcentaje: e.target.value })}
                />
              </Campo>
            </div>
          )}

          {/* Navegación */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            {paso > 0 && (
              <button
                type="button" className="btn-secondary" disabled={guardando}
                onClick={() => { setError(''); setPaso((p) => p - 1); }}
                style={{ padding: '11px 16px' }}
              >
                <ArrowLeft size={15} /> Atrás
              </button>
            )}
            <button
              type="button" className="btn-primary" disabled={guardando}
              onClick={paso === PASOS.length - 1 ? finalizar : avanzar}
              style={{ flex: 1, justifyContent: 'center', padding: '11px 16px', minWidth: 160 }}
            >
              {paso === PASOS.length - 1 ? (
                <>
                  <Check size={15} style={{ color: 'var(--on-accent)' }} />
                  {guardando ? 'Guardando…' : 'Terminar y entrar'}
                </>
              ) : (
                <>Siguiente <ArrowRight size={15} style={{ color: 'var(--on-accent)' }} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children, compacto = false }) {
  return (
    <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
      <label className="form-label" style={compacto ? { fontSize: '0.72rem' } : undefined}>
        {label}
      </label>
      {children}
    </div>
  );
}
