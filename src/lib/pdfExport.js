/**
 * Export a PDF del Cierre de Caja diario. Un solo lugar arma el documento —
 * si el diseño del reporte cambia, cambia acá y no en el componente.
 */
import jsPDF from 'jspdf';
import { formatARS } from './format';
import { formatLongDate, todayISO, nowTime } from './date';

const MARGIN = 40;
const PAGE_W = 595.28; // A4 en puntos (jsPDF default unit)

function sectionTitle(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 25);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(210, 215, 210);
  doc.line(MARGIN, y + 5, PAGE_W - MARGIN, y + 5);
  return y + 22;
}

function row(doc, left, right, y, { bold = false, color = [40, 40, 40] } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(left, MARGIN, y);
  doc.text(right, PAGE_W - MARGIN, y, { align: 'right' });
  return y + 16;
}

function emptyRow(doc, text, y) {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(140, 140, 140);
  doc.text(text, MARGIN, y);
  return y + 16;
}

export function exportCierreCajaPDF({ complejo, fecha, cierreCaja, pagosDelDia, ventasMostrador, gastosDelDia }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN;

  // ── Header: complejo ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 15, 12);
  doc.text(complejo?.nombre || 'Complejo', MARGIN, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  const direccionLinea = [complejo?.direccion, complejo?.ciudad].filter(Boolean).join(', ');
  if (direccionLinea) {
    doc.text(direccionLinea, MARGIN, y);
    y += 13;
  }
  if (complejo?.telefono) {
    doc.text(`Tel: ${complejo.telefono}`, MARGIN, y);
    y += 13;
  }
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 25);
  doc.text(`Cierre de Caja — ${formatLongDate(fecha)}`, MARGIN, y);
  y += 28;

  // ── KPIs ──
  y = sectionTitle(doc, 'Resumen del día', y);
  y = row(doc, 'Ingresos Turnos', formatARS(cierreCaja.ingresosTurnos), y);
  y = row(doc, 'Ingresos Cantina', formatARS(cierreCaja.ingresosCantina), y);
  y = row(doc, 'Egresos', `-${formatARS(cierreCaja.egresos)}`, y, { color: [180, 40, 40] });
  y = row(doc, 'Neto del Día', formatARS(cierreCaja.neto), y, {
    bold: true,
    color: cierreCaja.neto >= 0 ? [0, 120, 60] : [180, 40, 40],
  });
  y += 14;

  // ── Turnos cobrados ──
  y = sectionTitle(doc, 'Turnos cobrados hoy', y);
  if (pagosDelDia.length === 0) {
    y = emptyRow(doc, 'No se cobró ningún turno en esta fecha.', y);
  } else {
    for (const p of pagosDelDia) {
      y = row(doc, `${p.clienteNombre} · ${p.canchaNombre} ${p.hora}hs`, `+${formatARS(p.monto)}`, y);
    }
  }
  y += 14;

  // ── Ventas de mostrador ──
  y = sectionTitle(doc, 'Ventas de mostrador hoy', y);
  if (ventasMostrador.length === 0) {
    y = emptyRow(doc, 'Sin ventas de mostrador en esta fecha.', y);
  } else {
    for (const v of ventasMostrador) {
      const detalle = v.items?.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ') || 'Venta';
      y = row(doc, detalle, `+${formatARS(v.total)}`, y);
    }
  }
  y += 14;

  // ── Gastos ──
  y = sectionTitle(doc, 'Gastos del día', y);
  if (gastosDelDia.length === 0) {
    y = emptyRow(doc, 'Sin gastos cargados en esta fecha.', y);
  } else {
    for (const g of gastosDelDia) {
      y = row(doc, g.concepto, `-${formatARS(g.monto)}`, y, { color: [180, 40, 40] });
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado con TuCan · ${formatLongDate(todayISO())} ${nowTime()}hs`, MARGIN, 820);

  doc.save(`cierre-caja_${fecha}.pdf`);
}
