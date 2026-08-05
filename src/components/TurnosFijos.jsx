/**
 * TurnosFijos.jsx — Fase 2
 *
 * Lee del store directo. Sin imports de mockData.js.
 *
 * Modelo nuevo vs. modelo viejo:
 *   - `diaSemana` numérico ISO (1=Lunes…7=Domingo) — usar DIAS_SEMANA[n].plural
 *   - `canchaId` FK real (no string libre) — usar useCanchasActivas() para labels
 *   - precio mensual derivado con precioMensualFijo() + occurrencesInMonth()
 *   - estado mensual `tf.estadoPorMes[mesKey]` → 'al_dia'|'pendiente'|'deuda'
 */
import React, { useState, useMemo } from 'react';
import {
  Repeat, CheckCircle2, Plus, Phone, User, DollarSign, X,
  Trash2, Pencil, AlertCircle,
} from 'lucide-react';
import {
  useTurnosFijos,
  useTurnoFijoActions,
  useCanchasActivas,
  useConfig,
  useToast,
} from '../store';
import { useConfirm } from './ConfirmDialog';
import { DIAS_SEMANA, monthKey, occurrencesInMonth, todayISO } from '../lib/date';
import { precioMensualFijo } from '../lib/pricing';
import { formatARS, formatARSCompact } from '../lib/format';
import {
  ESTADO_MES, ESTADO_MES_LABEL, ESTADO_MES_VARIANT,
} from '../lib/status';

// Opciones de hora para el selector del modal
const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 8;
  return { value: `${String(h).padStart(2, '0')}:00`, label: `${String(h).padStart(2, '0')}:00 hs` };
});

// Opciones de día de semana (ISO 1-7)
const DAY_OPTIONS = DIAS_SEMANA.slice(1).map((d) => ({
  value: d.n,
  label: d.largo,
}));

// ─── Selector nativo pequeño ────────────────────────────────────────────────

function NativeSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        // Convertir a número si es un día de semana
        const num = Number(val);
        onChange(Number.isNaN(num) || val === '' ? val : num);
      }}
      className="form-input"
      style={{ cursor: 'pointer' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Badge de estado mensual ─────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const label = ESTADO_MES_LABEL[estado] ?? '—';
  const variant = ESTADO_MES_VARIANT[estado] ?? 'sin_sena';
  const styles = {
    pagado:   { bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.3)',  color: 'var(--green)' },
    senado:   { bg: 'rgba(255,179,0,0.1)',  border: 'rgba(255,179,0,0.3)',  color: 'var(--amber)' },
    bloqueado:{ bg: 'rgba(255,79,79,0.1)',  border: 'rgba(255,79,79,0.3)',  color: 'var(--red)'   },
    sin_sena: { bg: 'rgba(140,140,140,0.1)',border: 'rgba(140,140,140,0.2)',color: 'var(--text-muted)'},
    libre:    { bg: 'rgba(140,140,140,0.1)',border: 'rgba(140,140,140,0.2)',color: 'var(--text-muted)'},
    fijo:     { bg: 'rgba(185,136,252,0.1)',border: 'rgba(185,136,252,0.3)',color: 'var(--purple)' },
  };
  const s = styles[variant] ?? styles.sin_sena;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 99, flexShrink: 0,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontSize: '0.72rem', fontWeight: 800,
    }}>
      {estado === ESTADO_MES.al_dia ? `✓ ${label}` : `⚠ ${label}`}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TurnosFijos() {
  const turnosFijos   = useTurnosFijos();
  const canchas       = useCanchasActivas();
  const config        = useConfig();
  const tfActions     = useTurnoFijoActions();
  const toast         = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const mesActual     = monthKey(todayISO());
  const nightFrom     = config?.operacion?.horaNocturnaDesde ?? '19:00';

  // ─── Estado local del modal de alta/edición ─────────────────────────────
  // modalTf: null (cerrado) | 'new' (alta) | TurnoFijo completo (edición)
  const [modalTf,      setModalTf]     = useState(null);
  const [teamName,    setTeamName]    = useState('');
  const [captain,     setCaptain]     = useState('');
  const [phone,       setPhone]       = useState('');
  const [diaSemana,   setDiaSemana]   = useState(5);   // Viernes
  const [hora,        setHora]        = useState('21:00');
  const [canchaId,    setCanchaId]    = useState(canchas[0]?.id ?? '');
  const [formError,   setFormError]   = useState('');
  const isEdit = modalTf && modalTf !== 'new';

  // ─── Opciones de cancha para el selector ────────────────────────────────
  const canchaOptions = useMemo(
    () => canchas.map((c) => ({ value: c.id, label: c.nombre })),
    [canchas]
  );

  // ─── Derivar precio mensual para cada turno ──────────────────────────────
  function precioParaTf(tf) {
    const cancha = canchas.find((c) => c.id === tf.canchaId);
    const ocurrencias = occurrencesInMonth(mesActual, tf.diaSemana).length;
    return precioMensualFijo(tf, cancha, ocurrencias, nightFrom);
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const upToDate     = turnosFijos.filter((tf) =>
    tf.estadoPorMes?.[mesActual] === ESTADO_MES.al_dia
  ).length;
  const pending      = turnosFijos.length - upToDate;
  const monthlyTotal = turnosFijos.reduce((s, tf) => s + precioParaTf(tf), 0);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleCollect = (tf) => {
    tfActions.marcarMes(tf.id, mesActual, ESTADO_MES.al_dia);
    toast.success(`Abono de ${tf.equipoNombre} marcado como cobrado`);
  };

  const handleDelete = async (tf) => {
    const ok = await confirm({
      title: 'Eliminar turno fijo',
      message: `"${tf.equipoNombre}" deja de reservarse automáticamente los ${DIAS_SEMANA[tf.diaSemana]?.plural?.toLowerCase() ?? ''}. Podés deshacerlo desde el aviso.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    tfActions.eliminar(tf.id);
    setModalTf(null);
    toast.info(`Turno fijo de "${tf.equipoNombre}" eliminado`, {
      action: { label: 'Deshacer', onClick: () => tfActions.restaurar(tf) },
    });
  };

  const openCreateModal = () => {
    setTeamName('');
    setCaptain('');
    setPhone('');
    setDiaSemana(5);
    setHora('21:00');
    setCanchaId(canchas[0]?.id ?? '');
    setFormError('');
    setModalTf('new');
  };

  const openEditModal = (tf) => {
    setTeamName(tf.equipoNombre ?? '');
    setCaptain(tf.capitanNombre ?? '');
    setPhone(tf.telefono ?? '');
    setDiaSemana(tf.diaSemana);
    setHora(tf.hora);
    setCanchaId(tf.canchaId ?? canchas[0]?.id ?? '');
    setFormError('');
    setModalTf(tf);
  };

  const handleSaveTurnoFijo = (e) => {
    e.preventDefault();
    setFormError('');

    if (!teamName.trim()) {
      setFormError('El nombre del equipo es obligatorio.');
      return;
    }
    if (!canchaId) {
      setFormError('Seleccioná una cancha.');
      return;
    }

    const data = {
      equipoNombre:  teamName.trim(),
      capitanNombre: captain.trim() || 'Capitán',
      telefono:      phone.trim() || null,
      diaSemana,
      hora,
      canchaId,
    };

    const result = isEdit
      ? tfActions.actualizar(modalTf.id, data)
      : tfActions.crear({ ...data, clienteId: null });

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? `Turno fijo "${teamName.trim()}" actualizado` : `Turno fijo "${teamName.trim()}" creado`);
    setModalTf(null);
  };

  const closeModal = () => {
    setModalTf(null);
    setFormError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ─── Header ─── */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Turnos Fijos</h1>
          <p className="section-subtitle">Equipos abonados con reserva automática semanal</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal} style={{ padding: '9px 18px' }}>
          <Plus size={15} style={{ color: 'var(--on-accent)' }} />
          Nuevo Turno Fijo
        </button>
      </div>

      {/* ─── Stats Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total Equipos', value: turnosFijos.length, color: 'var(--purple)', sub: 'activos esta semana' },
          { label: 'Al Día',        value: upToDate,           color: 'var(--green)',  sub: 'abono mensual cobrado' },
          { label: 'Pendientes',    value: pending,            color: pending > 0 ? 'var(--amber)' : 'var(--green)', sub: 'por cobrar este mes' },
          { label: 'Ingresos Mes',  value: formatARSCompact(monthlyTotal), color: 'var(--blue)', sub: 'ingresos recurrentes' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p className="font-heading num" style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Empty state ─── */}
      {turnosFijos.length === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          borderRadius: 14, background: 'var(--bg-card)', border: '1px dashed var(--border-mid)',
        }}>
          <Repeat size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            No hay turnos fijos todavía
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Creá el primero con el botón "Nuevo Turno Fijo".
          </p>
        </div>
      )}

      {/* ─── Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {turnosFijos.map((tf) => {
          const estadoMes = tf.estadoPorMes?.[mesActual] ?? ESTADO_MES.pendiente;
          const ok        = estadoMes === ESTADO_MES.al_dia;
          const cancha    = canchas.find((c) => c.id === tf.canchaId);
          const diaNombre = DIAS_SEMANA[tf.diaSemana]?.plural ?? `Día ${tf.diaSemana}`;
          const precio    = precioParaTf(tf);

          return (
            <div key={tf.id} style={{
              padding: '18px', borderRadius: 14, background: 'var(--bg-card)',
              border: `1px solid ${ok ? 'var(--border-dim)' : 'rgba(255,179,0,0.3)'}`,
              transition: 'all 0.2s ease',
              boxShadow: ok ? 'none' : '0 0 18px rgba(255,179,0,0.07)',
              position: 'relative',
            }}>

              {/* Botones de editar / eliminar */}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 2 }}>
                <button
                  onClick={() => openEditModal(tf)}
                  aria-label={`Editar turno fijo de ${tf.equipoNombre}`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(tf)}
                  aria-label={`Eliminar turno fijo de ${tf.equipoNombre}`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 8, paddingRight: 48 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99,
                      background: 'rgba(185,136,252,0.12)', border: '1px solid rgba(185,136,252,0.3)',
                      color: 'var(--purple)', fontSize: '0.78rem', fontWeight: 800,
                    }}>
                      {diaNombre} · {tf.hora}
                    </span>
                  </div>
                  <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {tf.equipoNombre}
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    {cancha?.nombre ?? tf.canchaId}
                  </p>
                </div>
                <EstadoBadge estado={estadoMes} />
              </div>

              {/* Capitán + teléfono */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User size={13} color="var(--green)" /> {tf.capitanNombre ?? '—'}
                </span>
                {tf.telefono && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={13} color="var(--blue)" /> {tf.telefono}
                  </span>
                )}
              </div>

              {/* Precio mensual + acción */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
              }}>
                <div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Abono Mensual
                  </p>
                  <p className="font-heading num" style={{ fontWeight: 900, color: 'var(--green)', fontSize: '1.05rem' }}>
                    {formatARS(precio)}/mes
                  </p>
                </div>
                {ok ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 800, color: 'var(--green)' }}>
                    <CheckCircle2 size={15} /> Cobrado
                  </span>
                ) : (
                  <button
                    onClick={() => handleCollect(tf)}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                  >
                    <DollarSign size={13} style={{ color: 'var(--on-accent)' }} /> Cobrar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Modal de Alta / Edición ─── */}
      {modalTf && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content" style={{ maxWidth: 500 }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(185,136,252,0.12)', border: '1px solid rgba(185,136,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Repeat size={17} color="var(--purple)" />
                </div>
                <div>
                  <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {isEdit ? 'Editar Turno Fijo' : 'Nuevo Turno Fijo'}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reserva automática semanal</p>
                </div>
              </div>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveTurnoFijo}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Error */}
                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)', color: 'var(--red)', fontSize: '0.8rem' }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}

                {/* Nombre del equipo */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Equipo / Grupo *</label>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Ej: Los Pibes del Viernes"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Capitán + teléfono */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre del Capitán</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={captain}
                      onChange={(e) => setCaptain(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Teléfono WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+54 9 351..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Día + hora */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Día de la Semana</label>
                    <NativeSelect
                      options={DAY_OPTIONS}
                      value={diaSemana}
                      onChange={setDiaSemana}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Horario</label>
                    <NativeSelect
                      options={TIME_OPTIONS}
                      value={hora}
                      onChange={setHora}
                    />
                  </div>
                </div>

                {/* Cancha */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cancha</label>
                  <NativeSelect
                    options={canchaOptions}
                    value={canchaId}
                    onChange={(v) => setCanchaId(String(v))}
                    placeholder={canchas.length === 0 ? 'No hay canchas activas' : undefined}
                  />
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">
                    <CheckCircle2 size={15} style={{ color: 'var(--on-accent)' }} />
                    {isEdit ? 'Guardar Cambios' : 'Guardar Turno Fijo'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}
      {ConfirmDialogMount}
    </div>
  );
}
