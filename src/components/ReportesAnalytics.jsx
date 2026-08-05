import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Zap, PieChart, ArrowUpRight, Download, GlassWater, Beer, Wine, Trophy, Calendar } from 'lucide-react';
import CustomSelect from './CustomSelect';

const COURT_DATA = [
  { name: 'Cancha 1',  type: 'Fútbol 5',  revenue: 1240000, pct: 43.6, color: 'var(--green)' },
  { name: 'Cancha 2',  type: 'Fútbol 5',  revenue: 980000,  pct: 34.5, color: 'var(--blue)' },
  { name: 'Cancha 3',  type: 'Pádel',     revenue: 620000,  pct: 21.8, color: 'var(--purple)' },
];

const CANTINA_TOP = [
  { name: 'Gatorade 500ml',           qty: 142, revenue: 355000, icon: GlassWater, pct: 57 },
  { name: 'Stella Artois 1L',         qty: 68,  revenue: 285600, icon: Beer,       pct: 46 },
  { name: 'Fernet Branca + Coca',     qty: 24,  revenue: 228000, icon: Wine,       pct: 37 },
  { name: 'Alquiler Pelotas/Pecheras',qty: 54,  revenue: 98000,  icon: Trophy,     pct: 16 },
];

const WEEK_DATA = [
  { day: 'Lun', pct: 62 },
  { day: 'Mar', pct: 88 },
  { day: 'Mié', pct: 75 },
  { day: 'Jue', pct: 94 },
  { day: 'Vie', pct: 100 },
  { day: 'Sáb', pct: 100 },
  { day: 'Dom', pct: 55 },
];

const PERIOD_OPTIONS = [
  { value: 'Agosto 2026', label: 'Agosto 2026', icon: Calendar },
  { value: 'Julio 2026',  label: 'Julio 2026',  icon: Calendar },
  { value: 'Junio 2026',  label: 'Junio 2026',  icon: Calendar },
];

export default function ReportesAnalytics() {
  const [period, setPeriod] = useState('Agosto 2026');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Reportes & Finanzas</h1>
          <p className="section-subtitle">Métricas de negocio · Ocupación · Recaudación por cancha</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 160 }}>
            <CustomSelect
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
          </div>
          <button className="btn-secondary" style={{ padding: '9px 14px', gap: 6, height: 42 }}>
            <Download size={14} color="var(--green)" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          { label: 'Recaudación Total', value: '$2.840.000', sub: '+18.4% vs mes anterior', subColor: 'var(--green)', icon: <DollarSign size={18} />, accent: 'green' },
          { label: 'Ocupación Pico', value: '94.2%', sub: 'Prácticamente agotado', subColor: 'var(--amber)', icon: <Zap size={18} />, accent: 'volt' },
          { label: 'Ventas Cantina', value: '$620.000', sub: '21.8% de ingresos totales', subColor: 'var(--blue)', icon: <PieChart size={18} />, accent: 'blue' },
          { label: 'Crecimiento YoY', value: '+31%', sub: 'vs Agosto 2025', subColor: 'var(--purple)', icon: <TrendingUp size={18} />, accent: 'purple' },
        ].map((k, i) => {
          const accents = {
            green:  { iconBg: 'rgba(0,230,118,0.12)', iconBorder: 'rgba(0,230,118,0.3)', iconColor: 'var(--green)' },
            blue:   { iconBg: 'rgba(0,176,255,0.12)', iconBorder: 'rgba(0,176,255,0.3)', iconColor: 'var(--blue)' },
            volt:   { iconBg: 'rgba(200,255,0,0.12)',  iconBorder: 'rgba(200,255,0,0.3)',  iconColor: 'var(--volt)' },
            purple: { iconBg: 'rgba(185,136,252,0.12)', iconBorder: 'rgba(185,136,252,0.3)', iconColor: 'var(--purple)' },
          };
          const a = accents[k.accent];
          return (
            <div key={i} className="kpi-card">
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {k.label}
                </p>
                <p className="font-heading" style={{ fontSize: 'clamp(1.1rem, 3.8vw, 1.45rem)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {k.value}
                </p>
                <p style={{ fontSize: '0.7rem', color: k.subColor, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {k.sub}
                </p>
              </div>
              <div className="kpi-icon" style={{ background: a.iconBg, border: `1px solid ${a.iconBorder}`, color: a.iconColor }}>
                {k.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        {/* Occupancy Bar Chart */}
        <div style={{ padding: '18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Ocupación Semanal</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Promedio por día de la semana</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
            {WEEK_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: d.pct >= 90 ? 'var(--green)' : 'var(--text-muted)' }}>
                  {d.pct}%
                </span>
                <div style={{
                  width: '100%', borderRadius: '6px 6px 0 0', position: 'relative', overflow: 'hidden',
                  height: `${Math.max(d.pct, 8)}%`, minHeight: 8,
                  background: d.pct >= 90 
                    ? 'linear-gradient(to top, var(--green), var(--green-glow))' 
                    : d.pct >= 70 
                      ? 'linear-gradient(to top, var(--blue), var(--blue))'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow: d.pct >= 90 ? '0 0 12px rgba(0,230,118,0.3)' : 'none'
                }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Court Revenue */}
        <div style={{ padding: '18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Recaudación por Cancha</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{period}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {COURT_DATA.map((c, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{c.type}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: c.color, fontSize: '0.85rem', fontFamily: 'Outfit,sans-serif', flexShrink: 0 }}>
                    ${(c.revenue/1000).toFixed(0)}k
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 8, background: 'var(--bg-surface)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${c.pct}%`, background: c.color, borderRadius: 8,
                    boxShadow: `0 0 10px ${c.color}44`
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cantina */}
        <div style={{ padding: '18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
          <div style={{ marginBottom: 14 }}>
            <h3 className="font-heading" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Top Cantina</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Productos más vendidos</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CANTINA_TOP.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-dim)'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <ItemIcon size={15} color="var(--green)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--border-dim)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.pct}%`, background: 'var(--green)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>{item.qty} u.</span>
                    </div>
                  </div>
                  <span className="font-heading" style={{ fontWeight: 900, color: 'var(--green)', fontSize: '0.85rem', flexShrink: 0 }}>
                    ${(item.revenue/1000).toFixed(0)}k
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
