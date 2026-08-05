import React, { useState } from 'react';
import { Folder, HardDrive, Smartphone, Cloud, ArrowRight, CheckCircle2, FileImage, FileVideo, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export function FolderOrganizerView() {
  const [selectedFolder, setSelectedFolder] = useState('02_IA_Generadas');

  const folderStructure = [
    {
      id: '01_Fotos_Reales_Celular',
      name: '01_Fotos_Reales_Celular',
      icon: <Smartphone size={18} color="#60a5fa" />,
      desc: 'Fotos del mostrador y local sacadas desde el celular',
      filesCount: 24,
      tag: 'Origen: Celular (Google Drive/Dropbox)'
    },
    {
      id: '02_IA_Generadas',
      name: '02_IA_Generadas',
      icon: <Sparkles size={18} color="#ef4444" />,
      desc: 'Imágenes gastronómicas creadas desde nuestro Estudio IA',
      filesCount: 48,
      tag: 'Origen: Carnicería Studio'
    },
    {
      id: '03_Plantillas_Canva',
      name: '03_Plantillas_Canva',
      icon: <FileImage size={18} color="#c084fc" />,
      desc: 'Logos, marcos de ofertas, marcas de agua y banners',
      filesCount: 12,
      tag: 'Origen: Canva Pro'
    },
    {
      id: '04_Videos_y_Edicion',
      name: '04_Videos_y_Edicion',
      icon: <FileVideo size={18} color="#f59e0b" />,
      desc: 'Videos crudos y proyectos de reels para editar',
      filesCount: 15,
      tag: 'Origen: Celular / TikTok'
    },
    {
      id: '05_Listo_Para_Publicar',
      name: '05_Listo_Para_Publicar',
      icon: <CheckCircle2 size={18} color="#34d399" />,
      desc: 'Contenido final filtrado y listo para publicar a mano',
      filesCount: 8,
      tag: 'Sincronizado con Celular'
    }
  ];

  const filesByFolder = {
    '01_Fotos_Reales_Celular': [
      { name: 'IMG_20260801_Mostrador_Frescos.jpg', size: '3.4 MB', date: 'Ayer' },
      { name: 'IMG_20260802_Ingreso_Media_Vaca.jpg', size: '4.1 MB', date: 'Hoy' },
      { name: 'IMG_20260802_Lomo_Limpiando.jpg', size: '2.8 MB', date: 'Hoy' }
    ],
    '02_IA_Generadas': [
      { name: 'Carniceria_AsadoDeTira_Story_2026-08-03.png', size: '2.1 MB', date: 'Hace 10 min' },
      { name: 'Carniceria_ComboFinde_Feed_2026-08-03.png', size: '1.9 MB', date: 'Hace 15 min' },
      { name: 'Carniceria_MollejasLimón_Story_2026-08-02.png', size: '2.4 MB', date: 'Ayer' }
    ],
    '03_Plantillas_Canva': [
      { name: 'Logo_Carniceria_DonAntonio_PNG_Transparente.png', size: '512 KB', date: 'Hace 1 semana' },
      { name: 'Banner_OfertaFinde_Rojo_HD.png', size: '1.2 MB', date: 'Hace 3 días' }
    ],
    '04_Videos_y_Edicion': [
      { name: 'VID_Corte_Entraña_Fuego.mp4', size: '24.5 MB', date: 'Ayer' },
      { name: 'VID_Preparacion_Milanesas.mp4', size: '18.2 MB', date: 'Hace 2 días' }
    ],
    '05_Listo_Para_Publicar': [
      { name: 'POST_01_Lunes_AsadoTira_Oferta.png', size: '1.8 MB', date: 'Programado para hoy' },
      { name: 'STORY_02_Martes_ComboHamburguesas.png', size: '2.0 MB', date: 'Programado para mañana' }
    ]
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Intro Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '0.3rem' }}>
          Organizador & Centralizador de Archivos
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
          Estructura profesional de carpetas para eliminar el desorden entre el celular, la PC, Canva y TikTok.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Folders Structure */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ef4444', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardDrive size={18} /> Estructura Central en tu Disco C:
          </h3>
          
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            Ubicación recomendada: <code style={{ background: '#14121b', padding: '2px 6px', borderRadius: '4px', color: '#f87171' }}>C:\Carniceria_Marketing\</code>
          </p>

          {folderStructure.map(folder => {
            const isSelected = selectedFolder === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>{folder.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isSelected ? '#fff' : '#d1d5db' }}>
                      {folder.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '10px' }}>
                      {folder.filesCount} archivos
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#9ca3af', margin: '2px 0 0 0' }}>
                    {folder.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Files Inspector & Cloud Sync Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* File Explorer Preview */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Folder size={16} color="#ef4444" /> Contenido de: <span style={{ color: '#ef4444' }}>{selectedFolder}</span>
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Actualizado en vivo</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filesByFolder[selectedFolder]?.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#121017',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FileImage size={16} color="#ef4444" />
                    <span style={{ fontSize: '0.8rem', color: '#e5e7eb', fontWeight: '600' }}>
                      {file.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{file.size}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{file.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Cloud Sync Setup Guide */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cloud size={18} /> Recomendación: Sincronización Celular ↔ PC
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.4', marginBottom: '0.8rem' }}>
              Como vas a seguir publicando en Instagram manualmente desde tu celular, configurá la sincronización automática de la carpeta <b>05_Listo_Para_Publicar</b> usando <b>Google Drive</b> o <b>Dropbox</b>.
            </p>

            <div style={{ background: 'rgba(96, 165, 250, 0.08)', border: '1px solid rgba(96, 165, 250, 0.2)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <ol style={{ fontSize: '0.76rem', color: '#d1d5db', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                <li>Instalá <b>Google Drive para Escritorio</b> en tu PC.</li>
                <li>Mové la carpeta <b>05_Listo_Para_Publicar</b> adentro de Google Drive.</li>
                <li>¡Listo! Cualquier foto lista que generes o edites en la PC aparecerá sola en la App de Google Drive en tu celular para subirla sin pasar por WhatsApp.</li>
              </ol>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
