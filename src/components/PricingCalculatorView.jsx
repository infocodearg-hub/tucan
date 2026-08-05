import React, { useState } from 'react';
import { Calculator, TrendingUp, CheckCircle, ShieldCheck, Zap, Award, Sparkles } from 'lucide-react';

export function PricingCalculatorView() {
  const [currentFee, setCurrentFee] = useState(200000);
  const [targetFee, setTargetFee] = useState(480000);

  const deliverables = [
    { name: 'Generación de Fotos IA Hiper-realistas con Estilo Consistente', included: true, oldStatus: 'Básico', newStatus: '⭐ Pro HD Directo' },
    { name: 'Edición de Reels & TikToks con Subtítulos Dinámicos', included: true, oldStatus: 'Suelto', newStatus: '🔥 Guiñado + AutoSub' },
    { name: 'Diseño de Historias Diarias (Promos, Ofertas del Finde)', included: true, oldStatus: 'Estándar', newStatus: '🚀 Plantillas Branded' },
    { name: 'Organización Centralizada de Archivos & Banco de Fotos', included: true, oldStatus: 'Desordenado', newStatus: '📁 Disco + Cloud Sync' },
    { name: 'Copywriting & Hashtags Optimizado para Carnicería', included: true, oldStatus: 'Manual', newStatus: '🤖 IA Inyectada' }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Intro Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '0.3rem' }}>
          Calculadora de Presupuesto & Aumento de Fee CM
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
          Justificación estratégica para profesionalizar tu servicio y aumentar tu honorario mensual.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Fee Upgrade Comparison */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} /> Proyección de Honorarios Mensuales
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Current Fee */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                Cobro Actual
              </span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#9ca3af', margin: '0.3rem 0' }}>
                ${currentFee.toLocaleString('es-AR')}
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Servicio básico / informal</span>
            </div>

            {/* Proposed Fee */}
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', textAlign: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
              <span style={{ fontSize: '0.72rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                Nuevo Valor Sugerido
              </span>
              <h4 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', margin: '0.3rem 0' }}>
                ${targetFee.toLocaleString('es-AR')}
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: '600' }}>+140% Incremento Justificado</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }} />

          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', margin: 0 }}>
            ✨ Entregables Incluidos en el Nuevo Plan Pro:
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {deliverables.map((item, idx) => (
              <div key={idx} style={{ background: '#121017', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={15} color="#34d399" />
                  <span style={{ fontSize: '0.78rem', color: '#e5e7eb', fontWeight: '600' }}>
                    {item.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                  {item.newStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pitch Tips for the Client */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} /> Argumentos para Presentar el Nuevo Presupuesto
            </h3>

            <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.5', marginBottom: '0.8rem' }}>
              Cuando les presentes la propuesta de actualización de honorarios a tus amigos de la carnicería, podés destacar los siguientes puntos de valor:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' }}>
                  1. "Imágenes de Estudio Profesional Gastronómico"
                </p>
                <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0 }}>
                  Cada corte de carne ahora tiene fotografía publicitaria con iluminación de estudio y escenografía rústica de marca. No parece contenido genérico.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' }}>
                  2. "Edición de Videos Completa con Subtítulos"
                </p>
                <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0 }}>
                  No solo subís fotos, sino que ahora editás los videos crudos que te mandan, armás guiones virales y agregás subtítulos dinámicos que aumentan las reproducciones.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' }}>
                  3. "Ventas Directas por Historias de Ofertas"
                </p>
                <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0 }}>
                  El formato de oferta visualizada con precio en badge vende directamente los combos parrilleros los fines de semana, recuperando la inversión del servicio en pocos días.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
