import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  PlusCircle, 
  ShoppingBag, 
  Bot, 
  Bell, 
  ChevronDown,
  Settings,
  LogOut,
  Globe,
  HelpCircle,
  BarChart3,
  Clock,
  Zap
} from 'lucide-react';
import { COMPLEX_INFO } from '../data/mockData';

export default function Navbar({ onOpenNuevoTurno, onOpenCantina, activeTab, setActiveTab }) {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 1000);
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
    { id: 1, icon: '💬', text: 'Nuevo turno agendado por cliente', sub: 'Marcos Benítez · Cancha 1 19:00 hs', read: false, color: '#00E676' },
    { id: 2, icon: '💰', text: 'Seña recibida $13.000', sub: 'Mercado Pago · Cancha 1 20:00 hs', read: false, color: '#00B0FF' },
    { id: 3, icon: '⚠️', text: 'Turno sin seña a las 22:00 hs', sub: 'Santiago Ledesma · Cancha 2', read: true, color: '#FFB300' },
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
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(140deg, #00E676 0%, #00A040 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,230,118,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>⚽</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-xl tracking-tight" style={{ color: '#fff', lineHeight: 1 }}>
                Tu<span style={{ color: '#00E676' }}>Can</span>
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em',
                padding: '2px 7px', borderRadius: 99,
                background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
                color: '#00E676', textTransform: 'uppercase', lineHeight: 1.5
              }}>PRO</span>
            </div>
            <p className="hidden lg:block" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Gestión Integral de Canchas
            </p>
          </div>
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: 'var(--border-dim)', flexShrink: 0 }} className="hidden md:block" />

        {/* Venue Selector */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)', cursor: 'pointer',
          transition: 'all 0.2s ease', maxWidth: 260
        }}
          className="hidden lg:flex hover-venue-btn"
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,230,118,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
        >
          <Building2 size={15} color="#00E676" style={{ flexShrink: 0 }} />
          <div className="min-w-0">
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {COMPLEX_INFO.name}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {COMPLEX_INFO.canchas.length} canchas
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
            <Clock size={13} color="var(--text-muted)" />
            <span>{time} hs</span>
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border-dim)' }} />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '2px 8px', borderRadius: 99,
            background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
            fontSize: '0.74rem', fontWeight: 800, color: '#00E676'
          }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span>Bot activo</span>
          </div>
        </div>

        {/* + Nuevo Turno */}
        <button id="btn-nuevo-turno" onClick={onOpenNuevoTurno} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
          <PlusCircle size={15} style={{ color: '#040A06' }} />
          <span className="hidden sm:inline">Nuevo Turno</span>
          <span className="sm:hidden">+ Turno</span>
        </button>

        {/* Cobrar Cantina — desktop */}
        <button onClick={onOpenCantina} className="btn-secondary hidden sm:inline-flex" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
          <ShoppingBag size={15} color="#00E676" />
          <span className="hidden md:inline">Cantina</span>
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
                background: '#00B0FF', border: '2px solid var(--bg-pitch)',
                fontSize: '0.6rem', fontWeight: 900, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1
              }}>{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 300 }}>
              <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>Notificaciones</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} className="dropdown-item" style={{ gap: 10, alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginBottom: 1 }}>{n.text}</p>
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
              background: 'linear-gradient(140deg, #182A1E 0%, #1D3622 100%)',
              border: '1px solid rgba(0,230,118,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, color: '#00E676',
              transition: 'all 0.2s ease',
              boxShadow: profileOpen ? '0 0 0 2px rgba(0,230,118,0.3)' : 'none'
            }}
          >
            EM
          </button>

          {profileOpen && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 220 }}>
              <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>El Maracaná</p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>Administrador del Complejo</p>
              </div>

              <button className="dropdown-item" onClick={() => { setActiveTab('configuracion'); setProfileOpen(false); }}>
                <Settings size={15} color="var(--text-muted)" />
                Configuración
              </button>
              <button className="dropdown-item" onClick={() => { setActiveTab('reportes'); setProfileOpen(false); }}>
                <BarChart3 size={15} color="var(--text-muted)" />
                Reportes & Finanzas
              </button>
              <button className="dropdown-item" onClick={() => { setActiveTab('vista_publica'); setProfileOpen(false); }}>
                <Globe size={15} color="var(--text-muted)" />
                Vista Pública Web
              </button>
              <button className="dropdown-item">
                <HelpCircle size={15} color="var(--text-muted)" />
                Centro de Ayuda
              </button>

              <div className="dropdown-divider" />

              <div className="dropdown-item danger">
                <LogOut size={15} />
                Cerrar Sesión
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
