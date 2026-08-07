/**
 * ConfiguracionComplejo.jsx — Fase 2
 *
 * Lee del store directo. Sin imports de mockData.js.
 *
 * Cambios clave vs. versión anterior:
 *   - useConfig() en vez de useState(COMPLEX_INFO)
 *   - useConfigActions().actualizar(patch) para datos del complejo, pagos e integraciones
 *   - useCanchaActions().actualizar(canchaId, { precioDia, precioNoche }) para tarifas
 *   - ToggleRow ya no tiene useState propio: lee y escribe config.integraciones.*
 *   - senaMinimaPorcentaje → config.pagos.senaMinimaPorcentaje (controlado)
 *   - Toast de éxito al guardar (no un setSaved cosmético)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, CreditCard, Save,
  Bot, MapPin, Zap, Plus, Pencil, Trash2, EyeOff, Eye, Sun, Moon,
  QrCode, Copy, Check, KeyRound, Users, Clock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useConfig, useConfigActions, useCanchaActions, useToast, useCanchas, useAppState } from '../store';
import { useConfirm } from './ConfirmDialog';
import NuevoCanchaModal from './NuevoCanchaModal';
import UsuariosYPermisos from './UsuariosYPermisos';
import ClaveBot from './ClaveBot';
import Section from './Section';
import DisponibilidadHoraria from './DisponibilidadHoraria';
import { useAuth } from '../auth/AuthProvider';
import { DEPORTE_LABEL } from '../lib/status';

// ─── Link + QR para compartir la reserva pública ──────────────────────────────

function EnlaceReservaPublica() {
  const { tenant } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
  // El slug identifica al complejo en la página pública. Sin él la URL no sirve:
  // la Edge Function no sabría de qué complejo mostrar los horarios.
  const url = `${window.location.origin}/reserva/${tenant?.slug ?? ''}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 176, margin: 1, color: { dark: '#0a0f0c', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard no disponible (ej. contexto no seguro) — el link igual se ve en pantalla.
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="Código QR para reservar"
          style={{ width: 110, height: 110, borderRadius: 10, border: '1px solid var(--border-dim)', flexShrink: 0 }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Compartí este link o imprimí el QR para que tus clientes reserven turnos desde el celular.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{
            fontSize: '0.78rem', color: 'var(--text-primary)', background: 'var(--bg-input)',
            border: '1px solid var(--border-dim)', borderRadius: 8, padding: '7px 10px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
          }}>
            {url}
          </code>
          <button type="button" onClick={handleCopy} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '0.78rem' }}>
            {copiado ? <Check size={13} color="var(--celeste)" /> : <Copy size={13} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ToggleRow conectado al store ─────────────────────────────────────────────

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
      <label className="toggle-switch" style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'complejo', label: 'Complejo' },
  { id: 'canchas', label: 'Canchas' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'cobros', label: 'Cobros' },
  { id: 'equipo', label: 'Equipo' },
  { id: 'bot', label: 'Bot IA' },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracionComplejo() {
  const config        = useConfig();
  const configActions = useConfigActions();
  const canchaActions = useCanchaActions();
  const canchas       = useCanchas();
  const appState      = useAppState();
  const toast         = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const [tab, setTab] = useState('complejo');
  const [canchaModal, setCanchaModal] = useState(null); // null | 'new' | Cancha

  // ─── Helpers de gestión de canchas ────────────────────────────────────────

  const handleSaveCancha = (data) => {
    const isEdit = canchaModal && canchaModal !== 'new';
    const result = isEdit
      ? canchaActions.actualizar(canchaModal.id, data)
      : canchaActions.crear(data);
    if (!result.ok) return result;
    toast.success(isEdit ? `"${data.nombre}" actualizada` : `Cancha "${data.nombre}" agregada`);
    setCanchaModal(null);
    return result;
  };

  const handleToggleActiva = (cancha) => {
    canchaActions.actualizar(cancha.id, { activa: !cancha.activa });
    toast.info(cancha.activa ? `"${cancha.nombre}" desactivada` : `"${cancha.nombre}" reactivada`);
  };

  const handleDeleteCancha = async (cancha) => {
    // Se valida ANTES de despachar (no se puede leer `ui.lastError` recién puesto
    // por crossSlice en el mismo tick: el dispatch de useReducer no expone el
    // estado resultante hasta el próximo render).
    const tieneTurnos = appState.bookings.some(
      (b) => b.canchaId === cancha.id && b.estado !== 'cancelado'
    );
    if (tieneTurnos) {
      toast.error('No se puede eliminar: la cancha tiene turnos cargados. Desactivala en su lugar.');
      return;
    }
    const ok = await confirm({
      title: 'Eliminar cancha',
      message: `Se borra "${cancha.nombre}" definitivamente. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    canchaActions.eliminar(cancha.id);
    toast.success(`"${cancha.nombre}" eliminada`);
  };

  // ─── Helpers de actualización ─────────────────────────────────────────────

  const updateComplejo = useCallback(
    (patch) => configActions.actualizar({ complejo: patch }),
    [configActions]
  );

  const updatePagos = useCallback(
    (patch) => configActions.actualizar({ pagos: patch }),
    [configActions]
  );

  const updateIntegracion = useCallback(
    (key, val) => configActions.actualizar({ integraciones: { [key]: val } }),
    [configActions]
  );

  // `operacion` guarda además `slots` y `horaNocturnaDesde`, que los escribe
  // solo el asistente de alta. Acá se editan las reglas que el dueño necesita
  // poder cambiar con el complejo andando.
  const updateOperacion = useCallback(
    (patch) => configActions.actualizar({ operacion: patch }),
    [configActions]
  );

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Configuración guardada correctamente');
  };

  // ─── Guard: si el store aún no cargó ─────────────────────────────────────
  if (!config) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando configuración…
      </div>
    );
  }

  const { complejo, pagos, integraciones, operacion = {} } = config;
  const horarioAtencion = operacion.horarioAtencion ?? { desde: '09:00', hasta: '23:59' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ─── Header ─── */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Configuración</h1>
          <p className="section-subtitle">Datos del complejo · Tarifas · Integraciones · Bot de WhatsApp</p>
        </div>
        <button onClick={handleSave} className="btn-primary" style={{ padding: '9px 20px' }}>
          <Save size={15} style={{ color: 'var(--on-accent)' }} /> Guardar Cambios
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div className="tab-switcher" style={{ alignSelf: 'flex-start', overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>

        {tab === 'complejo' && (
          <>
          <Section title="Datos del Complejo" icon={<Building2 size={15} />} iconColor="var(--text-secondary)">
            <div className="form-group">
              <label className="form-label">Nombre Comercial</label>
              <input
                type="text"
                value={complejo.nombre ?? ''}
                onChange={(e) => updateComplejo({ nombre: e.target.value })}
                className="form-input"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ciudad / Provincia</label>
                <input
                  type="text"
                  value={complejo.ciudad ?? ''}
                  onChange={(e) => updateComplejo({ ciudad: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono WhatsApp</label>
                <input
                  type="text"
                  value={complejo.telefono ?? ''}
                  onChange={(e) => updateComplejo({ telefono: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <div className="input-icon-wrap">
                <MapPin size={14} className="input-icon" />
                <input
                  type="text"
                  value={complejo.direccion ?? ''}
                  onChange={(e) => updateComplejo({ direccion: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          </Section>

          <Section title="Reserva Online" icon={<QrCode size={15} />} iconColor="var(--volt)">
            <EnlaceReservaPublica />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                <label className="form-label">Guardar el turno sin confirmar (min)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={operacion.minutosExpiracionPendiente ?? 60}
                  onChange={(e) =>
                    updateOperacion({ minutosExpiracionPendiente: Number(e.target.value) || 60 })
                  }
                  className="form-input num"
                />
                <p className="form-hint">
                  Cuánto le aguantás el horario a alguien que reservó por la web y todavía no señó.
                  Pasado ese rato el turno se cancela solo y el horario vuelve a estar libre.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                <label className="form-label">Cancelar por WhatsApp hasta (horas antes)</label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={operacion.horasMinimasCancelacion ?? 12}
                  onChange={(e) =>
                    updateOperacion({ horasMinimasCancelacion: Number(e.target.value) || 0 })
                  }
                  className="form-input num"
                />
                <p className="form-hint">
                  Más cerca del turno que esto, el bot no cancela: te pasa la conversación a vos.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                <label className="form-label">Atienden desde</label>
                <input
                  type="time"
                  value={horarioAtencion.desde ?? '09:00'}
                  onChange={(e) =>
                    updateOperacion({ horarioAtencion: { ...horarioAtencion, desde: e.target.value } })
                  }
                  className="form-input num"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                <label className="form-label">Atienden hasta</label>
                <input
                  type="time"
                  value={horarioAtencion.hasta ?? '23:59'}
                  onChange={(e) =>
                    updateOperacion({ horarioAtencion: { ...horarioAtencion, hasta: e.target.value } })
                  }
                  className="form-input num"
                />
              </div>
            </div>
            <p className="form-hint" style={{ marginTop: 8 }}>
              El bot reserva las 24 horas igual. Este horario es el que le dice al cliente
              cuándo le va a contestar una persona.
            </p>
          </Section>
          </>
        )}

        {tab === 'canchas' && (
          <Section title="Tarifas por Cancha" icon={<Zap size={15} />} iconColor="var(--volt)">
            <button
              type="button"
              onClick={() => setCanchaModal('new')}
              className="btn-secondary"
              style={{ alignSelf: 'flex-start', padding: '7px 14px', fontSize: '0.8rem' }}
            >
              <Plus size={13} /> Nueva Cancha
            </button>

            {canchas.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '12px 14px', borderRadius: 11, background: 'var(--bg-surface)',
                  border: `1px solid var(--border-dim)`, borderLeft: `3px solid ${c.color ?? 'var(--celeste)'}`,
                  opacity: c.activa ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color ?? 'var(--celeste)', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nombre}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button type="button" onClick={() => setCanchaModal(c)} aria-label={`Editar ${c.nombre}`} className="btn-icon">
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActiva(c)}
                      aria-label={c.activa ? `Desactivar ${c.nombre}` : `Reactivar ${c.nombre}`}
                      className="btn-icon"
                    >
                      {c.activa ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {!c.activa && (
                      <button type="button" onClick={() => handleDeleteCancha(c)} aria-label={`Eliminar ${c.nombre}`} className="btn-icon">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.subtitulo ? `${c.subtitulo} · ` : ''}{DEPORTE_LABEL[c.deporte] ?? c.deporte}
                  {!c.activa && (
                    <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--text-secondary)', padding: '1px 8px', borderRadius: 99, border: '1px solid var(--border-dim)' }}>
                      Inactiva
                    </span>
                  )}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem' }}>
                      <Sun size={11} /> Precio Diurno ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={c.precioDia ?? 0}
                      onChange={(e) =>
                        canchaActions.actualizar(c.id, { precioDia: Number(e.target.value) })
                      }
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem' }}>
                      <Moon size={11} /> Precio Nocturno ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={c.precioNoche ?? 0}
                      onChange={(e) =>
                        canchaActions.actualizar(c.id, { precioNoche: Number(e.target.value) })
                      }
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Seña Mínima Requerida (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={pagos.senaMinimaPorcentaje ?? 50}
                onChange={(e) =>
                  updatePagos({ senaMinimaPorcentaje: Number(e.target.value) })
                }
                className="form-input"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                El bot solicitará automáticamente este % del total al confirmar reserva.
              </span>
            </div>
          </Section>
        )}

        {tab === 'disponibilidad' && (
          <Section title="Disponibilidad horaria" icon={<Clock size={15} />} iconColor="var(--blue)">
            <DisponibilidadHoraria />
          </Section>
        )}

        {tab === 'cobros' && (
          <Section title="Cobros" icon={<CreditCard size={15} />} iconColor="var(--blue)">
            <div className="form-group">
              <label className="form-label">Alias para transferencias</label>
              <input
                type="text"
                value={pagos.alias ?? ''}
                onChange={(e) => updatePagos({ alias: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CBU / CVU Bancario</label>
              <input
                type="text"
                value={pagos.cbu ?? ''}
                onChange={(e) => updatePagos({ cbu: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: '0.82rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Titular de la cuenta</label>
              <input
                type="text"
                value={pagos.titular ?? ''}
                onChange={(e) => updatePagos({ titular: e.target.value })}
                className="form-input"
                placeholder="A nombre de quién figura el alias"
              />
              <p className="form-hint">
                El bot lo dicta junto con el alias y el CBU. Sin esto, el que transfiere no tiene
                cómo comprobar que le está mandando la plata a ustedes.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Si el cliente cancela, la seña…</label>
              <select
                value={pagos.politicaSena ?? 'credito'}
                onChange={(e) => updatePagos({ politicaSena: e.target.value })}
                className="form-input"
              >
                <option value="credito">Queda como crédito a favor</option>
                <option value="no_reembolsable">No se reintegra</option>
              </select>
              <p className="form-hint">
                Es lo único que el bot va a decir sobre la plata de un turno cancelado. Nunca
                promete una devolución: si el cliente insiste, te pasa la conversación.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <Zap size={14} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong style={{ color: 'var(--text-primary)' }}>OCR / Visión IA:</strong> El bot lee capturas de pago y verifica CBU + monto en segundos.</span>
            </div>
          </Section>
        )}

        {tab === 'equipo' && (
          <Section title="Usuarios y Permisos" icon={<Users size={15} />} iconColor="var(--blue)">
            <UsuariosYPermisos />
          </Section>
        )}

        {tab === 'bot' && (
          <>
          <Section title="Clave de conexión del bot" icon={<KeyRound size={15} />} iconColor="var(--purple)">
            <ClaveBot />
          </Section>

          <Section title="Bot IA & Notificaciones" icon={<Bot size={15} />} iconColor="var(--purple)">
            <ToggleRow
              label="WhatsApp Bot Activo"
              sub="El bot responde automáticamente a consultas y reservas"
              value={integraciones.whatsappBotActivo}
              onChange={(v) => updateIntegracion('whatsappBotActivo', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Modo 24/7 Automático"
              sub="Responde fuera del horario de atención también"
              value={integraciones.modo247}
              onChange={(v) => updateIntegracion('modo247', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Alertas de Turnos Sin Seña"
              sub="Notificación si un turno supera X horas sin señar"
              value={integraciones.alertasSinSena}
              onChange={(v) => updateIntegracion('alertasSinSena', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Recordatorio Automático a Clientes"
              sub={'WhatsApp 2hs antes del turno: "Hoy a las Xhs, ¡nos vemos!"'}
              value={integraciones.recordatorioAutomatico}
              onChange={(v) => updateIntegracion('recordatorioAutomatico', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Confirmación por OCR de Comprobantes"
              sub="Verificar capturas de pago con Visión IA"
              value={integraciones.ocrComprobantes}
              onChange={(v) => updateIntegracion('ocrComprobantes', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            {/* El compromiso está declarado en la etiqueta a propósito: prender
                esto le da al dueño el control del comprobante y le saca al
                cliente la respuesta inmediata. Las dos cosas son ciertas. */}
            <ToggleRow
              label="Revisar cada comprobante antes de confirmar"
              sub="Más seguro contra capturas falsas, pero el cliente espera tu ok en vez de tener el turno al instante"
              value={integraciones.exigirValidacionManual}
              onChange={(v) => updateIntegracion('exigirValidacionManual', v)}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Máximo de turnos abiertos por teléfono
                </p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Frena al que se reserva media grilla y después no confirma ninguno.
                </p>
              </div>
              <input
                type="number"
                min="1"
                max="20"
                value={integraciones.maxTurnosActivosPorTelefono ?? 2}
                onChange={(e) =>
                  updateIntegracion('maxTurnosActivosPorTelefono', Number(e.target.value) || 1)
                }
                className="form-input num"
                style={{ width: 90, flexShrink: 0 }}
              />
            </div>
          </Section>
          </>
        )}
      </form>

      {canchaModal && (
        <NuevoCanchaModal
          key={canchaModal === 'new' ? 'new' : canchaModal.id}
          isOpen
          cancha={canchaModal === 'new' ? null : canchaModal}
          onClose={() => setCanchaModal(null)}
          onSave={handleSaveCancha}
        />
      )}
      {ConfirmDialogMount}
    </div>
  );
}
