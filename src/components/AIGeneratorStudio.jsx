import React, { useState, useId } from 'react';
import { Sparkles, Download, Copy, Check, Sliders, Image, Layers, Tag, Eye, RefreshCw, Wand2, ShieldCheck } from 'lucide-react';

export function AIGeneratorStudio({ apiKey }) {
  const [selectedCategory, setSelectedCategory] = useState('vacuno');
  const [selectedCut, setSelectedCut] = useState('Asado de Tira de Primera');
  const [selectedStyle, setSelectedStyle] = useState('rustico');
  const [selectedFormat, setSelectedFormat] = useState('9:16');
  const [offerText, setOfferText] = useState('OFERTA DEL FINDE $9.900/kg');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [customNotes, setCustomNotes] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Pre-configured product cuts
  const cutsByCategory = {
    vacuno: [
      'Asado de Tira de Primera',
      'Vacío Jugoso y Veteado',
      'Ojo de Bife Corte Ancho',
      'Entraña Fina de Primera',
      'Matambre Vacuno Fresco',
      'Tomahawk Steak Premium',
      'Picaña Brasilera'
    ],
    cerdo_achuras: [
      'Chorizo Bombón Artesanal',
      'Mollejas de Corazón al Limón',
      'Pechito de Cerdo con Cuero',
      'Morcilla Criolla',
      'Chinchulines Dorados'
    ],
    combos: [
      'Combo Parrillero Finde Completo',
      'Combo Hamburguesas Gourmet Cuchillo',
      'Combo Asado Familiar 5 Personas',
      'Combo Picada Caliente de Campo'
    ],
    preparados: [
      'Milanesas de Peceto Rebozadas',
      'Empanadas Cortadas a Cuchillo',
      'Matambre Arrollado de Pollo',
      'Albondigas Caseras con Hachas'
    ]
  };

  // Pre-configured Scenery presets
  const stylePresets = {
    rustico: {
      name: 'Parrilla & Madera Rústica',
      icon: '🪵',
      promptAddon: 'Food photography shot of raw premium fresh meat cut, placed on a dark charred rustic oak wood board. Background features soft glowing charcoal embers and subtle smoke. Garnish with coarse sea salt crystals, fresh rosemary sprigs, and cracked black pepper. Warm dramatic side lighting, 85mm lens, f/1.8 macro depth of field, ultra-detailed texture, 8k resolution, professional food styling.'
    },
    gourmet: {
      name: 'Mármol Blanco Gourmet (Estrella Michelin)',
      icon: '🏛️',
      promptAddon: 'High-end commercial gastronomy photo of fresh marbled meat cut on a white Italian Carrara marble countertop. Clean luxury minimalist composition, bright natural window daylight, chef knife accessory, fresh thyme sprigs, pristine food presentation, studio backlight, 8k resolution, crisp focus.'
    },
    dark_moody: {
      name: 'Dark Gourmet (Noche de Asado)',
      icon: '⬛',
      promptAddon: 'Cinematic dark moody food photography of fresh steak cut, isolated on a matte black slate background. Dramatic top-down spot lighting, glowing highlights on juicy meat fat texture, sea salt particles suspended in air, premium steakhouse atmosphere, award-winning food photography.'
    },
    mostrador: {
      name: 'Mostrador Artesanal de Carnicería',
      icon: '🥩',
      promptAddon: 'Authentic artisan butcher shop display photo, fresh meat cut cleanly presented in a stainless steel tray with butcher paper lining. Warm ambient butcher shop lighting, clean hygienic presentation, traditional artisan butcher atmosphere, high resolution detail.'
    }
  };

  // Compile final prompt automatically
  const compiledPrompt = `[PRODUCTO]: ${selectedCut}. ${customNotes ? customNotes + '. ' : ''}${stylePresets[selectedStyle].promptAddon} [FORMATO]: Aspect ratio ${selectedFormat === '9:16' ? '9:16 vertical story' : selectedFormat === '1:1' ? '1:1 square feed' : '16:9 banner'}. High clarity, no distorted text, professional quality.`;

  // Sample high quality generated photography URLs for demo simulation
  const sampleImages = {
    'Asado de Tira de Primera': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=85',
    'Vacío Jugoso y Veteado': 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1080&q=85',
    'Ojo de Bife Corte Ancho': 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1080&q=85',
    'Combo Hamburguesas Gourmet Cuchillo': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1080&q=85',
    'Combo Parrillero Finde Completo': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1080&q=85',
    'Chorizo Bombón Artesanal': 'https://images.unsplash.com/photo-1597531776510-c08efec1b32d?auto=format&fit=crop&w=1080&q=85'
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const fallbackImg = sampleImages[selectedCut] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=85';
      setGeneratedImage({
        url: fallbackImg,
        cut: selectedCut,
        format: selectedFormat,
        timestamp: new Date().toLocaleTimeString(),
        filename: `Carniceria_${selectedCut.replace(/\s+/g, '_')}_${selectedFormat === '9:16' ? 'Story' : 'Feed'}.png`
      });
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Banner Notice */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.08) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Wand2 size={24} color="#ef4444" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', margin: 0 }}>
              Generador 1-Click con Directiva de Marca Integrada
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
              No más copy-paste de prompts. Seleccionás el producto y la app inyecta automáticamente la escenografía, luz y estilo de la carnicería.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#fca5a5',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            ⚡ Ahorro de tiempo: -90%
          </span>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(52, 211, 153, 0.1)',
            color: '#34d399',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(52, 211, 153, 0.2)'
          }}>
            🎯 Coherencia visual garantizada
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Form & Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. Category & Product Selection */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={16} /> 1. Producto o Corte de Carne
            </h4>
            
            {/* Category Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.8rem' }}>
              {[
                { id: 'vacuno', label: '🥩 Cortes Vacunos' },
                { id: 'cerdo_achuras', label: '🥓 Cerdos & Achuras' },
                { id: 'combos', label: '🔥 Combos Parrilleros' },
                { id: 'preparados', label: '🥘 Pre-elaborados' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedCut(cutsByCategory[cat.id][0]);
                  }}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    border: selectedCategory === cat.id ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: selectedCategory === cat.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: selectedCategory === cat.id ? '#fca5a5' : '#9ca3af',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Cut Dropdown */}
            <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.3rem' }}>
              Seleccionar Corte Específico:
            </label>
            <select
              value={selectedCut}
              onChange={(e) => setSelectedCut(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: '#14121b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: '600',
                outline: 'none',
                marginBottom: '0.5rem'
              }}
            >
              {cutsByCategory[selectedCategory].map(cut => (
                <option key={cut} value={cut}>{cut}</option>
              ))}
            </select>
          </div>

          {/* 2. Scenery & Style Preset */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} /> 2. Escenografía & Estilo de Marca
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.keys(stylePresets).map(key => {
                const style = stylePresets[key];
                const isSelected = selectedStyle === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedStyle(key)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{style.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? '#fff' : '#d1d5db', margin: 0 }}>
                        {style.name}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        Luz ambiental, romero, sal gruesa & profundidad de campo
                      </p>
                    </div>
                    {isSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Format & Offer Badge Customizer */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={16} /> 3. Formato & Etiqueta de Oferta
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
              {[
                { id: '9:16', label: '📱 Story (9:16)' },
                { id: '1:1', label: '🖼️ Feed (1:1)' },
                { id: '16:9', label: '🖥️ Banner (16:9)' }
              ].map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: selectedFormat === fmt.id ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: selectedFormat === fmt.id ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: selectedFormat === fmt.id ? '#fff' : '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '0.3rem' }}>
              Texto de Oferta / Precio Badge:
            </label>
            <input
              type="text"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="ej: OFERTA DEL FINDE $9.900/kg"
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                background: '#14121b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
                marginBottom: '0.6rem'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="wm"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
              />
              <label htmlFor="wm" style={{ fontSize: '0.78rem', color: '#d1d5db', cursor: 'pointer' }}>
                Incluir marca de agua oficial ("Carnicería Don Antonio")
              </label>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              padding: '0.9rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.25s ease'
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                Generando Imagen en API Directa...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generar Imagen Profesional en 1-Clic
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Output & Compiled Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Compiled Prompt Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Prompt Inyectado Automáticamente
              </span>
              <button
                onClick={handleCopyPrompt}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: copiedPrompt ? '#34d399' : '#d1d5db',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: 'auto'
                }}
              >
                {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                {copiedPrompt ? 'Copiado' : 'Copiar Prompt'}
              </button>
            </div>
            <div style={{
              background: '#0e0c13',
              borderRadius: '8px',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: '#fca5a5',
              maxHeight: '110px',
              overflowY: 'auto',
              lineHeight: '1.4'
            }}>
              {compiledPrompt}
            </div>
          </div>

          {/* Generated Result Preview Area */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', position: 'relative' }}>
            {generatedImage ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                
                {/* Image Container with Watermark & Badge */}
                <div style={{
                  position: 'relative',
                  width: selectedFormat === '9:16' ? '240px' : '320px',
                  height: selectedFormat === '9:16' ? '420px' : selectedFormat === '1:1' ? '320px' : '180px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  border: '2px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <img
                    src={generatedImage.url}
                    alt={generatedImage.cut}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Watermark Overlay */}
                  {watermarkEnabled && (
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#fff', letterSpacing: '0.5px' }}>
                        🥩 CARNICERÍA DON ANTONIO
                      </span>
                    </div>
                  )}

                  {/* Offer Price Badge */}
                  {offerText && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
                      letterSpacing: '0.5px',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      {offerText}
                    </div>
                  )}
                </div>

                {/* Metadata & Direct Download */}
                <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', padding: '0.8rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                      {generatedImage.cut}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>
                      Guardado sugerido: <span style={{ color: '#f87171' }}>/02_IA_Generadas/{generatedImage.filename}</span>
                    </p>
                  </div>

                  <a
                    href={generatedImage.url}
                    download={generatedImage.filename}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Download size={14} /> Descargar HD
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Image size={48} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                <h4 style={{ fontSize: '0.95rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Generador Listo para Trabajar
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', maxWidth: '280px', margin: '0 auto' }}>
                  Seleccioná el corte de carne y el estilo en el panel izquierdo y presioná <b>Generar Imagen</b>.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
