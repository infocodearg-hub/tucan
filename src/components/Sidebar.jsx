import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Repeat,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTurnosFijos } from '../store';
import { pluralize } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { puedeVerTab } from '../auth/permisos';
import { useDerivacionesAbiertas } from './DerivacionesBot';

/**
 * Preferencia de interfaz, no dato del complejo: por eso NO usa el prefijo
 * `tucan:cache:` ni `tucan:state:`, que `purgarCacheLocal()` borra al cerrar
 * sesión. Que la barra se mantenga como la dejaste después de salir y volver a
 * entrar es lo esperable; que se resetee, no.
 */
const CLAVE_COLAPSADA = 'tucan:ui:sidebar';

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE_COLAPSADA) === 'colapsada';
  } catch {
    // Safari en modo privado tira al tocar localStorage. Una barra que no
    // recuerda su estado es molesto; una app que no abre, no.
    return false;
  }
}

export default function Sidebar({ activeTab, setActiveTab }) {
  const turnosFijos = useTurnosFijos();
  const auth = useAuth();
  const equiposActivos = turnosFijos.filter((tf) => tf.activo).length;
  // `enabled` en false para quien ni va a ver el tab: no tiene sentido
  // pagar la consulta (ni la suscripción Realtime) por un badge invisible.
  const { derivaciones } = useDerivacionesAbiertas({ enabled: puedeVerTab('derivaciones', auth) });
  const [colapsada, setColapsada] = useState(leerPreferencia);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_COLAPSADA, colapsada ? 'colapsada' : 'abierta');
    } catch {
      /* sin persistencia, pero la barra sigue funcionando en esta sesión */
    }
  }, [colapsada]);

  const todosLosItems = [
    {
      id: 'grilla',
      label: 'Grilla de Turnos',
      icon: CalendarDays,
      badge: 'En Vivo',
      badgeStyle: { background: 'rgb(from var(--celeste) r g b / 0.15)', color: 'var(--celeste)', border: '1px solid rgb(from var(--celeste) r g b / 0.3)' }
    },
    {
      id: 'turnos_fijos',
      label: 'Turnos Fijos',
      icon: Repeat,
      badge: equiposActivos > 0 ? pluralize(equiposActivos, 'equipo') : null,
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
      id: 'derivaciones',
      label: 'Derivaciones',
      icon: MessageSquare,
      badge: derivaciones.length > 0 ? String(derivaciones.length) : null,
      badgeStyle: { background: 'rgba(255,193,7,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,193,7,0.3)' }
    },
    // Vista Pública / QR: movida a su propia página en /reserva (ver src/main.jsx).
    // Se saca del panel de administración por ahora — el link y QR para compartir
    // viven en Configuración > Complejo.
    // {
    //   id: 'vista_publica',
    //   label: 'Web Pública Jugador',
    //   icon: Globe,
    //   badge: 'QR',
    //   badgeStyle: { background: 'rgba(200,255,0,0.1)', color: 'var(--volt)', border: '1px solid rgba(200,255,0,0.3)' }
    // },
  ];

  // Una sección para la que el empleado no tiene permiso no se muestra
  // deshabilitada: no se muestra. Un botón gris que nunca sirve solo genera
  // preguntas al dueño.
  const menuItems = todosLosItems.filter((item) => puedeVerTab(item.id, auth));

  return (
    <aside className={`sidebar hidden md:flex ${colapsada ? 'is-collapsed' : ''}`}>
      {/* ─── Navigation ─── */}
      <div>
        <div className="label-caps sidebar-solo-abierta" style={{ padding: '4px 10px 10px' }}>
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
                // Cerrada, el `title` es lo único que dice qué es cada icono.
                // Es el tooltip nativo y no uno propio a propósito: la barra
                // tiene `overflow-y: auto`, así que cualquier globo dibujado
                // con ::after quedaría recortado contra su propio borde.
                title={colapsada ? item.label : undefined}
                aria-label={colapsada ? item.label : undefined}
              >
                <div className="nav-item-main" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div className="nav-icon" style={{ color: isActive ? 'var(--celeste)' : 'var(--text-muted)' }}>
                    <Icon size={15} />
                  </div>
                  <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span className="nav-badge" style={{
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

        {/* El botón de colapso va acá abajo y no arriba: arriba compite con el
            logo del navbar y con el título de la sección, y es una acción que
            se usa una vez por semana, no una de navegación. */}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setColapsada((v) => !v)}
          title={colapsada ? 'Expandir el menú' : 'Contraer el menú'}
          aria-label={colapsada ? 'Expandir el menú' : 'Contraer el menú'}
          aria-expanded={!colapsada}
        >
          {colapsada ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span className="nav-label">Contraer menú</span>
        </button>

        {/* Las dos tarjetas se sacan del árbol en vez de esconderse con CSS.
            Ambas traen `display` en un `style` inline, y eso le gana a
            cualquier `display: none` de una clase: la de versión se quedaba
            visible, aplastada a 68px y con el texto desbordando el borde. */}
        {!colapsada && (
          <>
            {/* Complex Pro Card */}
            <div style={{
              padding: '14px',
              borderRadius: 14,
              background: 'linear-gradient(140deg, rgb(from var(--celeste) r g b / 0.08) 0%, rgba(0,176,255,0.05) 100%)',
              border: '1px solid rgb(from var(--celeste) r g b / 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Sparkles size={14} color="var(--celeste)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Plan Max</span>
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
                Set&amp;gol v3.0 · Argentina
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="pulse-dot" style={{ width: 6, height: 6 }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--celeste)', fontWeight: 700 }}>Online</span>
              </div>
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
