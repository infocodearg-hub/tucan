import React, { useState } from 'react';
import { 
  Settings, Building2, CreditCard, ShieldCheck, Save, Bot, 
  Bell, Phone, Globe, Zap, Check, MapPin
} from 'lucide-react';
import { COMPLEX_INFO } from '../data/mockData';

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

function ToggleRow({ label, sub, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
      <label className="toggle-switch" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

export default function ConfiguracionComplejo() {
  const [config, setConfig] = useState(COMPLEX_INFO);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Configuración</h1>
          <p className="section-subtitle">Datos del complejo · Tarifas · Integraciones · Bot de WhatsApp</p>
        </div>
        <button onClick={handleSave} className="btn-primary" style={{ padding: '9px 20px' }}>
          {saved ? <><Check size={15} style={{ color: 'var(--on-accent)' }} /> Guardado!</> : <><Save size={15} style={{ color: 'var(--on-accent)' }} /> Guardar Cambios</>}
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
                value={config.name}
                onChange={e => setConfig({ ...config, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ciudad / Provincia</label>
                <input
                  type="text"
                  value={config.city}
                  onChange={e => setConfig({ ...config, city: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono WhatsApp</label>
                <input
                  type="text"
                  value={config.phone}
                  onChange={e => setConfig({ ...config, phone: e.target.value })}
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
                  value={config.address}
                  onChange={e => setConfig({ ...config, address: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          </Section>

          {/* ─── Tarifas por Cancha ─── */}
          <Section title="Tarifas por Cancha" icon={<Zap size={15} />} iconColor="var(--volt)">
            {config.canchas.map(c => (
              <div key={c.id} style={{ padding: '12px 14px', borderRadius: 11, background: 'var(--bg-surface)', border: `1px solid var(--border-dim)`, borderLeft: `3px solid ${c.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· {c.type}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>☀️ Precio Diurno ($)</label>
                    <input type="number" defaultValue={c.priceDay} className="form-input" style={{ padding: '8px 12px', fontSize: '0.88rem' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>🌙 Precio Nocturno ($)</label>
                    <input type="number" defaultValue={c.priceNight} className="form-input" style={{ padding: '8px 12px', fontSize: '0.88rem' }} />
                  </div>
                </div>
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Seña Mínima Requerida (%)</label>
              <input
                type="number"
                value={config.señaMinimaPorcentaje}
                onChange={e => setConfig({ ...config, señaMinimaPorcentaje: e.target.value })}
                className="form-input"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                El bot solicitará automáticamente este % del total al confirmar reserva.
              </span>
            </div>
          </Section>

          {/* ─── Mercado Pago & CBU ─── */}
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
                value={config.alias}
                onChange={e => setConfig({ ...config, alias: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CBU / CVU Bancario</label>
              <input
                type="text"
                value={config.cbu}
                onChange={e => setConfig({ ...config, cbu: e.target.value })}
                className="form-input"
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              ⚡ <strong style={{ color: 'var(--text-primary)' }}>OCR / Visión IA:</strong> El bot lee capturas de pago y verifica CBU + monto en segundos, confirmando la seña sin intervención manual.
            </div>
          </Section>

          {/* ─── Bot & Notificaciones ─── */}
          <Section title="Bot IA & Notificaciones" icon={<Bot size={15} />} iconColor="var(--purple)">
            <ToggleRow
              label="WhatsApp Bot Activo"
              sub="El bot responde automáticamente a consultas y reservas"
              defaultOn={true}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Modo 24/7 Automático"
              sub="Responde fuera del horario de atención también"
              defaultOn={true}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Alertas de Turnos Sin Seña"
              sub="Notificación si un turno supera X horas sin señar"
              defaultOn={true}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Recordatorio Automático a Clientes"
              sub={'WhatsApp 2hs antes del turno: "Hoy a las Xhs, ¡nos vemos!"'}
              defaultOn={false}
            />
            <div style={{ height: 1, background: 'var(--border-dim)' }} />
            <ToggleRow
              label="Confirmación por OCR de Comprobantes"
              sub="Verificar capturas de pago con Visión IA"
              defaultOn={true}
            />
          </Section>

        </div>
      </form>
    </div>
  );
}
