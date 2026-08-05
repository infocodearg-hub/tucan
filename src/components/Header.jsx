import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Video, 
  CreditCard, 
  Compass, 
  Rss, 
  UserCheck, 
  Wallet,
  Lock,
  Heart
} from 'lucide-react';

export function Header({ activeTab, setActiveTab, userRole, setUserRole, balance, setBalance }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(10, 9, 13, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-light)',
      padding: '0.85rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('feed')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <div style={{ 
              fontWeight: 800, 
              fontSize: '1.25rem', 
              letterSpacing: '1px',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              VELVET & AURA
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={12} color="#10b981" /> Plataforma Legal 100% Verificada • 18+
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '999px', border: '1px solid var(--border-light)' }}>
          <button 
            onClick={() => setActiveTab('feed')}
            className={activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <Rss size={16} /> Feed & PPV
          </button>
          
          <button 
            onClick={() => setActiveTab('creators')}
            className={activeTab === 'creators' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <Compass size={16} /> Creadores
          </button>

          <button 
            onClick={() => setActiveTab('virtual-date')}
            className={activeTab === 'virtual-date' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <Video size={16} /> Citas Virtuales
          </button>

          <button 
            onClick={() => setActiveTab('kyc')}
            className={activeTab === 'kyc' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <ShieldCheck size={16} /> Centro Legal & KYC
          </button>

          <button 
            onClick={() => setActiveTab('payments')}
            className={activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <CreditCard size={16} /> Finanzas / Pagos
          </button>
        </nav>

        {/* User Controls & Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Balance Widget */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '999px',
            padding: '0.4rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#34d399'
          }}>
            <Wallet size={16} /> ${balance.toFixed(2)} USDT
          </div>

          {/* Role Switcher */}
          <button 
            onClick={() => setUserRole(userRole === 'client' ? 'model' : 'client')}
            style={{
              background: userRole === 'model' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${userRole === 'model' ? '#ec4899' : 'var(--border-light)'}`,
              color: userRole === 'model' ? '#f472b6' : 'var(--text-main)',
              borderRadius: '999px',
              padding: '0.4rem 0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <UserCheck size={14} /> 
            {userRole === 'client' ? 'Modo Cliente' : 'Modo Creador / Modelo'}
          </button>
        </div>
      </div>
    </header>
  );
}
