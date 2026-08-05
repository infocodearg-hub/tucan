import React from 'react';
import { Palette, Sun, Award, AlertCircle, CheckCircle, Flame, Utensils } from 'lucide-react';

export function BrandGuideView() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Intro Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '0.3rem' }}>
          Manual de Marca & Estilo Visual ("Brand Book")
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
          Directrices fijas para mantener exactamente la misma coherencia estética en todas las fotos, promos e historias.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Color Palette & Typography */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={18} /> Paleta de Colores de Marca
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {[
              { name: 'Rojo Fuego', hex: '#EF4444', usage: 'Precios, Promos & Call-to-action' },
              { name: 'Negro Carbón', hex: '#111827', usage: 'Fondos oscuros rústicos' },
              { name: 'Amarillo Dorado', hex: '#F59E0B', usage: 'Descuentos & Destacados' },
              { name: 'Blanco Mármol', hex: '#F9FAFB', usage: 'Textos & Marcos limpios' },
              { name: 'Verde Romero', hex: '#10B981', usage: 'Badges de Calidad / Orgánico' },
              { name: 'Madera Roble', hex: '#78350F', usage: 'Tablas & Escenografía' }
            ].map((color, idx) => (
              <div key={idx} style={{ background: '#121017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.65rem' }}>
                <div style={{ background: color.hex, height: '36px', borderRadius: '6px', marginBottom: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', margin: 0 }}>{color.name}</p>
                <code style={{ fontSize: '0.7rem', color: '#ef4444' }}>{color.hex}</code>
                <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: '2px 0 0 0' }}>{color.usage}</p>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />

          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', margin: 0 }}>
            🔤 Tipografías Oficiales (Usar en Canva y CapCut):
          </h4>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '700', margin: '0 0 4px 0' }}>
              • Titulares y Precios: <span style={{ fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '1px', color: '#ef4444' }}>ANTON / MONTSERRAT BLACK</span>
            </p>
            <p style={{ fontSize: '0.76rem', color: '#9ca3af', margin: 0 }}>
              • Subtítulos y Cuerpo: <span style={{ fontFamily: 'sans-serif' }}>Plus Jakarta Sans / Inter SemiBold</span>
            </p>
          </div>
        </div>

        {/* Photography & Scenery Directives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Rules for Photos */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} /> Reglas Estéticas de Escenografía (IA & Reales)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#34d399', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={15} /> LO QUE SIEMPRE DEBE ESTAR (DO'S)
                </h4>
                <ul style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.5' }}>
                  <li>Carne de color rojo intenso fresco con vetas de grasa blanca limpia.</li>
                  <li>Fondo de tabla de madera rústica quemada o mármol limpio.</li>
                  <li>Elementos de garnish: Hojas de romero fresco, granos de pimienta negra o sal marina gruesa.</li>
                  <li>Luz cálida ambiental con sombra suave (apariencia de estudio fotográfico gastronómico).</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f87171', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={15} /> LO QUE SE DEBE EVITAR (DON'TS)
                </h4>
                <ul style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.5' }}>
                  <li>Evitar iluminación blanca fluorescente de tubo fría (hace parecer la carne opaca o gris).</li>
                  <li>Evitar fondos desordenados o bolsas de plástico visibles.</li>
                  <li>No usar más de 2 fuentes de texto distintas en una misma gráfica.</li>
                  <li>No distorsionar la imagen estirando las proporciones.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
