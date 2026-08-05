import React from 'react';
import { Camera, FolderKanban, Film, Palette, Calculator, Sparkles, Key } from 'lucide-react';

export function CarniceriaStudioHeader({ activeTab, setActiveTab, apiKey, setApiKey }) {
  return (
    <header style={{
      background: 'rgba(15, 12, 18, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
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
        {/* Logo & Brand Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff' }}>
                Carnicería <span style={{ color: '#ef4444' }}>Studio Pro</span>
              </h1>
              <span style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '20px'
              }}>
                v2.0 API Direct
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
              Generación Directa, Marca Consistente & Centralizador
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('generator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              background: activeTab === 'generator' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'generator' ? '#fff' : '#9ca3af',
              boxShadow: activeTab === 'generator' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <Camera size={16} />
            Estudio IA (1-Click)
          </button>

          <button
            onClick={() => setActiveTab('organizer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              background: activeTab === 'organizer' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'organizer' ? '#fff' : '#9ca3af',
              boxShadow: activeTab === 'organizer' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <FolderKanban size={16} />
            Organizador & Carpetas
          </button>

          <button
            onClick={() => setActiveTab('reels')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              background: activeTab === 'reels' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'reels' ? '#fff' : '#9ca3af',
              boxShadow: activeTab === 'reels' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <Film size={16} />
            Reels & Subtítulos
          </button>

          <button
            onClick={() => setActiveTab('brand')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              background: activeTab === 'brand' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'brand' ? '#fff' : '#9ca3af',
              boxShadow: activeTab === 'brand' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <Palette size={16} />
            Estilo & Branding
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              background: activeTab === 'pricing' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'pricing' ? '#fff' : '#9ca3af',
              boxShadow: activeTab === 'pricing' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <Calculator size={16} />
            Tarifario CM
          </button>
        </nav>

        {/* API Key Quick Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.35rem 0.75rem'
          }}>
            <Key size={14} color="#f87171" />
            <input
              type="password"
              placeholder="Google Gemini API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.75rem',
                outline: 'none',
                width: '135px'
              }}
            />
          </div>
          <span style={{
            fontSize: '0.7rem',
            color: apiKey ? '#34d399' : '#fbbf24',
            fontWeight: '600'
          }}>
            {apiKey ? '● API Lista' : '● Preset Demo'}
          </span>
        </div>
      </div>
    </header>
  );
}
