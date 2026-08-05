import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, MessageSquare, User
} from 'lucide-react';
import { BOT_CHATS_SIMULATED } from '../data/mockData';

const BOT_RESPONSES = (text) => {
  const lower = text.toLowerCase();
  if (lower.match(/comprobante|transferi|pago|foto|seña/)) {
    return '¡Comprobante recibido! 📸\n\n🔍 Leyendo con Visión IA...\n✓ Transacción: #98421094\n✓ Monto: $13.000\n✓ Destino: MARACANA.FUTBOL.MP\n\n✅ ¡Seña confirmada! Cancha 1 · 20:00 hs marcada como SEÑADO. ¡Nos vemos hoy!';
  }
  if (lower.match(/torneo|evento|empresa|cumple/)) {
    return '¡Hola! 🏆 Qué buena idea. Para torneos y eventos especiales te conecto con el encargado del complejo para un presupuesto a medida. En breve te contacta.';
  }
  if (lower.match(/cancha|libre|reserv|turno|\b20\b|\b21\b|\b22\b|noche|tarde|mañana/)) {
    return '¡Hola! 👋 Para hoy tenemos disponible:\n\n⚽ Cancha 1 (Fútbol 5) · 20:00 hs → $26.000\n🎾 Cancha 3 (Pádel) · 18:00 hs → $18.000\n\n¿Te reservo alguno? Mandame nombre y confirmamos.';
  }
  if (lower.match(/precio|cuanto|costo|valor/)) {
    return '¡Claro! Los precios en Complejo El Maracaná son:\n\n⚽ Fútbol 5 → $22.000 diurno / $26.000 nocturno\n🎾 Pádel → $18.000 diurno / $22.000 nocturno\n\nLa seña mínima es del 50%. ¿Reservamos?';
  }
  return '¡Hola! 🤖 Entendido. Estoy verificando disponibilidad en vivo en la grilla del complejo para coordinar tu reserva. ¿Para qué día y horario necesitás?';
};

function ChatBubble({ msg }) {
  if (!msg) return null;
  if (msg.sender === 'system') {
    return (
      <div style={{
        textAlign: 'center', padding: '8px 14px', borderRadius: 10,
        background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.25)',
        fontSize: '0.76rem', color: '#FFB300', fontWeight: 600
      }}>
        {msg.text}
      </div>
    );
  }

  const isBot = msg.sender === 'bot';
  return (
    <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
      <div style={{
        maxWidth: '82%', padding: '10px 14px', fontSize: '0.82rem', lineHeight: 1.55,
        ...(isBot ? {
          background: 'var(--bg-card-hover)', border: '1px solid var(--border-mid)',
          borderRadius: '14px 14px 14px 4px', color: 'var(--text-primary)',
        } : {
          background: 'linear-gradient(135deg, #00E676 0%, #00C044 100%)',
          borderRadius: '14px 14px 4px 14px',
          color: '#040A06', fontWeight: 600,
          boxShadow: '0 3px 14px rgba(0,230,118,0.3)'
        })
      }}>
        {isBot && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00E676' }}>
            <Bot size={10} /> TuCan IA
          </div>
        )}
        <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
        <div style={{ textAlign: 'right', fontSize: '0.65rem', marginTop: 5, opacity: 0.6 }}>{msg.time}</div>
      </div>
    </div>
  );
}

