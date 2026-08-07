/**
 * LoginScreen.jsx — acceso real contra Supabase Auth.
 *
 * No hay registro público: las cuentas se crean desde nuestro lado
 * (`tools/provision.mjs`) y el dueño suma a su equipo desde Configuración.
 * Esta pantalla solo inicia sesión y pide recuperación de contraseña.
 */
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider.jsx';
import logoSetygol from '../assets/logo-setygol.png';

export default function LoginScreen() {
  const { signIn, recuperarPassword } = useAuth();

  const [modo, setModo] = useState('login'); // 'login' | 'recuperar' | 'enviado'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn(email, password);
    if (!res.ok) setError(res.error);
    // Si salió bien no se toca el estado: `onAuthStateChange` desmonta esta
    // pantalla. Setear estado sobre un componente ya desmontado avisa en consola.
    setLoading(false);
  };

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await recuperarPassword(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setModo('enviado');
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
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 80px rgb(from var(--celeste) r g b / 0.04)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={logoSetygol}
            alt="Set&gol"
            style={{ height: 52, width: 'auto', borderRadius: 10, margin: '0 auto 14px' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {modo === 'login' ? 'Panel de Administración' : 'Recuperar acceso'}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 14,
            borderRadius: 10, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)',
            color: 'var(--red)', fontSize: '0.8rem', fontWeight: 600,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ─── Iniciar sesión ─── */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="tu@complejo.com"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="login-password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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

            <button
              type="button"
              onClick={() => { setModo('recuperar'); setError(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600,
              }}
            >
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {/* ─── Pedir link de recuperación ─── */}
        {modo === 'recuperar' && (
          <form onSubmit={handleRecuperar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Te mandamos un link a tu email para que puedas elegir una contraseña nueva.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="recuperar-email">Email</label>
              <input
                id="recuperar-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="tu@complejo.com"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Enviando…' : 'Enviarme el link'}
            </button>

            <button
              type="button"
              onClick={() => { setModo('login'); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600,
              }}
            >
              <ArrowLeft size={13} /> Volver
            </button>
          </form>
        )}

        {/* ─── Confirmación ─── */}
        {modo === 'enviado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <MailCheck size={34} style={{ margin: '0 auto', color: 'var(--celeste)' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Si esa dirección tiene una cuenta, en unos minutos te va a llegar el link para
              cambiar la contraseña. Revisá también la carpeta de spam.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setModo('login'); setError(''); }}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
