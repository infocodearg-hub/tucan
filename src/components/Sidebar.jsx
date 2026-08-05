import React from 'react';
import { 
  CalendarDays, 
  Repeat, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Settings, 
  Globe,
  Sparkles
} from 'lucide-react';

const menuItems = [
  { 
    id: 'grilla', 
    label: 'Grilla de Turnos', 
    icon: CalendarDays, 
    badge: 'En Vivo', 
    badgeStyle: { background: 'rgba(0,230,118,0.15)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)' }
  },
  { 
    id: 'turnos_fijos', 
    label: 'Turnos Fijos', 
    icon: Repeat, 
    badge: '4 equipos', 
    badgeStyle: { background: 'rgba(185,136,252,0.12)', color: 'var(--purple)', border: '1px solid rgba(185,136,252,0.3)' }
  },
  { 
    id: 'cantina', 
    label: 'Caja & Cantina POS', 
    icon: ShoppingBag, 
    badge: null 
  },
  { 
    id: 'clientes', 
    label: 'Clientes & Jugadores', 
    icon: Users, 
    badge: null 
  },
  { 
    id: 'reportes', 
    label: 'Reportes & Finanzas', 
    icon: BarChart3, 
    badge: null 
  },
  { 
    id: 'configuracion', 
    label: 'Configuración', 
    icon: Settings, 
    badge: null 
  },
  { 
    id: 'vista_publica', 
    label: 'Web Pública Jugador', 
    icon: Globe, 
    badge: 'QR', 
    badgeStyle: { background: 'rgba(200,255,0,0.1)', color: 'var(--volt)', border: '1px solid rgba(200,255,0,0.3)' }
  },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar hidden md:flex">
      {/* ─── Navigation ─── */}
      <div>
        <div className="label-caps" style={{ padding: '4px 10px 10px' }}>
          Panel de Control
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div className="nav-icon" style={{ color: isActive ? 'var(--green)' : 'var(--text-muted)' }}>
                    <Icon size={15} />
                  </div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 99,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '0.03em',
                    ...(item.badgeStyle || { background: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-dim)' })
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Bottom: Info ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
        
        {/* Complex Pro Card */}
        <div style={{
          padding: '14px',
          borderRadius: 14,
          background: 'linear-gradient(140deg, rgba(0,230,118,0.08) 0%, rgba(0,176,255,0.05) 100%)',
          border: '1px solid rgba(0,230,118,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <Sparkles size={14} color="var(--green)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>TuCan PRO</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Gestión completa de canchas, turnos fijos, clientes y cantina POS.
          </p>
        </div>

        {/* Version info */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderRadius: 8, background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600 }}>
            TuCan v3.0 · Argentina
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--green)', fontWeight: 700 }}>Online</span>
          </div>
        </div>
      </div>

    </aside>
  );
}
