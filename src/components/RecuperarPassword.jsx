/**
 * RecuperarPassword.jsx — página `/recuperar`.
 *
 * Adonde cae el link del mail de recuperación. Supabase ya canjeó el código por
 * una sesión temporal antes de que este componente monte (`detectSessionInUrl`),
 * así que acá solo se pide la contraseña nueva y se llama `updateUser`.
 *
 * Es una página aparte, fuera de `StoreProvider`: no necesita ningún dato del
 * complejo y no tiene sentido cargarlos para cambiar una contraseña.
 */
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../lib/supabase.js';
import { purgarCacheLocal } from '../auth/AuthProvider.jsx';
import logoSetygol from '../assets/logo-setygol.png';

const MIN_LARGO = 10;

export default function RecuperarPassword() {
  const [estado, setEstado] = useState('verificando'); // verificando | listo | invalido | ok
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // El link es de un solo uso y vence. Sin sesión válida no se muestra el
  // formulario: es preferible mandar a pedir otro link que dejar escribir una
  // contraseña que después no se va a poder guardar.
  useEffect(() => {
    if (!supabaseConfigurado) {
      setEstado('invalido');
      return;
    }
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setEstado(data.session ? 'listo' : 'invalido');
    });
    return () => { vivo = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_LARGO) {
      setError(`La contraseña tiene que tener al menos ${MIN_LARGO} caracteres.`);
      return;
    }
    if (password !== repetir) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }

    setGuardando(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (err) {
      // El caso más común acá es la contraseña rechazada por estar en una
      // filtración conocida (protección HIBP activada en el panel de Supabase).
      setError(
        /pwned|breach|weak/i.test(err.message ?? '')
          ? 'Esa contraseña apareció en filtraciones conocidas. Elegí otra.'
          : 'No se pudo guardar la contraseña. Pedí un link nuevo e intentá otra vez.'
      );
      return;
    }

    // Cerrar sesión en todos los dispositivos: si alguien más tenía acceso con
    // la contraseña vieja, cambiarla tiene que sacarlo de verdad.
    await supabase.auth.signOut({ scope: 'global' });
    purgarCacheLocal();
    setEstado('ok');
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-pitch)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: '36px 32px', borderRadius: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 80px rgb(from var(--celeste) r g b / 0.04)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={logoSetygol}
            alt="Set&gol"
            style={{ height: 52, width: 'auto', borderRadius: 10, margin: '0 auto 14px' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Elegí una contraseña nueva</p>
        </div>

        {estado === 'verificando' && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Verificando el link…
          </p>
        )}

        {estado === 'invalido' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <AlertCircle size={34} style={{ margin: '0 auto', color: 'var(--red)' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Este link ya se usó o venció. Pedí uno nuevo desde “Olvidé mi contraseña”.
            </p>
            <a href="/" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {estado === 'ok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <CheckCircle2 size={34} style={{ margin: '0 auto', color: 'var(--celeste)' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Listo. Ya podés entrar al panel con tu contraseña nueva.
            </p>
            <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Ingresar al Panel
            </a>
          </div>
        )}

        {estado === 'listo' && (
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
              <label className="form-label" htmlFor="pass-nueva">Contraseña nueva</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="pass-nueva"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
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
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Mínimo {MIN_LARGO} caracteres.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="pass-repetir">Repetir contraseña</label>
              <input
                id="pass-repetir"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={guardando}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: guardando ? 0.7 : 1 }}
            >
              <KeyRound size={16} style={{ color: 'var(--on-accent)' }} />
              {guardando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