export default function WhatsappCopilot() {
  const [chats, setChats] = useState(BOT_CHATS_SIMULATED || []);
  const [selectedChatId, setSelectedChatId] = useState('chat1');
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);

  const activeChat = (chats && chats.length > 0)
    ? (chats.find(c => c.id === selectedChatId) || chats[0])
    : null;

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages?.length]);

  const toggleBot = (id) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, botStatus: c.botStatus === 'auto' ? 'human' : 'auto' } : c));
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChat) return;
    const userMsg = { sender: 'user', text: inputMsg, time: 'Ahora' };
    const botReply = { sender: 'bot', text: BOT_RESPONSES(inputMsg), time: 'Ahora' };
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [...(c.messages || []), userMsg, botReply] } : c));
    setInputMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">WhatsApp IA Copilot</h1>
          <p className="section-subtitle">Bot inteligente con NLU · Lectura de comprobantes · Derivación automática</p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 99,
          background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)',
          fontSize: '0.78rem', fontWeight: 800, color: '#00E676'
        }}>
          <span className="pulse-dot" />
          Bot activo · 34 conversaciones hoy
        </span>
      </div>

      {/* TuCan vs Tuki Comparison */}
      <div style={{
        padding: '18px 20px', borderRadius: 14,
        background: 'linear-gradient(120deg, rgba(0,230,118,0.05) 0%, rgba(0,176,255,0.03) 100%)',
        border: '1px solid rgba(0,230,118,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={16} color="#C8FF00" />
          <h3 className="font-heading" style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
            TuCan IA vs Tuki
          </h3>
          <span style={{
            padding: '2px 9px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 900,
            background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.3)', color: '#C8FF00'
          }}>
            🔥 SUPERIOR
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,79,79,0.05)', border: '1px solid rgba(255,79,79,0.3)' }}>
            <p style={{ fontSize: '0.76rem', fontWeight: 800, color: '#FF4F4F', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>❌ Tuki · Bot Rígido</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Bot: <em style={{ color: '#fff' }}>"Elegí: 1. 19hs / 2. 20hs"</em><br />
              Cliente: <em style={{ color: '#fff' }}>"A las 8 de la noche"</em><br />
              Bot: <span style={{ color: '#FF4F4F', fontWeight: 800 }}>"No te entiendo. Elegí 1 o 2."</span><br />
              <strong style={{ color: '#fff', fontSize: '0.76rem' }}>→ El cliente abandona la conversación.</strong>
            </p>
          </div>
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.3)' }}>
            <p style={{ fontSize: '0.76rem', fontWeight: 800, color: '#00E676', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ TuCan · NLU Natural + OCR</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Cliente: <em style={{ color: '#fff' }}>"¿Tienen la cancha 1 a las 8 de la noche?"</em><br />
              TuCan: <span style={{ color: '#00E676', fontWeight: 700 }}>"¡Hola! Sí, libre. Seña: $13.000 → MARACANA.FUTBOL.MP"</span><br />
              <strong style={{ color: '#fff', fontSize: '0.76rem' }}>→ Confirmación automática al recibir la foto.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
        
        {/* Left: Chat List */}
        <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} color="#00E676" />
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>Conversaciones</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#00E676', fontWeight: 700 }}>
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              En Vivo
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chats.map(chat => {
              const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
              const isSelected = activeChat && activeChat.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(0,230,118,0.35)' : 'transparent'}`,
                    boxShadow: isSelected ? '0 0 14px rgba(0,230,118,0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff' }}>{chat.clientName || 'Cliente'}</span>
                    <span style={{
                      fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, fontWeight: 800,
                      background: chat.botStatus === 'auto' ? 'rgba(0,230,118,0.12)' : 'rgba(255,179,0,0.12)',
                      border: `1px solid ${chat.botStatus === 'auto' ? 'rgba(0,230,118,0.3)' : 'rgba(255,179,0,0.3)'}`,
                      color: chat.botStatus === 'auto' ? '#00E676' : '#FFB300'
                    }}>
                      {chat.botStatus === 'auto' ? '🤖 IA' : '⚠️ Humano'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg ? lastMsg.text?.split('\n')[0] : 'Sin mensajes'}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            ⚡ <strong style={{ color: '#fff' }}>WhatsApp Business API</strong> conectado con{' '}
            <span style={{ color: '#00E676' }}>Complejo El Maracaná</span>
          </div>
        </div>

        {/* Right: Active Chat */}
        {activeChat ? (
          <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border-dim)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: '#00E676', fontSize: '0.78rem', fontFamily: 'Outfit,sans-serif'
                }}>
                  {(activeChat.clientName || 'CL').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-heading" style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{activeChat.clientName}</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{activeChat.phone}</p>
                </div>
              </div>

              <button
                onClick={() => toggleBot(activeChat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800,
                  transition: 'all 0.2s ease',
                  background: activeChat.botStatus === 'auto' ? 'rgba(0,230,118,0.12)' : 'rgba(255,179,0,0.12)',
                  border: `1px solid ${activeChat.botStatus === 'auto' ? 'rgba(0,230,118,0.4)' : 'rgba(255,179,0,0.4)'}`,
                  color: activeChat.botStatus === 'auto' ? '#00E676' : '#FFB300'
                }}
              >
                {activeChat.botStatus === 'auto' ? <><Bot size={14} /> Modo IA Auto</> : <><User size={14} /> Tomar Control</>}
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, minHeight: 280 }}>
              {(activeChat.messages || []).map((msg, i) => <ChatBubble key={i} msg={msg} />)}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-dim)', marginTop: 14 }}>
              <input
                type="text"
                placeholder="Probá el bot: 'Tenés cancha a las 8 de la noche?' o 'Te mando el comprobante'"
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                className="form-input"
                style={{ flex: 1, padding: '10px 14px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 16px', flexShrink: 0 }}>
                <Send size={14} style={{ color: '#040A06' }} />
                <span className="hidden sm:inline">Probar IA</span>
              </button>
            </form>
          </div>
        ) : (
          <div style={{ padding: '40px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay conversaciones seleccionadas.
          </div>
        )}
      </div>

    </div>
  );
}
