import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Seleccionar...', 
  icon: DefaultIcon,
  style = {},
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find active option object or string
  const selectedOption = options.find(o => (typeof o === 'object' ? o.value : o) === value);
  const selectedLabel = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;
  const SelectedIcon = typeof selectedOption === 'object' ? selectedOption.icon : null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--bg-input)',
          border: `1px solid ${isOpen ? '#00E676' : 'var(--border-mid)'}`,
          boxShadow: isOpen ? '0 0 16px rgba(0,230,118,0.22)' : 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, overflow: 'hidden' }}>
          {SelectedIcon && <SelectedIcon size={15} color="#00E676" style={{ flexShrink: 0 }} />}
          {!SelectedIcon && DefaultIcon && <DefaultIcon size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: value ? '#fff' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel}
          </span>
        </div>
        <ChevronDown 
          size={15} 
          color="var(--text-muted)" 
          style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} 
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-mid)',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 24px rgba(0,230,118,0.1)',
          zIndex: 9999,
          maxHeight: 230,
          overflowY: 'auto',
          padding: 6,
          animation: 'dropdown-in 0.18s var(--ease-out)'
        }}>
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLbl = typeof opt === 'object' ? opt.label : opt;
            const OptIcon = typeof opt === 'object' ? opt.icon : null;
            const isSelected = optVal === value;

            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? '#00E676' : 'var(--text-primary)',
                  background: isSelected ? 'rgba(0,230,118,0.12)' : 'transparent',
                  transition: 'all 0.15s ease',
                  marginBottom: 2
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  {OptIcon && <OptIcon size={15} color={isSelected ? '#00E676' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{optLbl}</span>
                </div>
                {isSelected && <Check size={14} color="#00E676" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
