import React, { useState } from 'react';
import {
  DollarSign, Download,
  Plus, Pencil, Trash2, Receipt, Wallet, ShoppingBag, TrendingDown,
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import DateNav from './DateNav';
import NuevoGastoModal from './NuevoGastoModal';
import { useConfirm } from './ConfirmDialog';
import { formatARS } from '../lib/format';
import { addDays, formatMediumDate, formatShortDate, todayISO } from '../lib/date';
import { GASTO_CATEGORIA_LABEL } from '../lib/status';
import { exportCierreCajaPDF } from '../lib/pdfExport';
import {
  useExpenses, useExpenseActions, useSelectedDate, useCierreCajaDelDia, useExpensesForDate,
  usePagosDelDia, useCajaDelDia, useToast, useConfig, useCanchasActivas,
  useOcupacionPorDiaSemana, useDistribucionTurnosPorDia,
  useFijosVsOcasionalesPorSemana, useNuevosVsRecurrentesPorSemana,
} from '../store';
import { usePuede } from '../auth/AuthProvider';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'caja', label: 'Cierre de Caja' },
];

// 8 semanas atrás por defecto — suficiente para ver una tendencia sin traer
// el historial entero cada vez que se abre la pantalla.
const RANGO_POR_DEFECTO_DIAS = 56;

/**
 * Escala "redonda" para el eje: sube el máximo hasta el próximo paso lindo
 * (1/2/5 × potencia de 10) y devuelve las marcas.
 *
 * Sin esto los charts se dibujaban contra un 100% fijo: con ocupaciones reales
 * del 20-30% todas las barras quedaban aplastadas contra el piso y el gráfico
 * no decía nada. El eje rotulado es lo que hace honesto adaptar la escala.
 */
function escalaEje(maxValor, divisiones = 4) {
  if (!(maxValor > 0)) return { max: 1, marcas: [0, 1] };
  const bruto = maxValor / divisiones;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const normal = bruto / magnitud;
  const escalon = normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 2.5 ? 2.5 : normal <= 5 ? 5 : 10;
  // Todo lo que graficamos son porcentajes o conteos: un eje con marcas en
  // 0,5 turnos no querría decir nada.
  const paso = Math.max(1, Math.round(escalon * magnitud));
  const max = Math.ceil(maxValor / paso) * paso;
  const marcas = [];
  for (let v = 0; v <= max; v += paso) marcas.push(v);
  return { max, marcas };
}

/** Grilla de fondo + eje Y. Recesiva a propósito: los datos van adelante. */
function PlanoCartesiano({ marcas, sufijo = '', children }) {
  return (
    <div className="chart-plano">
      <div className="chart-eje-y">
        {[...marcas].reverse().map((m) => (
          <span key={m} className="num chart-eje-tick">{m}{sufijo}</span>
        ))}
      </div>
      <div className="chart-area">
        <div className="chart-grid" aria-hidden="true">
          {marcas.map((m) => <div key={m} className="chart-grid-linea" />)}
        </div>
        <div className="chart-marcas">{children}</div>
      </div>
    </div>
  );
}

/**
 * Barras verticales por día de semana. Una sola serie, así que no lleva
 * leyenda: el título ya dice qué se está midiendo.
 */
function BarrasPorDia({ datos, color, destacarAlto = false }) {
  if (!datos.length) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin datos en este rango.</p>;
  }
  const { max, marcas } = escalaEje(Math.max(...datos.map((d) => d.pct)));

  return (
    <div>
      <PlanoCartesiano marcas={marcas} sufijo="%">
        {datos.map((d) => {
          const alto = (d.pct / max) * 100;
          const esAlto = destacarAlto && d.pct >= 70;
          return (
            <div key={d.dia} className="chart-columna" title={`${d.label}: ${d.pct}%`}>
              <span className="num chart-valor">{d.pct}%</span>
              <div
                className="chart-barra"
                style={{ height: `${Math.max(alto, 2)}%`, background: esAlto ? 'var(--green)' : color }}
              />
            </div>
          );
        })}
      </PlanoCartesiano>
      <div className="chart-eje-x">
        {datos.map((d) => <span key={d.dia} className="chart-eje-x-label">{d.label}</span>)}
      </div>
    </div>
  );
}

