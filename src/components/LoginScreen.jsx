/**
 * LoginScreen.jsx — Fase 4
 *
 * Gate de acceso local. Valida contra config.acceso.usuario / .password.
 * La sesión se guarda en localStorage directamente (no en el store: ui no
 * se persiste y no queremos que un F5 cierre la sesión).
 *
 * Seguridad: esto NO es auth real. Es solo una pantalla de acceso para
 * demo. Al migrar a Supabase, este componente se reemplaza por Supabase Auth.
 */
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useConfig } from '../store';

export const SESSION_KEY = 'tucan_session_v1';

/** Devuelve true si hay sesión activa en localStorage. */
export function hasActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    return !!s?.loggedIn;
  } catch {
    return false;
  }
}

/** Guarda la sesión en localStorage. */
export function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, ts: Date.now() }));
}

/** Borra la sesión. */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function LoginScreen({ onLogin }) {
  const config = useConfig();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const acceso = config?.acceso;
  const nombreComplejo = config?.complejo?.nombre ?? 'TuCan';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simula latencia de red para que no parezca instantáneo
    await new Promise((r) => setTimeout(r, 400));

    if (usuario.trim() === acceso?.usuario && password === acceso?.password) {
      saveSession();
      onLogin();
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-pitch)',
      padding: '24px',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '36px 32px',
        borderRadius: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-dim)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 80px rgba(0,230,118,0.04)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
            background: 'linear-gradient(140deg, var(--green) 0%, var(--green-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(0,230,118,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>⚽</span>
          </div>
          <h1 className="font-heading" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
            Tu<span style={{ color: 'var(--green)' }}>Can</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {nombreComplejo} — Panel de Administración
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              borderRadius: 10, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)',
              color: 'var(--red)', fontSize: '0.8rem', fontWeight: 600,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuario</label>
            <input
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="form-input"
              placeholder="admin"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••"
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            <LogIn size={16} style={{ color: 'var(--on-accent)' }} />
            {loading ? 'Ingresando…' : 'Ingresar al Panel'}
          </button>
        </form>

        {/* Hint demo */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 20 }}>
          Demo: usuario <code style={{ fontFamily: 'monospace', color: 'var(--green)' }}>admin</code> ·
          contraseña <code style={{ fontFamily: 'monospace', color: 'var(--green)' }}>tucan</code>
        </p>
      </div>
    </div>
  );
}
