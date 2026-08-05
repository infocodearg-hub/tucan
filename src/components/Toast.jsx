import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: { icon: CheckCircle2, color: '#00E676', bg: 'rgba(0,230,118,0.12)', border: 'rgba(0,230,118,0.35)' },
    error:   { icon: AlertCircle,  color: '#FF4F4F', bg: 'rgba(255,79,79,0.12)', border: 'rgba(255,79,79,0.35)' },
    info:    { icon: Info,         color: '#00B0FF', bg: 'rgba(0,176,255,0.12)', border: 'rgba(0,176,255,0.35)' },
  }[type] || { icon: CheckCircle2, color: '#00E676', bg: 'rgba(0,230,118,0.12)', border: 'rgba(0,230,118,0.35)' };

  const IconComponent = config.icon;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 18px',
      borderRadius: 14,
      background: 'var(--bg-card)',
      border: `1px solid ${config.border}`,
      boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,230,118,0.15)',
      animation: 'dropdown-in 0.2s var(--ease-out)',
      maxWidth: 380
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: config.bg, border: `1px solid ${config.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: config.color, flexShrink: 0
      }}>
        <IconComponent size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
          {message}
        </p>
      </div>
      <button 
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center'
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
