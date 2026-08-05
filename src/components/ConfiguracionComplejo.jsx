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
import React, { useCallback } from 'react';
import {
  Settings, Building2, CreditCard, ShieldCheck, Save,
  Bot, Bell, MapPin, Zap, Check,
} from 'lucide-react';
import { useConfig, useConfigActions, useCanchaActions, useToast, useCanchasActivas } from '../store';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, iconColor = 'var(--green)', children }) {
  return (
    <div style={{ padding: '20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${iconColor}18`, border: `1px solid ${iconColor}33`, color: iconColor }}>
          {icon}
        </div>
        <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{title}</h3>
      </div>
      {children}
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracionComplejo() {
  const config        = useConfig();
  const configActions = useConfigActions();
  const canchaActions = useCanchaActions();
  const canchas       = useCanchasActivas();
  const toast         = useToast();

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

  const { complejo, pagos, integraciones } = config;

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

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

          {/* ─── Datos Generales ─── */}
          <Section title="Datos del Complejo" icon={<Building2 size={15} />} iconColor="var(--green)">
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

          {/* ─── Tarifas por Cancha ─── */}
          <Section title="Tarifas por Cancha" icon={<Zap size={15} />} iconColor="var(--volt)">
            {canchas.map((c) => (
              <div key={c.id} style={{ padding: '12px 14px', borderRadius: 11, background: 'var(--bg-surface)', border: `1px solid var(--border-dim)`, borderLeft: `3px solid ${c.color ?? 'var(--green)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color ?? 'var(--green)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.nombre}</span>
                  {c.subtitulo && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· {c.subtitulo}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>☀️ Precio Diurno ($)</label>
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
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>🌙 Precio Nocturno ($)</label>
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

          {/* ─── Cobros & Mercado Pago ─── */}
          <Section title="Cobros & Mercado Pago" icon={<CreditCard size={15} />} iconColor="var(--blue)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 11, background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.25)' }}>
              <ShieldCheck size={18} color="var(--green)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mercado Pago Integrado</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: 1 }}>Webhooks & cobros automáticos activos</p>
              </div>
              <span className="badge badge-available" style={{ marginLeft: 'auto', flexShrink: 0 }}>ONLINE</span>
            </div>

            <div className="form-group">
              <label className="form-label">Alias Mercado Pago</label>
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

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              ⚡ <strong style={{ color: 'var(--text-primary)' }}>OCR / Visión IA:</strong> El bot lee capturas de pago y verifica CBU + monto en segundos.
            </div>
          </Section>

          {/* ─── Bot IA & Notificaciones ─── */}
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
          </Section>

        </div>
      </form>
    </div>
  );
}
