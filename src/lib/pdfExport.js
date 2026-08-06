/**
 * Export a PDF del Cierre de Caja diario. Un solo lugar arma el documento —
 * si el diseño del reporte cambia, cambia acá y no en el componente.
 */
import jsPDF from 'jspdf';
import { formatARS } from './format';
import { formatLongDate, formatMediumDate, todayISO, nowTime } from './date';

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

/* ═══════════════════════════════════════════════════════════════════════════
   Ticket de venta — rollo de 80mm
   ═══════════════════════════════════════════════════════════════════════════

   Antes esto era `window.print()` sobre un portal oculto con `@media print`.
   En Chrome de Android eso sale en blanco: el "Guardar como PDF" del sistema
   arma su propia instantánea de la página y el nodo que sólo existe en el
   media `print` no siempre entra. Armar el PDF a mano con jsPDF da el mismo
   archivo en celular y en escritorio, y encima es lo que el usuario quiere:
   un ticket descargable que después imprime en la térmica.

   El alto del papel es dinámico (un rollo no tiene "hoja"): el ticket crece
   con el pedido en vez de saltar a una segunda página. */

const TICKET_W = 80;   // mm — rollo estándar de impresora de tickets
const TICKET_PAD = 6;

function dashed(doc, y) {
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([0.7, 0.7], 0);
  doc.line(TICKET_PAD, y, TICKET_W - TICKET_PAD, y);
  doc.setLineDashPattern([], 0);
}

/** Recorta con "…" para que el nombre nunca pise la columna del precio. */
function fit(doc, text, maxW) {
  if (doc.getTextWidth(text) <= maxW) return text;
  let cortado = text;
  while (cortado.length > 1 && doc.getTextWidth(`${cortado}…`) > maxW) {
    cortado = cortado.slice(0, -1);
  }
  return `${cortado}…`;
}

export function exportTicketPDF(sale) {
  const items = sale.items ?? [];
  const alto = 56 + items.length * 4.2;

  // jsPDF normaliza el formato según la orientación: en 'portrait' (el default)
  // obliga a que el alto sea el lado mayor y DA VUELTA las medidas si no lo es.
  // Un ticket corto (pocos ítems) mide menos de alto que de ancho, así que
  // salía girado a 68mm de ancho y los precios, alineados a 74mm, quedaban
  // cortados fuera de la hoja. Eligiendo la orientación según las medidas
  // reales, el papel queda siempre de 80mm de ancho.
  const doc = new jsPDF({
    unit: 'mm',
    format: [TICKET_W, alto],
    orientation: alto >= TICKET_W ? 'portrait' : 'landscape',
  });
  const left = TICKET_PAD;
  const right = TICKET_W - TICKET_PAD;
  const center = TICKET_W / 2;
  const contentW = right - left;
  let y = 9;

  // ── Encabezado ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17);
  doc.text(fit(doc, sale.complejoNombre || 'Comprobante de Venta', contentW), center, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90);
  doc.text(`${formatMediumDate(sale.fecha)} · ${sale.time}`, center, y, { align: 'center' });
  y += 4;

  doc.setFont('courier', 'bold');
  doc.setTextColor(17);
  doc.text(fit(doc, sale.target ?? 'Mostrador', contentW), center, y, { align: 'center' });
  y += 3.5;

  dashed(doc, y);
  y += 5;

  // ── Ítems ──
  doc.setFontSize(8);
  for (const item of items) {
    const precio = formatARS(item.precioUnit * item.cantidad);
    doc.setFont('courier', 'normal');
    const anchoPrecio = doc.getTextWidth(precio);

    doc.setTextColor(17);
    doc.text(fit(doc, `${item.cantidad} x ${item.nombre}`, contentW - anchoPrecio - 2), left, y);
    doc.setTextColor(80);
    doc.text(precio, right, y, { align: 'right' });
    y += 4.2;
  }

  y -= 0.7;
  dashed(doc, y);
  y += 5;

  // ── Medio de cobro ──
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  doc.text('Medio de Cobro', left, y);
  doc.setFont('courier', 'bold');
  doc.setTextColor(17);
  doc.text(sale.method ?? '—', right, y, { align: 'right' });
  y += 3.5;

  dashed(doc, y);
  y += 6;

  // ── Total ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17);
  doc.text('Total', left, y);
  doc.text(formatARS(sale.total), right, y, { align: 'right' });
  y += 6;

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(150);
  doc.text('¡Gracias por su compra!', center, y, { align: 'center' });

  doc.save(`ticket_${sale.id}.pdf`);
}
