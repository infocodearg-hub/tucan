import React from 'react';
import { ShieldCheck, Lock, AlertCircle, FileText, Heart } from 'lucide-react';

export function LegalFooter() {
  return (
    <footer style={{
      background: '#07060a',
      borderTop: '1px solid var(--border-light)',
      padding: '3rem 1.5rem 2rem 1.5rem',
      marginTop: '4rem',
      color: 'var(--text-muted)',
      fontSize: '0.8rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Top Disclaimer Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} color="#ec4899" /> Declaración US 18 U.S.C. § 2257
            </div>
            <p style={{ lineHeight: '1.5' }}>
              Todos los modelos, intérpretes y creadores que aparecen en este sitio tenían 18 años de edad o más al momento de la producción del contenido. La documentación de cumplimiento con 18 U.S.C. 2257 y normativas equivalentes internacionales es custodiada por el Custodio Oficial de Registros de la Plataforma.
            </p>
          </div>

          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={18} color="#34d399" /> Cumplimiento Ley Olimpia & Datos Sensibles
            </div>
            <p style={{ lineHeight: '1.5' }}>
              En cumplimiento con la Ley 27.736 (Ley Olimpia) y la Ley 25.326 de Protección de Datos Personales en Argentina, la plataforma aplica tolerancia cero frente a contenidos no consentidos y ofrece mecanismos de denuncia y baja inmediata en menos de 24 horas.
            </p>
          </div>

          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={18} color="#fbbf24" /> Protección de Derechos de Autor (DMCA)
            </div>
            <p style={{ lineHeight: '1.5' }}>
              Las imágenes y videos contienen marcas de agua dinámicas e invisibles vinculadas a la cuenta del comprador. La reproducción, captura o distribución no autorizada constituye un delito bajo la Ley 11.723 y leyes internacionales de propiedad intelectual.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            © 2026 <strong>Velvet & Aura Platform</strong>. Todos los derechos reservados. Operación 100% Legal & Regulada.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem' }}>
            <a href="#2257" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Registros 2257</a>
            <a href="#dmca" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Formulario DMCA</a>
            <a href="#privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Política de Privacidad (AAIP)</a>
            <a href="#terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Términos y Condiciones</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
