import React, { useState } from 'react';
import { Search, MessageSquare, AlertTriangle, Award, ShieldCheck, Crown, UserPlus, Pencil, Trash2 } from 'lucide-react';
import NuevoClienteModal from './NuevoClienteModal';
import { useConfirm } from './ConfirmDialog';
import { useClientActions, useToast } from '../store';

const SCORE_COLOR = (score) => {
  const n = parseFloat(score);
  if (n >= 9) return { color: 'var(--green)', bg: 'rgba(0,230,118,0.1)', border: 'rgba(0,230,118,0.3)' };
  if (n >= 7) return { color: 'var(--blue)', bg: 'rgba(0,176,255,0.1)', border: 'rgba(0,176,255,0.3)' };
  return { color: 'var(--red)', bg: 'rgba(255,79,79,0.1)', border: 'rgba(255,79,79,0.3)' };
};

// Las etiquetas se DERIVAN del comportamiento real (ver lib/status.js
// badgeForClient), no de un string congelado en los datos. `key` decide
// ícono y color acá; antes se adivinaba por substring del texto, y una
// etiqueta nueva como "Habitual" no calzaba con ningún substring — todo
// lo que no fuera VIP cayó, por descarte, en el badge de moroso.
const BADGE_META = {
  vip: { icon: Crown, color: 'var(--amber)', bg: 'rgba(255,179,0,0.12)' },
  habitual: { icon: ShieldCheck, color: 'var(--blue)', bg: 'rgba(0,176,255,0.12)' },
  ocasional: { icon: Award, color: 'var(--green)', bg: 'rgba(0,230,118,0.12)' },
  riesgo: { icon: AlertTriangle, color: 'var(--red)', bg: 'rgba(255,79,79,0.12)' },
  nuevo: { icon: UserPlus, color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

const getBadgeComponent = (badge) => ({
  text: badge?.label ?? 'Nuevo',
  ...(BADGE_META[badge?.key] ?? BADGE_META.nuevo),
});

export default function ClientesCRM({ clients }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [clientModal, setClientModal] = useState(null); // null cerrado | 'new' | Client a editar

  const clientActions = useClientActions();
  const toast = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const handleSaveClient = (data) => {
    const isEdit = clientModal && clientModal !== 'new';
    const result = isEdit
      ? clientActions.actualizar(clientModal.id, data)
      : clientActions.crear(data);

    if (!result.ok) return result;
    toast.success(isEdit ? `"${data.nombre}" actualizado` : `Cliente "${data.nombre}" registrado en el CRM`);
    setClientModal(null);
    return result;
  };

  const handleDeleteClient = async (client) => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: `"${client.nombre}" se borra del CRM. Sus turnos pasados quedan intactos. Podés deshacerlo desde el aviso.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    clientActions.eliminar(client.id);
    setClientModal(null);
    toast.info(`"${client.nombre}" eliminado`, {
      action: { label: 'Deshacer', onClick: () => clientActions.restaurar(client) },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Clientes & Jugadores</h1>
          <p className="section-subtitle">Base de datos CRM · Historial, scoring y comunicación directa</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 36, width: '100%', padding: '8px 12px 8px 36px' }}
            />
          </div>
          <button
            onClick={() => setClientModal('new')}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: 6 }}
          >
            <UserPlus size={15} style={{ color: 'var(--on-accent)' }} /> + Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total Clientes', value: clients.length, color: 'var(--green)', sub: 'en base de datos' },
          {
            label: 'VIP / Regulares',
            // `c.score` es texto ("9.8/10"): compararlo como string hacía
            // que '10/10' >= '9' diera false y el KPI contara de menos.
            value: clients.filter(c => parseFloat(c.score) >= 9).length,
            color: 'var(--blue)',
            sub: 'score ≥ 9.0',
          },
          { label: 'Atención Especial', value: clients.filter(c => c.cancellations > 1).length, color: 'var(--amber)', sub: 'cancelaciones' },
          { label: 'Total Recaudado', value: `$${(clients.reduce((s,c) => s + c.totalSpent, 0)/1000).toFixed(0)}k`, color: 'var(--volt)', sub: 'entre todos' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-dim)'
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p className="font-heading" style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Client Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map(client => {
          const scoreStyle = SCORE_COLOR(client.score);
          const badgeMeta = getBadgeComponent(client.badge);
          const BadgeIcon = badgeMeta.icon;

          return (
            <div
              key={client.id}
              onClick={() => setSelected(selected?.id === client.id ? null : client)}
              style={{
                padding: '18px', borderRadius: 14,
                background: 'var(--bg-card)', border: `1px solid ${selected?.id === client.id ? 'rgba(0,176,255,0.4)' : 'var(--border-dim)'}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: selected?.id === client.id ? '0 0 20px rgba(0,176,255,0.12)' : 'none'
              }}
            >
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(140deg, rgba(0,176,255,0.15), rgba(0,176,255,0.05))',
                    border: '1px solid rgba(0,176,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, color: 'var(--blue)', fontSize: '0.88rem', fontFamily: 'Outfit, sans-serif'
                  }}>
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{client.name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{client.phone}</p>
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 99,
                  background: scoreStyle.bg, border: `1px solid ${scoreStyle.border}`,
                  color: scoreStyle.color, fontSize: '0.8rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif'
                }}>
                  {client.score}
                </div>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                gap: 8, padding: '10px', borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                marginBottom: 12
              }}>
                {[
                  { label: 'Partidos', value: client.matchesPlayed, color: 'var(--text-primary)' },
                  { label: 'Cancelaciones', value: client.cancellations, color: client.cancellations > 1 ? 'var(--red)' : 'var(--green)' },
                  { label: 'Total', value: `$${(client.totalSpent/1000).toFixed(0)}k`, color: 'var(--green)' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                    <p className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Badge & Last match */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px', borderRadius: 99,
                  background: badgeMeta.bg, border: `1px solid ${badgeMeta.color}44`,
                  color: badgeMeta.color, fontSize: '0.72rem', fontWeight: 800
                }}>
                  <BadgeIcon size={12} color={badgeMeta.color} />
                  <span>{badgeMeta.text}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setClientModal(client._source); }}
                    aria-label={`Editar ${client.name}`}
                    className="btn-icon"
                    style={{ width: 26, height: 26 }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(client._source); }}
                    aria-label={`Eliminar ${client.name}`}
                    className="btn-icon"
                    style={{ width: 26, height: 26, color: 'var(--red)' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <a
                  href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                    background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)',
                    color: 'var(--green)', fontSize: '0.74rem', fontWeight: 700,
                    textDecoration: 'none', transition: 'all 0.15s ease'
                  }}
                >
                  <MessageSquare size={12} /> WA
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No se encontraron clientes con ese criterio.
        </div>
      )}

      {clientModal && (
        <NuevoClienteModal
          key={clientModal === 'new' ? 'new' : clientModal.id}
          isOpen
          onClose={() => setClientModal(null)}
          cliente={clientModal === 'new' ? null : clientModal}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
        />
      )}
      {ConfirmDialogMount}
    </div>
  );
}
