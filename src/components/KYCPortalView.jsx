import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Camera, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  Upload, 
  UserCheck, 
  Award,
  BookOpen
} from 'lucide-react';

export function KYCPortalView() {
  const [kycStep, setKycStep] = useState(1);
  const [docType, setDocType] = useState('dni');
  const [docFile, setDocFile] = useState(null);
  const [selfieDone, setSelfieDone] = useState(false);
  const [signed2257, setSigned2257] = useState(false);
  const [signedOlimpia, setSignedOlimpia] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const handleSimulateKycSubmit = () => {
    if (!signed2257 || !signedOlimpia) {
      alert('Debes firmar y aceptar los términos legales 2257 y Ley Olimpia para continuar.');
      return;
    }
    setIsApproved(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge-kyc" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          <ShieldCheck size={16} /> Portal de Verificación & Cumplimiento Normativo 100% Legal
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
          Centro de Identidad y Contratos (KYC)
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
          Garantizamos la máxima seguridad legal para modelos y clientes mediante la verificación biométrica de edad, cumplimiento del registro US 18 U.S.C 2257 y protección bajo Ley Olimpia y Ley 25.326 de Argentina.
        </p>
      </div>

      {/* Grid: Workflow KYC & Legal Docs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Model Onboarding KYC Wizard */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f472b6' }}>
            <UserCheck size={20} /> Verificación de Modelo / Creador
          </h2>

          {isApproved ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Award size={48} color="#34d399" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', marginBottom: '0.4rem' }}>
                ¡Identidad & Contrato 2257 Aprobados!
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Tu cuenta ha sido validada legalmente. Ya puedes publicar contenido, fijar tarifas de suscripción y realizar videoconferencias 1a1.
              </p>
              <div className="badge-2257" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                <ShieldCheck size={14} /> ID Registro: #2257-ARG-9842
              </div>
            </div>
          ) : (
            <div>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                {[1, 2, 3].map(step => (
                  <div 
                    key={step}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: kycStep >= step ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>

              {/* Step 1: Upload Document */}
              {kycStep === 1 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Paso 1: Documento Oficial de Identidad (DNI / Pasaporte)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Suba una foto clara del frente y dorso de su documento nacional de identidad para acreditar ser mayor de 18 años.
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      Tipo de documento:
                    </label>
                    <select 
                      value={docType}
                      onChange={e => setDocType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        outline: 'none'
                      }}
                    >
                      <option value="dni" style={{ background: '#120e1a' }}>DNI (Argentina)</option>
                      <option value="pasaporte" style={{ background: '#120e1a' }}>Pasaporte Internacional</option>
                      <option value="licencia" style={{ background: '#120e1a' }}>Licencia de Conducir</option>
                    </select>
                  </div>

                  <div style={{
                    border: '2px dashed var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    background: docFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                  }}>
                    <Upload size={32} color={docFile ? '#34d399' : 'var(--text-muted)'} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {docFile ? `Documento Cargado: ${docFile}` : 'Haga clic para subir frente y dorso del DNI'}
                    </div>
                    <button 
                      onClick={() => setDocFile('dni_frente_dorso.jpg')}
                      className="btn-secondary" 
                      style={{ marginTop: '0.75rem', padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                    >
                      Simular Carga de Documento
                    </button>
                  </div>

                  <button 
                    disabled={!docFile}
                    onClick={() => setKycStep(2)}
                    className="btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', opacity: docFile ? 1 : 0.5 }}
                  >
                    Continuar al Paso 2
                  </button>
                </div>
              )}

              {/* Step 2: Biometric Liveness */}
              {kycStep === 2 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Paso 2: Prueba de Vida Biométrica (Liveness Detection)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Realice una breve selfie en movimiento para confirmar su identidad en tiempo real y prevenir el uso de identidades robadas o IA.
                  </p>

                  <div style={{
                    height: '180px',
                    background: '#120d1c',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glow)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    <Camera size={36} color="#ec4899" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {selfieDone ? '✅ Análisis Biométrico Exitoso (100% Match)' : 'Cámara lista para escaneo facial'}
                    </div>
                    {!selfieDone && (
                      <button 
                        onClick={() => setSelfieDone(true)}
                        className="btn-accent" 
                        style={{ marginTop: '0.75rem', padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                      >
                        Capturar Selfie Biométrica
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setKycStep(1)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                      Atrás
                    </button>
                    <button 
                      disabled={!selfieDone}
                      onClick={() => setKycStep(3)}
                      className="btn-primary" 
                      style={{ flex: 2, justifyContent: 'center', opacity: selfieDone ? 1 : 0.5 }}
                    >
                      Ir a Firma de Contratos
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Legal Contracts & 2257 Sign */}
              {kycStep === 3 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Paso 3: Firma de Acuerdos Legales y Registro 2257
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Firme digitalmente la declaración jurada y autorización de cesión de licencia de contenido.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={signed2257}
                        onChange={e => setSigned2257(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>
                        <strong>Declaración US 18 U.S.C 2257:</strong> Certifico bajo pena de perjurio ser mayor de 18 años y autorizo la inclusión de mis datos en el registro de productores e intérpretes.
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={signedOlimpia}
                        onChange={e => setSignedOlimpia(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>
                        <strong>Cumplimiento Ley Olimpia (Ley 27.736) & Datos Sensibles (Ley 25.326):</strong> Garantizo que todo el contenido publicado cuenta con el libre consentimiento de los involucrados.
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setKycStep(2)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                      Atrás
                    </button>
                    <button 
                      onClick={handleSimulateKycSubmit}
                      className="btn-accent" 
                      style={{ flex: 2, justifyContent: 'center' }}
                    >
                      Finalizar Verificación KYC
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Legal Information & Transparency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa' }}>
              <BookOpen size={18} /> Transparencia & Términos de Servicio
            </h3>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem', color: 'var(--text-muted)', paddingLeft: '1rem' }}>
              <li>
                <strong>Licencia no exclusiva:</strong> El creador mantiene el 100% de los derechos de autor de sus obras y otorga a la plataforma una licencia de distribución revocable.
              </li>
              <li>
                <strong>Tolerancia Cero CSAM & NCII:</strong> Implementamos filtrado automatizado vía PhotoDNA / Hive AI. Cualquier intento de violar la integridad de menores se reportará a NCMEC y autoridades policiales de inmediato.
              </li>
              <li>
                <strong>Marcas de agua dinámicas:</strong> Todas las visualizaciones privadas incluyen una marca de agua forense para identificar la fuente ante cualquier filtración.
              </li>
              <li>
                <strong>Protocolo DMCA de Baja Rápida:</strong> Formulario automatizado para notificar la remoción de contenidos filtrados en sitios web externos.
              </li>
            </ul>
          </div>

          {/* Argentina Tax & Compliance Banner */}
          <div className="glass-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.4rem' }}>
              🇦🇷 Marco Impositivo en Argentina (ARCA / AFIP)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Los ingresos obtenidos por creadores locales pueden liquidarse bajo la figura de <strong>Monotributo (Exportación de Servicios)</strong> o Responsable Inscripto. Ofrecemos resúmenes de facturación mensual descargables en formato PDF/CSV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
