import React, { useState } from 'react';
import { Film, Type, Sparkles, Copy, Check, Play, FileText, Zap, Scissors } from 'lucide-react';

export function ReelsStudioView() {
  const [selectedScriptType, setSelectedScriptType] = useState('truco_corte');
  const [copiedScript, setCopiedScript] = useState(false);

  const reelScripts = {
    truco_corte: {
      title: '🔥 Truco para que la Entraña quede tierna como manteca',
      hook: '¡Basta de comer la entraña dura! Te enseño el secreto que ningún carnicero te cuenta...',
      body: '1. Nunca le saques el cuerito fino de ambos lados antes de ir a la parrilla, déjaselo para que conserve todo el jugo.\n2. Fuego fuerte, 7 minutos por lado con sal parrillera gruesa.\n3. Sacala, dejala reposar 2 minutos y cortala a favor de la fibra.',
      cta: '¿Cuál es tu corte favorito para el fin de semana? Dejalo en los comentarios 👇🏻',
      hashtags: '#AsadoArgentino #CarniceriaDonAntonio #Entraña #RecetasParrilleras #TrucosDeCocina'
    },
    hamburguesa_cuchillo: {
      title: '🍔 Por qué las hamburguesas picadas a cuchillo cambian la vida',
      hook: 'Si seguís comprando hamburguesas de supermercado congeladas, estás comiendo cartón.',
      body: 'Acá picamos 70% roast beef y 30% tapa de asado a cuchillo en el momento. Miren lo que es esta textura y la jugosidad cuando toca la plancha bien caliente.',
      cta: 'Vení a buscar tu combo de 4 hamburguesas gourmet con descuento acumulable pagando en efectivo 🥩',
      hashtags: '#HamburguesasArtesanales #CarnesFrescas #AsadoDelFinde #CarniceriaLocal'
    },
    oferta_semanal: {
      title: '💥 Combo Parrillero del Finde a Precio Imbatible',
      hook: 'Llegó el viernes y en la carnicería tiramos la casa por la ventana...',
      body: 'Te armamos el combo definitivo: 1.5kg de asado de tira, 1kg de vacío y 4 chorizos bombón. Todo por un precio increíble para que coman 5 personas holgadas.',
      cta: 'Mandanos un mensaje privado o hacé tu pedido por WhatsApp antes de que se agote.',
      hashtags: '#OfertasCarniceria #ComboParrillero #AsadoFamiliar #Descuentos'
    }
  };

  const currentScript = reelScripts[selectedScriptType];

  const fullTextToCopy = `🎬 [GUION REEL / TIKTOK]\n\nHOOOK (Primeros 3 segundos):\n${currentScript.hook}\n\nCUERPO DE VIDEO:\n${currentScript.body}\n\nLLAMADO A LA ACCIÓN:\n${currentScript.cta}\n\nHASHTAGS:\n${currentScript.hashtags}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTextToCopy);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Intro Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '0.3rem' }}>
          Estudio de Reels, TikToks & Subtítulos IA
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
          Generador de guiones virales para la carnicería + flujo ágil de subtitulado dinámico.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Viral Script Generator */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} /> Generador de Guiones para Reels
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { id: 'truco_corte', label: '🔥 Truco / Tip de Parrilla' },
              { id: 'hamburguesa_cuchillo', label: '🍔 Producto Estrella / Proceso' },
              { id: 'oferta_semanal', label: '💥 Promo del Fin de Semana' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedScriptType(type.id)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: selectedScriptType === type.id ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedScriptType === type.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedScriptType === type.id ? '#fff' : '#9ca3af',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Script Content Breakdown */}
          <div style={{ background: '#0e0c13', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🪝 HOOK / GANCHO (0-3 seg)
              </span>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', margin: '3px 0 0 0' }}>
                "{currentScript.hook}"
              </p>
            </div>

            <div style={{ marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                📹 DESARROLLO DEL VIDEO
              </span>
              <p style={{ fontSize: '0.78rem', color: '#d1d5db', margin: '3px 0 0 0', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                {currentScript.body}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💬 LLAMADO A LA ACCIÓN (CTA)
              </span>
              <p style={{ fontSize: '0.78rem', color: '#a7f3d0', margin: '3px 0 0 0' }}>
                {currentScript.cta}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: copiedScript ? '#34d399' : '#fff',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {copiedScript ? <Check size={16} /> : <Copy size={16} />}
            {copiedScript ? '¡Guión Copiado al Portapapeles!' : 'Copiar Guión Completo + Hashtags'}
          </button>
        </div>

        {/* Right Column: Workflow Guide for Editing & Subtitles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Subtitle Software Workflow */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scissors size={18} /> Herramienta Recomendada para Subtítulos Automáticos
            </h3>
            
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: '1.4', marginBottom: '0.8rem' }}>
              Para no perder horas editando subtítulos a mano en TikTok o Canva:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={15} /> CapCut Desktop (Gratuito & Ultra Rápido)
                </h4>
                <p style={{ fontSize: '0.76rem', color: '#d1d5db', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  Arrastrás el video de la carnicería a CapCut PC ➔ Hacés clic en <b>"Text" ➔ "Auto Captions"</b>. La IA transcribe la voz del carnicero en 5 segundos y te crea los subtítulos amarillos animaditos solos.
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                  🎨 Configuración de Fuente Recomendada para Marca:
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0 0' }}>
                  • Tipografía: <b>Montserrat Black / Anton</b> (En mayúsculas)<br />
                  • Color: Texto blanco con trazo negro y resaltado amarillo (<span style={{ color: '#facc15' }}>#FACC15</span>) en las palabras clave (*"asado"*, *"oferta"*, *"entraña"*).
                </p>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
              📋 Checklist Rápida para Subir un Reel de Carnicería Impactante:
            </h4>
            <ul style={{ fontSize: '0.76rem', color: '#9ca3af', lineHeight: '1.6', margin: 0, paddingLeft: '1.2rem' }}>
              <li>Primeros 3 segundos: Mostrar el cuchillo cortando o el jugo saliendo de la carne (Gancho visual).</li>
              <li>Audio limpio: Usar micrófono o quitar ruido de fondo en CapCut.</li>
              <li>Subtítulos grandes en el centro (el 80% de la gente ve videos en Instagram sin volumen).</li>
              <li>Guardar el video final exportado en: <code style={{ color: '#f87171' }}>/05_Listo_Para_Publicar/</code>.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
