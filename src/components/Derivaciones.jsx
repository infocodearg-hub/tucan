/**
 * Derivaciones.jsx — página propia para todo lo que el bot no maneja solo.
 *
 * Antes vivía como una `Section` más adentro del tab "Bot IA" de
 * Configuración: apretada entre la clave de conexión y los toggles de
 * notificaciones, a pesar de ser el trabajo del día a día del mostrador (lo
 * atiende cualquiera con permiso de turnos, no solo el dueño — ver
 * `PERMISO_POR_TAB.derivaciones` en `src/auth/permisos.js`). Se le da lugar
 * propio en el menú, mismo estilo que el resto del panel.
 *
 * Dos sub-pestañas, mismo patrón `TABS`/`tab-btn` que ConfiguracionComplejo:
 * "Abiertas" (la bandeja de siempre, sin cambios) y "Muteados" (clientes a
 * los que el dueño le corta el bot a mano, sin vencimiento).
 */
import React, { useState } from 'react';
import { MessageSquare, VolumeX } from 'lucide-react';
import Section from './Section';
import DerivacionesBot from './DerivacionesBot';
import MuteadosBot from './MuteadosBot';

const TABS = [
  { id: 'abiertas', label: 'Abiertas' },
  { id: 'muteados', label: 'Muteados' },
];

export default function Derivaciones() {
  const [tab, setTab] = useState('abiertas');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Derivaciones</h1>
          <p className="section-subtitle">Conversaciones que el bot no pudo resolver solo · Clientes muteados</p>
        </div>
      </div>

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

      {tab === 'abiertas' && (
        <Section title="Conversaciones esperando" icon={<MessageSquare size={15} />} iconColor="var(--amber)">
          <DerivacionesBot />
        </Section>
      )}

      {tab === 'muteados' && (
        <Section title="Clientes muteados" icon={<VolumeX size={15} />} iconColor="var(--red)">
          <MuteadosBot />
        </Section>
      )}
    </div>
  );
}
