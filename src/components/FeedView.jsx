import React, { useState } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Lock, 
  Unlock, 
  DollarSign, 
  Shield, 
  Sparkles, 
  Video, 
  Eye, 
  Share2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function FeedView({ balance, setBalance, onStartVirtualDate }) {
  const [unlockedPosts, setUnlockedPosts] = useState({});
  const [likes, setLikes] = useState({ 1: 420, 2: 890, 3: 1250 });
  const [likedPosts, setLikedPosts] = useState({});
  const [showTipModal, setShowTipModal] = useState(null);
  const [tipSuccess, setTipSuccess] = useState(false);

  const posts = [
    {
      id: 1,
      creatorName: 'Sofia "Aura" Rossi',
      creatorHandle: '@sofia_aura',
      creatorAvatar: '/assets/female_creator.jpg',
      category: 'Mujeres • Novia Virtual',
      timeAgo: 'Hace 2 horas',
      isVerified: true,
      text: '¡Nuevo set exclusivo de fotos de tarde relajada! Disponible gratis para mis suscriptores VIP de este mes o en pago por visión (PPV). ✨💖',
      isPPV: true,
      ppvPrice: 5.0,
      previewImage: '/assets/female_creator.jpg',
      lockedMessage: 'Desbloquea este set completo de 12 fotos HD exclusivas por $5.00 USDT',
      likesCount: likes[1] || 420,
      commentsCount: 34,
      is2257Compliant: true
    },
    {
      id: 2,
      creatorName: 'Mateo "Vesper" Silva',
      creatorHandle: '@mateo_vesper',
      creatorAvatar: '/assets/male_creator.jpg',
      category: 'Hombres • Citas 1 a 1',
      timeAgo: 'Hace 5 horas',
      isVerified: true,
      text: '¿Tomamos un café juntos esta noche? Ya tengo disponible mi agenda para citas virtuales 1 a 1. ¡Reserva tu sesión por minuto o por hora en el botón de abajo!',
      isPPV: false,
      previewImage: '/assets/male_creator.jpg',
      likesCount: likes[2] || 890,
      commentsCount: 78,
      is2257Compliant: true
    },
    {
      id: 3,
      creatorName: 'Elena & Alex',
      creatorHandle: '@elena_alex_duo',
      creatorAvatar: '/assets/virtual_date.jpg',
      category: 'LGBTQ+ • Contenido Parejas',
      timeAgo: 'Ayer',
      isVerified: true,
      text: 'Sesión especial de streaming privado completada. ¡Gracias a todos los que se sumaron a la sala VIP! Les dejamos un adelanto con marca de agua dinámica.',
      isPPV: true,
      ppvPrice: 8.5,
      previewImage: '/assets/virtual_date.jpg',
      lockedMessage: 'Desbloquea el video completo en alta definición de la transmisión VIP',
      likesCount: likes[3] || 1250,
      commentsCount: 112,
      is2257Compliant: true
    }
  ];

  const handleUnlockPPV = (postId, price) => {
    if (balance < price) {
      alert(`Saldo insuficiente. Requieres $${price} USDT. Saldo actual: $${balance.toFixed(2)} USDT.`);
      return;
    }
    setBalance(prev => prev - price);
    setUnlockedPosts(prev => ({ ...prev, [postId]: true }));
  };

  const handleLike = (postId) => {
    setLikedPosts(prev => {
      const isLiked = prev[postId];
      setLikes(l => ({ ...l, [postId]: isLiked ? l[postId] - 1 : l[postId] + 1 }));
      return { ...prev, [postId]: !isLiked };
    });
  };

  const handleSendTip = (amount) => {
    if (balance < amount) {
      alert(`Saldo insuficiente para enviar propina de $${amount} USDT.`);
      return;
    }
    setBalance(prev => prev - amount);
    setTipSuccess(true);
    setTimeout(() => {
      setTipSuccess(false);
      setShowTipModal(null);
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Banner Informativo Legal */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-md)',
        padding: '1.2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <Shield size={28} color="#ec4899" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem', color: '#f472b6' }}>
            Protección Legal & Marca de Agua Dinámica Integrada
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Todo el contenido mostrado cuenta con registros <strong>18 U.S.C 2257</strong>, contratos de cesión de imagen y verificación biométrica de creadores. Las imágenes descargadas o vistas incluyen una <strong>marca de agua invisible e interactiva con tu ID de usuario</strong> para prevenir filtraciones no autorizadas.
          </p>
        </div>
      </div>

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {posts.map(post => {
          const isUnlocked = unlockedPosts[post.id];

          return (
            <div key={post.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
              {/* Creator Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <img 
                    src={post.creatorAvatar} 
                    alt={post.creatorName}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ec4899' }} 
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{post.creatorName}</span>
                      <CheckCircle2 size={16} color="#34d399" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {post.creatorHandle} • <span style={{ color: '#ec4899' }}>{post.category}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge-2257">
                    <Shield size={12} /> 2257 OK
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{post.timeAgo}</span>
                </div>
              </div>

              {/* Text content */}
              <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#e2e8f0', marginBottom: '1rem' }}>
                {post.text}
              </p>

              {/* Media Container with Locked Overlay & Watermark */}
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                maxHeight: '400px',
                background: '#120e1a',
                border: '1px solid var(--border-light)'
              }}>
                <img 
                  src={post.previewImage} 
                  alt="Post media" 
                  style={{
                    width: '100%',
                    height: '380px',
                    objectFit: 'cover',
                    filter: post.isPPV && !isUnlocked ? 'blur(20px) brightness(0.4)' : 'none',
                    transition: 'all 0.4s ease'
                  }}
                />

                {/* Dynamic Watermark Overlay */}
                {(!post.isPPV || isUnlocked) && (
                  <div className="watermark-overlay">
                    <span className="watermark-text">
                      VELVET & AURA • LICENSED TO USER #ARG-84920 • 2026-08-02
                    </span>
                  </div>
                )}

                {/* PPV Lock Banner Overlay */}
                {post.isPPV && !isUnlocked && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'rgba(10, 9, 13, 0.65)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(236, 72, 153, 0.2)',
                      border: '2px solid #ec4899',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: 'var(--shadow-glow)'
                    }}>
                      <Lock size={26} color="#ec4899" />
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Contenido Exclusivo Bloqueado (PPV)
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '380px', marginBottom: '1.25rem' }}>
                      {post.lockedMessage}
                    </p>

                    <button 
                      onClick={() => handleUnlockPPV(post.id, post.ppvPrice)}
                      className="btn-primary"
                      style={{ padding: '0.75rem 1.8rem', fontSize: '0.9rem' }}
                    >
                      <Unlock size={18} /> Desbloquear por ${post.ppvPrice.toFixed(2)} USDT
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <button 
                    onClick={() => handleLike(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: likedPosts[post.id] ? '#f43f5e' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <Heart size={18} fill={likedPosts[post.id] ? '#f43f5e' : 'none'} />
                    {post.likesCount}
                  </button>

                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 500,
                    fontSize: '0.85rem'
                  }}>
                    <MessageSquare size={18} />
                    {post.commentsCount}
                  </button>

                  <button 
                    onClick={() => setShowTipModal(post.id)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fbbf24',
                      padding: '0.35rem 0.8rem',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <DollarSign size={14} /> Dar Propina
                  </button>
                </div>

                <button 
                  onClick={() => onStartVirtualDate(post.creatorName, post.creatorAvatar)}
                  className="btn-accent"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                >
                  <Video size={15} /> Cita Virtual 1a1
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <DollarSign size={40} color="#fbbf24" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Enviar Propina al Creador
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Apoya directamente el trabajo de tus creadores favoritos con créditos o USDT.
            </p>

            {tipSuccess ? (
              <div style={{ color: '#34d399', fontWeight: 700, padding: '1rem' }}>
                ¡Propina enviada con éxito! ✨
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button onClick={() => handleSendTip(2.0)} className="btn-secondary">$2 USDT</button>
                <button onClick={() => handleSendTip(5.0)} className="btn-primary">$5 USDT</button>
                <button onClick={() => handleSendTip(10.0)} className="btn-accent">$10 USDT</button>
              </div>
            )}

            <button 
              onClick={() => setShowTipModal(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
