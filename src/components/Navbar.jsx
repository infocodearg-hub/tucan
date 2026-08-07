import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  PlusCircle,
  ShoppingBag,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Globe,
  HelpCircle,
  BarChart3,
  Clock,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import { useConfig, useCanchasActivas, useUIActions } from '../store';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { nowTimeWithSeconds } from '../lib/date';
import logoSetygol from '../assets/logo-setygol.png';

/** Manual de uso publicado — es lo que se le manda al cliente junto al link. */
const MANUAL_URL = 'https://claude.ai/code/artifact/ea2c6de4-747d-4b2e-a78c-0c0275f626ea';

export default function Navbar({ onOpenNuevoTurno, onOpenCantina, activeTab, setActiveTab, onLogout }) {
  const auth        = useAuth();
  const config      = useConfig();
  const canchas     = useCanchasActivas();
  const { theme, toggleTheme } = useTheme();
  const { setActiveTab: storeSetActiveTab } = useUIActions();
  const navSetTab   = setActiveTab ?? storeSetActiveTab;

  const [time, setTime] = useState(nowTimeWithSeconds);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(nowTimeWithSeconds()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifications = [
    { id: 1, icon: MessageSquare, text: 'Nuevo turno agendado por cliente', sub: 'Marcos Benítez · Cancha 1 19:00 hs', read: false, color: 'var(--celeste)' },
    { id: 2, icon: DollarSign, text: 'Seña recibida $13.000', sub: 'Mercado Pago · Cancha 1 20:00 hs', read: false, color: 'var(--blue)' },
    { id: 3, icon: AlertTriangle, text: 'Turno sin seña a las 22:00 hs', sub: 'Santiago Ledesma · Cancha 2', read: true, color: 'var(--amber)' },
  ];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="navbar">
      
      {/* ─── LEFT: Brand & Venue ─── */}
      <div className="flex items-center gap-3 min-w-0">
        
        {/* Logo */}
        <button
          onClick={() => setActiveTab('grilla')}
          className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {/* La imagen es el wordmark real (fondo azul del logo incluido, es
              un JPEG sin transparencia — boceto, se reemplaza el archivo el
              día que haya una versión final en PNG/SVG). Reemplaza al ícono +
              texto estilizado de antes: no tiene sentido re-tipear "set&gol"
              con una tipografía web cuando el logo ya trae la suya propia. */}
          <img
            src={logoSetygol}
            alt="Set&gol"
            style={{ height: 30, width: 'auto', borderRadius: 6, flexShrink: 0 }}
          />
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: 'var(--border-dim)', flexShrink: 0 }} className="hidden md:block" />

        {/* Venue Selector — sin `display` inline: un display inline le gana a
            `.hidden` de Tailwind y el botón se superponía con el CTA en mobile */}
        <button
          style={{
            alignItems: 'center', gap: 8, padding: '7px 12px',
            borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)', maxWidth: 280, minWidth: 0
          }}
          className="hidden lg:flex hover-venue-btn"
        >
          <Building2 size={15} color="var(--celeste)" style={{ flexShrink: 0 }} />
          <div className="min-w-0">
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {config?.complejo?.nombre ?? 'Complejo'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {canchas.length} canchas
          </span>
          <ChevronDown size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </button>
      </div>

      {/* ─── RIGHT: Actions ─── */}
      <div className="flex items-center gap-2.5">

        {/* Clean Live Clock + Bot Pill */}
        <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
          style={{ 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-dim)', 
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Clock size={13} color="var(--text-muted)" />
            <span>{time} hs</span>
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border-dim)' }} />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '2px 8px', borderRadius: 99,
            background: 'rgb(from var(--celeste) r g b / 0.12)', border: '1px solid rgb(from var(--celeste) r g b / 0.3)',
            fontSize: '0.74rem', fontWeight: 800, color: 'var(--celeste)'
          }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span>Bot activo</span>
          </div>
        </div>

        {/* + Nuevo Turno */}
        <button id="btn-nuevo-turno" onClick={onOpenNuevoTurno} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
          <PlusCircle size={15} style={{ color: 'var(--on-accent)' }} />
          <span className="hidden sm:inline">Nuevo Turno</span>
          <span className="sm:hidden"> Turno</span>
        </button>

        {/* Cobrar Cantina — desktop */}
        <button onClick={onOpenCantina} className="btn-secondary hidden sm:inline-flex" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
          <ShoppingBag size={15} color="var(--celeste)" />
          <span className="hidden md:inline">Cantina</span>
        </button>

        {/* Tema claro/oscuro. Claro es el oficial (celeste Set&gol); oscuro
            sigue disponible pixel-idéntico al diseño anterior — ver
            src/theme/ThemeProvider.jsx y el bloque [data-theme="dark"] de
            index.css. */}
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          style={{ width: 38, height: 38 }}
          title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            id="btn-notificaciones"
            className="btn-icon"
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            style={{ width: 38, height: 38, position: 'relative' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--blue)', border: '2px solid var(--bg-pitch)',
                fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1
              }}>{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 300 }}>
              <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notificaciones</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} className="dropdown-item" style={{ gap: 10, alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}>
                  <n.icon size={16} color={n.color} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{n.text}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.sub}</p>
                  </div>
                  {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 5 }} />}
                </div>
              ))}
              <div className="dropdown-divider" />
              <button className="dropdown-item" style={{ justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>

        {/* Profile / User Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            id="btn-perfil"
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(140deg, var(--bg-surface) 0%, var(--bg-card-hover) 100%)',
              border: '1px solid rgb(from var(--celeste) r g b / 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, color: 'var(--celeste)',
              transition: 'all 0.2s ease',
              boxShadow: profileOpen ? '0 0 0 2px rgb(from var(--celeste) r g b / 0.3)' : 'none'
            }}
          >
            {((auth?.nombreMostrado ?? 'Usuario') || 'U').slice(0, 2).toUpperCase()}
          </button>

          {profileOpen && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 220 }}>
              <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  {config?.complejo?.nombre ?? 'Complejo'}
                </p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {auth?.nombreMostrado ?? 'Administrador'} {auth?.esDueno ? '(Dueño)' : '(Empleado)'}
                </p>
              </div>

              <button className="dropdown-item" onClick={() => { navSetTab('configuracion'); setProfileOpen(false); }}>
                <Settings size={15} color="var(--text-muted)" />
                Configuración
              </button>
              <button className="dropdown-item" onClick={() => { navSetTab('reportes'); setProfileOpen(false); }}>
                <BarChart3 size={15} color="var(--text-muted)" />
                Reportes & Finanzas
              </button>
              {/* Página aparte, no una pestaña del panel: es lo que ve el
                  jugador, la misma URL que apunta el QR de Configuración. */}
              <a
                className="dropdown-item"
                href="/reserva"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setProfileOpen(false)}
              >
                <Globe size={15} color="var(--text-muted)" />
                Vista Pública Web
              </a>
              <a
                className="dropdown-item"
                href={MANUAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setProfileOpen(false)}
              >
                <HelpCircle size={15} color="var(--text-muted)" />
                Centro de Ayuda
              </a>

              <div className="dropdown-divider" />

              <button className="dropdown-item danger" onClick={() => { if (onLogout) onLogout(); else { navSetTab('grilla'); setProfileOpen(false); } }}>
                <LogOut size={15} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
