/**
 * VistaPublicaJugador.jsx — página `/reserva/<slug>`, la que abre el QR.
 *
 * La ve gente que no tiene cuenta. Por eso NO usa el store ni la clave de la
 * app: todo pasa por la Edge Function `public-reserva`, que decide qué se puede
 * ver y qué se puede crear. El navegador de un desconocido nunca habla con la
 * base directamente, y el precio lo pone el servidor (si viniera de acá,
 * cualquiera reservaría a $1 cambiando un número en las herramientas del
 * navegador).
 */
import React, { useEffect, useState } from 'react';
import {
  MapPin, Clock, ShieldCheck, User, Phone, MessageSquare, AlertCircle,
  Sun, Moon, Volleyball,
} from 'lucide-react';
import { isNightSlot, precioSlot, senaSugerida } from '../lib/pricing';
import { formatARS } from '../lib/format';
import { addDays, formatMediumDate, relativeDayLabel, todayISO } from '../lib/date';
import { openWhatsApp, msgConsultaPublica } from '../lib/whatsapp';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/public-reserva`;
const DIAS_VISIBLES = 7;

export default function VistaPublicaJugador({ slug }) {
  const [fecha, setFecha] = useState(todayISO);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [canchaId, setCanchaId] = useState('');
  const [hora, setHora] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);

  // ─── disponibilidad del día ────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) {
      setErrorCarga('El link no es válido. Pedile al complejo el enlace o el QR correcto.');
      setCargando(false);
      return;
    }

    let vivo = true;
    setCargando(true);
    setError('');

    fetch(`${FUNCTIONS_URL}?slug=${encodeURIComponent(slug)}&fecha=${fecha}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'No pudimos cargar los horarios.');
        return body;
      })
      .then((body) => {
        if (!vivo) return;
        setDatos(body);
        setErrorCarga('');
        // Al cambiar de día se conserva la elección si sigue existiendo; si no,
        // se cae a la primera cancha para no dejar el resumen en blanco.
        setCanchaId((prev) => (body.canchas.some((c) => c.id === prev) ? prev : body.canchas[0]?.id ?? ''));
        setHora((prev) => (body.slots.includes(prev) ? prev : body.slots[0] ?? ''));
      })
      .catch((err) => {
        if (!vivo) return;
        setErrorCarga(err.message);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => { vivo = false; };
  }, [slug, fecha]);

  const cancha = datos?.canchas.find((c) => c.id === canchaId) ?? datos?.canchas[0] ?? null;
  const nightFrom = datos?.horaNocturnaDesde ?? '19:00';
  const esNoche = isNightSlot(hora || '20:00', nightFrom);
  const precio = cancha ? precioSlot(cancha, hora || '20:00', nightFrom) : 0;
  const sena = senaSugerida(precio, datos?.senaMinimaPorcentaje ?? 50);

  const ocupado = (cId, h) =>
    (datos?.ocupados ?? []).some((o) => o.canchaId === cId && o.hora === h);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('Ingresá tu nombre para reservar.');
    if (!cancha) return setError('No hay canchas disponibles en este momento.');
    if (!hora) return setError('Elegí un horario.');
    if (ocupado(cancha.id, hora)) return setError('Ese horario ya está tomado. Elegí otro.');

    setEnviando(true);
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, fecha, hora, canchaId: cancha.id, nombre: nombre.trim(), telefono,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'No pudimos guardar la reserva.');

      openWhatsApp(
        datos?.complejo?.telefono,
        msgConsultaPublica({
          cancha,
          fecha,
          hora,
          precio: body.precio ?? precio,
          sena: body.sena ?? senaSugerida(body.precio ?? precio, datos?.senaMinimaPorcentaje ?? 50),
          complejo: datos?.complejo?.nombre,
          codigo: body.codigo,
          expiraEn: body.expiraEn,
        })
      );
      setExito({
        hora,
        fecha,
        cancha: cancha.nombre,
        codigo: body.codigo,
        sena: body.sena ?? sena,
        expiraEn: body.expiraEn ?? datos?.minutosExpiracionPendiente ?? 60,
      });
    } catch (err) {
      setError(err.message);
      // El error más probable es que otro haya tomado el horario mientras se
      // completaba el formulario: se refresca la grilla para que se vea ocupado.
      setFecha((f) => f);
      setDatos((d) => d && { ...d, ocupados: [...d.ocupados, { canchaId: cancha.id, hora }] });
    } finally {
      setEnviando(false);
    }
  };

  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => addDays(todayISO(), i));

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{
          borderRadius: 24, border: '2px solid var(--border-mid)',
          background: 'var(--bg-surface)', padding: '24px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgb(from var(--celeste) r g b / 0.08)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Portada */}
          <div style={{
            padding: '24px', borderRadius: 18, textAlign: 'center',
            background: 'linear-gradient(140deg, rgb(from var(--celeste) r g b / 0.12) 0%, rgba(0,176,255,0.06) 100%)',
            border: '1px solid rgb(from var(--celeste) r g b / 0.25)',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: '0 auto 12px',
              background: 'linear-gradient(140deg, var(--celeste), var(--color-accent-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgb(from var(--celeste) r g b / 0.4)',
            }}>
              <Volleyball size={26} color="white" strokeWidth={2.2} />
            </div>
            <h2 className="font-heading" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
              {datos?.complejo?.nombre ?? 'Reservá tu cancha'}
            </h2>
            {(datos?.complejo?.direccion || datos?.complejo?.ciudad) && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <MapPin size={12} color="var(--celeste)" />
                {[datos.complejo.direccion, datos.complejo.ciudad].filter(Boolean).join(', ')}
              </p>
            )}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
              padding: '5px 14px', borderRadius: 99, background: 'rgb(from var(--celeste) r g b / 0.12)',
              border: '1px solid rgb(from var(--celeste) r g b / 0.3)', fontSize: '0.76rem', fontWeight: 800, color: 'var(--celeste)',
            }}>
              <ShieldCheck size={13} /> Reservas verificadas 24/7
            </div>
          </div>

          {errorCarga && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)',
              color: 'var(--red)', fontSize: '0.82rem',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {errorCarga}
            </div>
          )}

          {exito ? (
            /* El turno NO está confirmado todavía y la pantalla tiene que
               decirlo. Un "¡Listo!" en verde acá haría que el jugador cierre
               la pestaña sin señar y después aparezca el sábado convencido de
               que tiene cancha. Por eso: ámbar, el reloj, y el código grande. */
            <div style={{ padding: '28px', borderRadius: 16, textAlign: 'center', background: 'rgb(245 165 36 / 0.07)', border: '1px solid rgb(245 165 36 / 0.35)' }}>
              <Clock size={44} color="var(--color-partial-500)" style={{ margin: '0 auto 14px' }} />
              <h3 className="font-heading" style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 8 }}>
                Te guardamos el horario
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                {exito.cancha} · {formatMediumDate(exito.fecha)} · <span className="num">{exito.hora}</span> hs.
                <br />
                Queda reservado <strong style={{ color: 'var(--color-partial-500)' }}>{exito.expiraEn} minutos</strong>.
                Mandá la seña de <span className="num">{formatARS(exito.sena)}</span> por WhatsApp y te lo confirmamos.
              </p>

              {exito.codigo && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, color: 'var(--text-faint)', marginBottom: 4 }}>
                    Tu código de reserva
                  </p>
                  <p className="font-heading num" style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
                    {exito.codigo}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
                    Ya va en el mensaje de WhatsApp que te abrimos.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setExito(null); setFecha(todayISO()); }}
                className="btn-secondary"
                style={{ margin: '0 auto' }}
              >
                Reservar otro turno
              </button>
            </div>
          ) : !errorCarga && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {error && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)', color: 'var(--red)', fontSize: '0.8rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}

              {/* 1 · Día */}
              <div>
                <Titulo n={1} texto="Elegí el día" />
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {dias.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFecha(d)}
                      style={{
                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                        fontSize: '0.76rem', fontWeight: 700, transition: 'all 0.18s ease',
                        background: fecha === d ? 'var(--celeste)' : 'var(--bg-input)',
                        border: `1px solid ${fecha === d ? 'var(--celeste)' : 'var(--border-dim)'}`,
                        color: fecha === d ? 'var(--on-accent)' : 'var(--text-primary)',
                      }}
                    >
                      {relativeDayLabel(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 · Cancha */}
              <div>
                <Titulo n={2} texto="Elegí la cancha" />
                {cargando ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando…</p>
                ) : (datos?.canchas.length ?? 0) === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay canchas disponibles.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: 8 }}>
                    {datos.canchas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCanchaId(c.id)}
                        style={{
                          padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                          transition: 'all 0.18s ease', minWidth: 0,
                          background: canchaId === c.id ? `${c.color}18` : 'var(--bg-input)',
                          border: `1px solid ${canchaId === c.id ? c.color : 'var(--border-dim)'}`,
                          boxShadow: canchaId === c.id ? `0 0 14px ${c.color}22` : 'none',
                        }}
                      >
                        <div className="font-heading" style={{ fontWeight: 800, fontSize: '0.82rem', color: canchaId === c.id ? c.color : 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.nombre}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.subtitulo || '—'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3 · Horario */}
              <div>
                <Titulo n={3} texto="Elegí el horario" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(datos?.slots ?? []).map((t) => {
                    const tomado = cancha ? ocupado(cancha.id, t) : false;
                    const elegido = hora === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={tomado}
                        onClick={() => setHora(t)}
                        title={tomado ? 'Ya reservado' : undefined}
                        className="num"
                        style={{
                          padding: '9px 4px', borderRadius: 10, transition: 'all 0.18s ease',
                          fontSize: '0.8rem', fontWeight: 700,
                          cursor: tomado ? 'not-allowed' : 'pointer',
                          opacity: tomado ? 0.35 : 1,
                          textDecoration: tomado ? 'line-through' : 'none',
                          background: elegido ? 'var(--celeste)' : 'var(--bg-input)',
                          border: `1px solid ${elegido ? 'var(--celeste)' : 'var(--border-dim)'}`,
                          color: elegido ? 'var(--on-accent)' : 'var(--text-primary)',
                          boxShadow: elegido ? '0 3px 12px rgb(from var(--celeste) r g b / 0.35)' : 'none',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 · Datos */}
              <div>
                <Titulo n={4} texto="Tus datos" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-icon" />
                    <input
                      type="text" placeholder="Tu nombre" value={nombre} maxLength={80}
                      onChange={(e) => setNombre(e.target.value)} className="form-input" required
                    />
                  </div>
                  <div className="input-icon-wrap">
                    <Phone size={14} className="input-icon" />
                    <input
                      type="tel" placeholder="Tu WhatsApp (opcional)" value={telefono}
                      onChange={(e) => setTelefono(e.target.value)} className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Resumen y CTA */}
              <div style={{
                padding: '16px', borderRadius: 14,
                background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {cancha?.nombre ?? '—'} · <span className="num">{hora || '—'}</span> hs ·
                    {esNoche ? <Moon size={11} /> : <Sun size={11} />}
                    {esNoche ? 'Nocturno' : 'Diurno'}
                  </p>
                  <p className="font-heading num" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {formatARS(precio)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--celeste)', fontWeight: 700, marginTop: 4 }}>
                    Seña: {formatARS(sena)} ({datos?.senaMinimaPorcentaje ?? 50}%)
                  </p>
                  {/* La regla se dice ANTES de apretar el botón, no después. */}
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 3 }}>
                    Te lo guardamos {datos?.minutosExpiracionPendiente ?? 60} min para que mandes la seña.
                  </p>
                </div>
                <button
                  type="submit" className="btn-primary" disabled={enviando || cargando}
                  style={{ padding: '12px 18px', flexShrink: 0, opacity: enviando ? 0.7 : 1 }}
                >
                  <MessageSquare size={15} style={{ color: 'var(--on-accent)' }} />
                  {enviando ? 'Reservando…' : 'Reservar por WhatsApp'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Titulo({ n, texto }) {
  return (
    <p style={{
      fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10,
    }}>
      <span className="num">{n}</span> · {texto}
    </p>
  );
}
