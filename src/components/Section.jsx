import React from 'react';

/**
 * Section.jsx — la tarjeta con ícono + título que arma cada bloque de una
 * página de panel (Configuración, Derivaciones, etc.).
 *
 * Vivía adentro de ConfiguracionComplejo.jsx porque era la única página que
 * la usaba; se saca a un archivo propio en cuanto una segunda página
 * (Derivaciones) necesita el mismo estilo — repetir el JSX a mano hubiera
 * sido la forma más fácil de que las dos páginas se desalinearan con el
 * tiempo.
 */
export default function Section({ title, icon, iconColor = 'var(--celeste)', children }) {
  return (
    <div style={{ padding: '20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgb(from ${iconColor} r g b / 0.1)`, border: `1px solid rgb(from ${iconColor} r g b / 0.2)`, color: iconColor }}>
          {icon}
        </div>
        <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
