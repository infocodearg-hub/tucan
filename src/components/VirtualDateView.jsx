import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  Heart, 
  Send, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export function VirtualDateView({ creatorName = 'Sofia "Aura" Rossi', creatorAvatar = '/assets/female_creator.jpg', balance, setBalance }) {
  const [isCallActive, setIsCallActive] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [ratePerMin] = useState(2.50);
  const [totalSpent, setTotalSpent] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [hearts, setHearts] = useState([]);
  const [messages, setMessages] = useState([
    { sender: 'creator', text: '¡Hola amor! Qué lindo verte por acá. ¿Cómo estuvo tu día?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Call timer and billing calculation
  useEffect(() => {
    let timer;
    if (isCallActive) {
      timer = setInterval(() => {
        setSeconds(prev => {
          const newSec = prev + 1;
          const cost = (newSec / 60) * ratePerMin;
          setTotalSpent(cost);
          
          // Deduct from balance continuously
          setBalance(b => Math.max(0, b - (ratePerMin / 60)));
          return newSec;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive, ratePerMin, setBalance]);

  // Handle heart reaction
  const triggerHeart = () => {
    const newHeart = { id: Date.now(), x: Math.random() * 80 + 10 };
    setHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: inputMessage }]);
    const userMsg = inputMessage;
    setInputMessage('');

    // Simulate creator response
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { sender: 'creator', text: `¡Me encanta charlar vos! Cuéntame más sobre ${userMsg.slice(0, 15)}... 💕` }
      ]);
    }, 1500);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Header Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: 'var(--bg-card)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={creatorAvatar} 
            alt={creatorName} 
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ec4899' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cita Virtual 1a1 con {creatorName}</h2>
              <span className="badge-live">
                ● EN VIVO
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tarifa: <strong>${ratePerMin.toFixed(2)} USDT / min</strong> • Modalidad Novia/o Virtual
            </div>
          </div>
        </div>

        {/* Realtime Billing Widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
              <Clock size={12} /> Tiempo Transcurrido
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ec4899', fontFamily: 'monospace' }}>
              {formatTime(seconds)}
            </div>
          </div>

          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-light)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Consumido</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
              ${totalSpent.toFixed(2)} USDT
            </div>
          </div>
        </div>
      </div>

      {/* Main Video & Chat Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isCallActive ? '1fr 340px' : '1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Video Call Interface */}
        <div style={{
          position: 'relative',
          background: '#0d0a14',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-glow)',
          height: '520px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Main Remote Video Stream (Creator) */}
          {isCallActive ? (
            <div style={{ position: 'absolute', inset: 0 }}>
              <img 
                src="/assets/virtual_date.jpg" 
                alt="Virtual Date Live Stream" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Watermark */}
              <div className="watermark-overlay">
                <span className="watermark-text">
                  WEBRTC ENCRYPTED • USER #ARG-84920 • 2026-08-02
                </span>
              </div>

              {/* Heart floating animation */}
              {hearts.map(h => (
                <div 
                  key={h.id}
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: `${h.x}%`,
                    color: '#f43f5e',
                    fontSize: '2rem',
                    animation: 'floatUp 2s forwards ease-out',
                    pointerEvents: 'none'
                  }}
                >
                  ❤️
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 9, 13, 0.9)',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <PhoneOff size={56} color="#f43f5e" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Cita Virtual Finalizada
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px' }}>
                Duración total: <strong>{formatTime(seconds)}</strong> • Total facturado: <strong>${totalSpent.toFixed(2)} USDT</strong>
              </p>
              <button 
                onClick={() => { setIsCallActive(true); setSeconds(0); setTotalSpent(0); }}
                className="btn-primary"
              >
                Iniciar Nueva Sesión 1a1
              </button>
            </div>
          )}

          {/* Local User Preview Small Window */}
          {isCallActive && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '120px',
              height: '160px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '2px solid var(--accent-pink)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              background: '#201b2d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              {videoEnabled ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  🎥 Cámara Local Activa
                </div>
              ) : (
                <VideoOff size={24} color="var(--text-muted)" />
              )}
            </div>
          )}

          {/* Call Floating Controls Toolbar */}
          {isCallActive && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10, 9, 13, 0.85)',
              backdropFilter: 'blur(16px)',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              zIndex: 20
            }}>
              <button 
                onClick={() => setMicEnabled(!micEnabled)}
                style={{
                  background: micEnabled ? 'rgba(255,255,255,0.1)' : '#f43f5e',
                  border: 'none',
                  color: '#fff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button 
                onClick={() => setVideoEnabled(!videoEnabled)}
                style={{
                  background: videoEnabled ? 'rgba(255,255,255,0.1)' : '#f43f5e',
                  border: 'none',
                  color: '#fff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>

              <button 
                onClick={triggerHeart}
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: '#f43f5e',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Heart size={20} fill="#f43f5e" />
              </button>

              <button 
                onClick={() => setIsCallActive(false)}
                style={{
                  background: '#f43f5e',
                  border: 'none',
                  color: '#fff',
                  padding: '0.6rem 1.2rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <PhoneOff size={18} /> Cortar Cita
              </button>
            </div>
          )}
        </div>

        {/* Live Chat & Interaction Box */}
        {isCallActive && (
          <div className="glass-card" style={{ height: '520px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              paddingBottom: '0.75rem',
              marginBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Sparkles size={16} color="#ec4899" /> Chat en Vivo Privado
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingRight: '0.3rem',
              marginBottom: '0.75rem'
            }}>
              {messages.map((m, idx) => (
                <div 
                  key={idx}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: m.sender === 'user' ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-light)',
                    borderRadius: '14px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.825rem',
                    lineHeight: '1.4'
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.4rem' }}>
              <input 
                type="text" 
                placeholder="Escribe un mensaje privado..."
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-full)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '0.6rem', borderRadius: '50%', width: '38px', height: '38px', justifyContent: 'center' }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 1; }
          100% { transform: translateY(-120px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