/** Barras apiladas por semana — Fijos/Ocasionales y Nuevos/Recurrentes comparten esta forma. */
function BarraApiladaSemanal({ semanas, campoA, campoB, colorA, colorB }) {
  if (!semanas.length) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos en este rango.</p>;
  }
  const { max, marcas } = escalaEje(Math.max(...semanas.map((s) => s[campoA] + s[campoB])));
  const etiquetaSemana = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  return (
    <div className="chart-scroll">
      <div className="chart-scroll-inner" style={{ minWidth: semanas.length * 46 }}>
        <PlanoCartesiano marcas={marcas}>
          {semanas.map((s) => {
            const total = s[campoA] + s[campoB];
            return (
              <div
                key={s.semanaInicio}
                className="chart-columna"
                title={`Semana del ${etiquetaSemana(s.semanaInicio)} — ${total} en total`}
              >
                <span className="num chart-valor">{total || ''}</span>
                {/* Apilada de abajo hacia arriba: campoA es la base. El gap de
                    2px entre segmentos los separa sin necesidad de borde. */}
                <div className="chart-barra-apilada" style={{ height: `${(total / max) * 100}%` }}>
                  {s[campoB] > 0 && (
                    <div className="chart-segmento" style={{ flex: s[campoB], background: colorB }} />
                  )}
                  {s[campoA] > 0 && (
                    <div className="chart-segmento" style={{ flex: s[campoA], background: colorA }} />
                  )}
                </div>
              </div>
            );
          })}
        </PlanoCartesiano>
        <div className="chart-eje-x">
          {semanas.map((s) => (
            <span key={s.semanaInicio} className="chart-eje-x-label">{etiquetaSemana(s.semanaInicio)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportesAnalytics() {
  const [tab, setTab] = useState('general');
  const [gastoModal, setGastoModal] = useState(null); // null | 'new' | Expense

  // ─── Filtros de la tab General ───
  const [rangoDesde, setRangoDesde] = useState(addDays(todayISO(), -RANGO_POR_DEFECTO_DIAS));
  const [rangoHasta, setRangoHasta] = useState(todayISO());
  const [canchaFiltro, setCanchaFiltro] = useState('all');

  const canchasActivas = useCanchasActivas();
  const canchaId = canchaFiltro === 'all' ? null : canchaFiltro;
  const ocupacionPorDia = useOcupacionPorDiaSemana(rangoDesde, rangoHasta, canchaId);
  const distribucionPorDia = useDistribucionTurnosPorDia(rangoDesde, rangoHasta, canchaId);
  const fijosVsOcasionales = useFijosVsOcasionalesPorSemana(rangoDesde, rangoHasta, canchaId);
  const nuevosVsRecurrentes = useNuevosVsRecurrentesPorSemana(rangoDesde, rangoHasta, canchaId);

  const expenses = useExpenses();
  const expenseActions = useExpenseActions();
  // Sin este permiso la base rechaza el DELETE de gastos: no se muestra el botón.
  const puedeEliminar = usePuede('eliminar_registros');
  const toast = useToast();
  const config = useConfig();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const selectedDate = useSelectedDate();
  const cierreCaja = useCierreCajaDelDia(selectedDate);
  const gastosDelDia = useExpensesForDate(selectedDate);
  const pagosDelDia = usePagosDelDia(selectedDate);
  // Mismo filtro que usa selectCierreCajaDelDia para ingresosCantina: solo
  // ventas de mostrador SIN turno asociado (las que sí lo tienen ya están
  // adentro de pagosDelDia cuando el cliente paga el turno).
  const ventasMostrador = useCajaDelDia(selectedDate).ventas.filter((v) => !v.bookingId);

  const gastosOrdenados = [...expenses].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const handleExportPDF = () => {
    exportCierreCajaPDF({
      complejo: config?.complejo,
      fecha: selectedDate,
      cierreCaja,
      pagosDelDia,
      ventasMostrador,
      gastosDelDia,
    });
  };

  const handleSaveGasto = (data) => {
    const isEdit = gastoModal && gastoModal !== 'new';
    const result = isEdit
      ? expenseActions.actualizar(gastoModal.id, data)
      : expenseActions.crear(data);
    if (!result.ok) return result;
    toast.success(isEdit ? 'Gasto actualizado' : `Gasto "${data.concepto}" agregado`);
    setGastoModal(null);
    return result;
  };

  const handleDeleteGasto = async (gasto) => {
    const ok = await confirm({
      title: 'Eliminar gasto',
      message: `"${gasto.concepto}" se saca del registro. Podés deshacerlo desde el aviso.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    expenseActions.eliminar(gasto.id);
    setGastoModal(null);
    toast.info(`Gasto "${gasto.concepto}" eliminado`, {
      action: { label: 'Deshacer', onClick: () => expenseActions.restaurar(gasto) },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Reportes & Finanzas</h1>
          <p className="section-subtitle">Métricas de negocio · Gastos · Cierre de caja diario</p>
        </div>
        {tab === 'gastos' && (
          <button className="btn-primary" onClick={() => setGastoModal('new')} style={{ padding: '9px 18px' }}>
            <Plus size={15} style={{ color: 'var(--on-accent)' }} />
            Nuevo Gasto
          </button>
        )}
        {tab === 'caja' && (
          <button className="btn-secondary" onClick={handleExportPDF} style={{ padding: '9px 14px', gap: 6, height: 42 }}>
            <Download size={14} color="var(--text-secondary)" /> Exportar PDF
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-switcher" style={{ alignSelf: 'flex-start', overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
      <>
      {/* Filtros: rango de fechas + cancha. Los tres del mismo largo — ver
          .filtros-reporte en index.css. */}
      <div className="filtros-reporte">
        <div className="form-group">
          <label className="form-label">Desde</label>
          <input
            type="date"
            value={rangoDesde}
            max={rangoHasta}
            onChange={(e) => e.target.value && setRangoDesde(e.target.value)}
            className="form-input num"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            value={rangoHasta}
            min={rangoDesde}
            max={todayISO()}
            onChange={(e) => e.target.value && setRangoHasta(e.target.value)}
            className="form-input num"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Cancha</label>
          <CustomSelect
            options={[{ value: 'all', label: 'Todas las canchas' }, ...canchasActivas.map((c) => ({ value: c.id, label: c.nombre }))]}
            value={canchaFiltro}
            onChange={setCanchaFiltro}
          />
        </div>
      </div>

      {/* Charts Row — SIEMPRE 2 por fila en desktop/tablet (≥700px), 1 columna
          en mobile. Ver .reportes-charts-grid en index.css. */}
      <div className="reportes-charts-grid">

        {/* Ocupación por día */}
        <div className="reportes-chart-card">
          <div className="chart-header">
            <div className="chart-titulos">
              <h3 className="font-heading chart-titulo">Tasa de ocupación por día</h3>
              <p className="chart-subtitulo">
                {formatShortDate(rangoDesde)} — {formatShortDate(rangoHasta)}
              </p>
            </div>
          </div>
          <BarrasPorDia datos={ocupacionPorDia} color="var(--celeste)" destacarAlto />
        </div>

        {/* Distribución de turnos por día */}
        <div className="reportes-chart-card">
          <div className="chart-header">
            <div className="chart-titulos">
              <h3 className="font-heading chart-titulo">Porcentaje de turnos por día</h3>
              <p className="chart-subtitulo">Cómo se distribuyen los turnos entre los días de la semana</p>
            </div>
          </div>
          <BarrasPorDia datos={distribucionPorDia} color="var(--blue)" />
        </div>

        {/* Fijos vs ocasionales */}
        <div className="reportes-chart-card">
          <div className="chart-header">
            <div className="chart-titulos">
              <h3 className="font-heading chart-titulo">Fijos vs ocasionales</h3>
              <p className="chart-subtitulo">Serie temporal de turnos del período</p>
            </div>
            <div className="chart-leyenda">
              <span className="chart-leyenda-item">
                <span className="chart-swatch" style={{ background: 'var(--purple)' }} /> Fijos
              </span>
              <span className="chart-leyenda-item">
                <span className="chart-swatch" style={{ background: 'var(--border-mid)' }} /> Ocasionales
              </span>
            </div>
          </div>
          <BarraApiladaSemanal
            semanas={fijosVsOcasionales}
            campoA="fijos" campoB="ocasionales"
            colorA="var(--purple)" colorB="var(--border-mid)"
          />
        </div>

        {/* Nuevos vs recurrentes */}
        <div className="reportes-chart-card">
          <div className="chart-header">
            <div className="chart-titulos">
              <h3 className="font-heading chart-titulo">Clientes nuevos vs recurrentes</h3>
              <p className="chart-subtitulo">Clientes únicos por período dentro del rango seleccionado</p>
            </div>
            <div className="chart-leyenda">
              <span className="chart-leyenda-item">
                <span className="chart-swatch" style={{ background: 'var(--green)' }} /> Nuevos
              </span>
              <span className="chart-leyenda-item">
                <span className="chart-swatch" style={{ background: 'var(--blue)' }} /> Recurrentes
              </span>
            </div>
          </div>
          <BarraApiladaSemanal
            semanas={nuevosVsRecurrentes}
            campoA="recurrentes" campoB="nuevos"
            colorA="var(--blue)" colorB="var(--green)"
          />
        </div>

      </div>
      </>
      )}

      {tab === 'gastos' && (
        <>
          {gastosOrdenados.length === 0 ? (
            <div className="empty-state">
              <Receipt size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                No hay gastos cargados todavía
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Registrá sueldos, mantenimiento o servicios con "Nuevo Gasto".
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gastosOrdenados.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
                    padding: '12px 14px', borderRadius: 12,
                    background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.concepto}
                    </span>
                    <span className="font-heading num" style={{ fontWeight: 800, color: 'var(--red)', fontSize: '0.88rem', flexShrink: 0 }}>
                      -{formatARS(g.monto)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {formatMediumDate(g.fecha)}
                      </span>
                      <span
                        style={{
                          padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                          background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                          color: 'var(--text-secondary)', fontSize: '0.68rem', fontWeight: 700,
                        }}
                      >
                        {GASTO_CATEGORIA_LABEL[g.categoria] ?? g.categoria}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => setGastoModal(g)}
                        aria-label={`Editar gasto ${g.concepto}`}
                        className="btn-icon"
                      >
                        <Pencil size={13} />
                      </button>
                      {puedeEliminar && (
                        <button
                          onClick={() => handleDeleteGasto(g)}
                          aria-label={`Eliminar gasto ${g.concepto}`}
                          className="btn-icon"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'caja' && (
        <>
          <DateNav />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {[
              { label: 'Ingresos Turnos', value: cierreCaja.ingresosTurnos, color: 'var(--text-primary)', icon: <Wallet size={18} /> },
              { label: 'Ingresos Cantina', value: cierreCaja.ingresosCantina, color: 'var(--text-primary)', icon: <ShoppingBag size={18} /> },
              { label: 'Egresos', value: cierreCaja.egresos, color: 'var(--red)', icon: <TrendingDown size={18} /> },
              { label: 'Neto del Día', value: cierreCaja.neto, color: cierreCaja.neto >= 0 ? 'var(--green)' : 'var(--red)', icon: <DollarSign size={18} /> },
            ].map((k, i) => (
              <div key={i} className="kpi-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="label-caps truncate-2" style={{ marginBottom: 4 }}>{k.label}</p>
                  <p className="font-heading num truncate-1" style={{ fontSize: 'clamp(1.1rem, 3.8vw, 1.45rem)', fontWeight: 900, color: k.color, lineHeight: 1.1 }}>
                    {formatARS(k.value)}
                  </p>
                </div>
                <div className="kpi-icon" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', color: k.color }}>
                  {k.icon}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 10 }} className="font-heading">
              <Wallet size={14} color="var(--text-secondary)" /> Turnos cobrados hoy
            </h3>
            {pagosDelDia.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No se cobró ningún turno en esta fecha.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {pagosDelDia.map((p) => (
                  <div
                    key={p.pagoId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.clienteNombre} <span style={{ color: 'var(--text-muted)' }}>· {p.canchaNombre} {p.hora}hs</span>
                    </span>
                    <span className="font-heading num" style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.82rem', flexShrink: 0 }}>
                      +{formatARS(p.monto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 10 }} className="font-heading">
              <ShoppingBag size={14} color="var(--text-secondary)" /> Ventas de mostrador hoy
            </h3>
            {ventasMostrador.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sin ventas de mostrador en esta fecha.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {ventasMostrador.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.items?.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
                    </span>
                    <span className="font-heading num" style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.82rem', flexShrink: 0 }}>
                      +{formatARS(v.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 10 }} className="font-heading">
              <Receipt size={14} color="var(--text-secondary)" /> Gastos del día
            </h3>
            {gastosDelDia.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sin gastos cargados en esta fecha.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gastosDelDia.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.concepto}
                    </span>
                    <span className="font-heading num" style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.82rem', flexShrink: 0 }}>
                      -{formatARS(g.monto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {gastoModal && (
        <NuevoGastoModal
          key={gastoModal === 'new' ? 'new' : gastoModal.id}
          isOpen
          gasto={gastoModal === 'new' ? null : gastoModal}
          onClose={() => setGastoModal(null)}
          onSave={handleSaveGasto}
          onDelete={puedeEliminar ? handleDeleteGasto : undefined}
        />
      )}
      {ConfirmDialogMount}
    </div>
  );
}
