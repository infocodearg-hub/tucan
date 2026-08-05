import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Video, 
  Heart, 
  Star, 
  Search, 
  Filter,
  Sparkles,
  UserCheck
} from 'lucide-react';

export function CreatorsView({ onStartVirtualDate }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const creators = [
    {
      id: 1,
      name: 'Sofia "Aura" Rossi',
      handle: '@sofia_aura',
      avatar: '/assets/female_creator.jpg',
      cover: '/assets/female_creator.jpg',
      category: 'mujeres',
      categoryLabel: 'Mujeres • Novia Virtual',
      bio: 'Creadora de contenido lifestyle, cosplay y novia virtual. Charlas relajadas, streams en vivo y sets fotográficos exclusivos.',
      subPrice: 9.99,
      dateRatePerMin: 2.50,
      rating: 4.9,
      subscribers: '1.4k',
      is2257: true
    },
    {
      id: 2,
      name: 'Mateo "Vesper" Silva',
      handle: '@mateo_vesper',
      avatar: '/assets/male_creator.jpg',
      cover: '/assets/male_creator.jpg',
      category: 'hombres',
      categoryLabel: 'Hombres • Citas 1 a 1',
      bio: 'Personal trainer y acompañante virtual casual. Charlas de fitness, consejos de vida y videoconferencias 1 a 1.',
      subPrice: 7.99,
      dateRatePerMin: 2.00,
      rating: 4.85,
      subscribers: '980',
      is2257: true
    },
    {
      id: 3,
      name: 'Elena & Alex',
      handle: '@elena_alex_duo',
      avatar: '/assets/virtual_date.jpg',
      cover: '/assets/virtual_date.jpg',
      category: 'lgbtq',
      categoryLabel: 'LGBTQ+ • Dúo Creativo',
      bio: 'Pareja de creadores queer dedicados a la fotografía artística, shows en vivo interactivos y contenido exclusivo bajo suscripción.',
      subPrice: 12.50,
      dateRatePerMin: 3.50,
      rating: 5.0,
      subscribers: '2.1k',
      is2257: true
    }
  ];

  const filteredCreators = creators.filter(c => {
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 800, 
          marginBottom: '0.5rem',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Directorio de Creadores y Novios/as Virtuales
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Conecta con modelos 100% verificados legalmente de todas las categorías: mujeres, hombres, colectivo LGBTQ+ y acompañamiento virtual.
        </p>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        background: 'var(--bg-card)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o @handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-full)',
              color: '#fff',
              outline: 'none',
              fontSize: '0.85rem'
            }}
          />
        </div>

        {/* Category Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'mujeres', label: 'Mujeres' },
            { id: 'hombres', label: 'Hombres' },
            { id: 'lgbtq', label: 'LGBTQ+' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Creators Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        {filteredCreators.map(creator => (
          <div key={creator.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Cover & Avatar */}
            <div style={{ position: 'relative', height: '140px', background: '#181324' }}>
              <img 
                src={creator.cover} 
                alt="Cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-28px',
                left: '1.25rem',
                border: '3px solid #0a090d',
                borderRadius: '50%',
                overflow: 'hidden'
              }}>
                <img 
                  src={creator.avatar} 
                  alt={creator.name} 
                  style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                />
              </div>

              <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                <span className="badge-kyc">
                  <ShieldCheck size={13} /> KYC Verificado
                </span>
              </div>
            </div>

            {/* Creator Info */}
            <div style={{ padding: '2.2rem 1.25rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{creator.name}</h3>
                    <CheckCircle2 size={16} color="#34d399" />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{creator.handle}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>
                  <Star size={16} fill="#fbbf24" /> {creator.rating}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 600, marginBottom: '0.75rem' }}>
                {creator.categoryLabel}
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.2rem', height: '40px', overflow: 'hidden' }}>
                {creator.bio}
              </p>

              {/* Pricing Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Suscripción Mes</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>${creator.subPrice.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cita Virtual / Min</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>${creator.dateRatePerMin.toFixed(2)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.55rem' }}>
                  Suscribirse
                </button>
                <button 
                  onClick={() => onStartVirtualDate(creator.name, creator.avatar)}
                  className="btn-accent" 
                  style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.55rem' }}
                >
                  <Video size={15} /> Cita Virtual
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
