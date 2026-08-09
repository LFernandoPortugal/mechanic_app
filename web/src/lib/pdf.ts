/**
 * PDF Generation Helper (jsPDF + autoTable)
 * Generates professional quote PDFs client-side.
 * No backend or server required.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, WorkshopSettings } from '@/types';

type QuotePdfJob = Pick<
  Job,
  'id' | 'vehicleId' | 'clientId' | 'inspectionItems' | 'totalEstimate' | 'approvedAmount' | 'status'
> & Partial<Pick<Job, 'odometer' | 'clientPhone' | 'clientEmail' | 'startingFuel'>>;

const BRAND_COLOR: [number, number, number] = [16, 185, 129];   // Emerald-500
const DARK_COLOR:  [number, number, number] = [24, 24, 27];     // zinc-900
const MUTED_COLOR: [number, number, number] = [113, 113, 122];  // zinc-500

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const getLastTableY = (document: jsPDF, fallback: number) =>
  (document as JsPdfWithAutoTable).lastAutoTable?.finalY ?? fallback;

function formatMoney(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

function getLaborCost(job: QuotePdfJob): number {
  const partsTotal = job.inspectionItems?.reduce((acc, item) => acc + (item.price || 0), 0) || 0;
  return Math.max(0, job.totalEstimate - partsTotal);
}

/**
 * Generates and downloads a professional PDF quote for the given job.
 * @param job       The Job object from Firestore.
 * @param mode      'advisor' = full detail | 'client' = simplified client version
 * @param workshop  Optional workshop settings for dynamic branding
 */
export function generateQuotePDF(
  job: QuotePdfJob,
  mode: 'advisor' | 'client' = 'advisor',
  workshop?: Partial<WorkshopSettings> | null
): void {
  void mode;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const symbol = workshop?.currencySymbol || '$';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  const shopName = workshop?.workshopName || 'SGA Auto';
  const shopSubtitle = 'Sistema de Gestión Automotriz';

  // ── Header Bar ──────────────────────────────────────────────
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(shopSubtitle, margin, 24);

  doc.setFontSize(10);
  doc.text('COTIZACIÓN DE SERVICIO', pageWidth - margin, 14, { align: 'right' });
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  doc.text(`Fecha: ${dateStr}`, pageWidth - margin, 20, { align: 'right' });
  doc.text(`ID: ${job.id.substring(0, 12).toUpperCase()}`, pageWidth - margin, 26, { align: 'right' });

  y = 38;

  // ── Vehicle & Client Info ────────────────────────────────────
  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Vehículo', margin, y);

  y += 2;
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_COLOR);

  const colA = margin;
  const colB = 80;
  const colC = pageWidth / 2 + 10;
  const colD = colC + 45;

  doc.setFont('helvetica', 'bold');
  doc.text('Vehículo:', colA, y);
  doc.setFont('helvetica', 'normal');
  doc.text(job.vehicleId || '—', colB, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', colC, y);
  doc.setFont('helvetica', 'normal');
  doc.text(job.clientId || '—', colD, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Odómetro:', colA, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${job.odometer?.toLocaleString() || '—'} km`, colB, y);

  if (job.clientPhone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Teléfono:', colC, y);
    doc.setFont('helvetica', 'normal');
    doc.text(job.clientPhone, colD, y);
  }

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Combustible:', colA, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${job.startingFuel || 0}%`, colB, y);

  if (job.clientEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', colC, y);
    doc.setFont('helvetica', 'normal');
    doc.text(job.clientEmail, colD, y);
  }

  y += 12;

  // ── Inspection Items Table ──────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_COLOR);
  doc.text('Detalle de Reparaciones', margin, y);

  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const statusColors: Record<string, [number, number, number]> = {
    Pass:        [16, 185, 129],
    Fail:        [239, 68, 68],
    Critical:    [249, 115, 22],
    Recommended: [59, 130, 246],
  };

  const tableRows = (job.inspectionItems || []).map(item => {
    return [
      item.name,
      item.status,
      item.notes || '',
      item.price && item.price > 0 ? formatMoney(item.price, symbol) : 'Sin costo',
      item.approved === false ? 'Declinado' : (item.price ? 'Autorizado' : 'Revisado'),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Estado', 'Notas del Técnico', 'Precio', 'Aprobación']],
    body: tableRows,
    headStyles: {
      fillColor: DARK_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK_COLOR,
    },
    alternateRowStyles: { fillColor: [244, 244, 245] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 22 },
      2: { cellWidth: 60 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const status = data.cell.raw as string;
        const color = statusColors[status] || MUTED_COLOR;
        doc.setTextColor(...color);
      } else {
        doc.setTextColor(...DARK_COLOR);
      }
    },
  });

  // ── Totals ──────────────────────────────────────────────────
  const finalY = getLastTableY(doc, y) + 8;
  const laborCost = getLaborCost(job);
  const partsCost = (job.totalEstimate || 0) - laborCost;
  const approvedTotal = job.approvedAmount || job.totalEstimate || 0;

  const summaryX = pageWidth - margin - 70;
  const taxRate = workshop?.taxRate || 0;
  const taxName = workshop?.taxName || 'IGV';
  const total = approvedTotal > 0 ? approvedTotal : job.totalEstimate || 0;
  const subtotal = taxRate > 0 ? total / (1 + taxRate / 100) : total;
  const taxAmount = total - subtotal;

  doc.setFillColor(24, 24, 27);
  if (taxRate > 0) {
    doc.roundedRect(summaryX - 4, finalY - 5, 74, 45, 2, 2, 'F');
  } else {
    doc.roundedRect(summaryX - 4, finalY - 5, 74, 32, 2, 2, 'F');
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mano de Obra:', summaryX, finalY + 1);
  doc.text(formatMoney(laborCost, symbol), pageWidth - margin, finalY + 1, { align: 'right' });

  doc.text('Repuestos:', summaryX, finalY + 7);
  doc.text(formatMoney(partsCost, symbol), pageWidth - margin, finalY + 7, { align: 'right' });

  if (taxRate > 0) {
    doc.text('Subtotal:', summaryX, finalY + 13);
    doc.text(formatMoney(subtotal, symbol), pageWidth - margin, finalY + 13, { align: 'right' });

    doc.text(`${taxName} (${taxRate}%):`, summaryX, finalY + 19);
    doc.text(formatMoney(taxAmount, symbol), pageWidth - margin, finalY + 19, { align: 'right' });

    doc.setDrawColor(...BRAND_COLOR);
    doc.line(summaryX, finalY + 22, pageWidth - margin, finalY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text('TOTAL:', summaryX, finalY + 29);
    doc.text(formatMoney(total, symbol), pageWidth - margin, finalY + 29, { align: 'right' });
  } else {
    doc.setDrawColor(...BRAND_COLOR);
    doc.line(summaryX, finalY + 11, pageWidth - margin, finalY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text('TOTAL:', summaryX, finalY + 18);
    doc.text(formatMoney(total, symbol), pageWidth - margin, finalY + 18, { align: 'right' });
  }

  // ── Status Badge ────────────────────────────────────────────
  const statusLabel = job.status === 'Approved' ? 'APROBADO' : 'PENDIENTE DE APROBACIÓN';
  const statusFill: [number, number, number] = job.status === 'Approved' ? BRAND_COLOR : [245, 158, 11];
  doc.setFillColor(...statusFill);
  doc.roundedRect(margin, finalY - 5, 50, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, margin + 25, finalY + 1.5, { align: 'center' });

  // ── Footer ──────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const footerText = workshop?.workshopName
    ? `Este documento es generado automáticamente por ${workshop.workshopName} — ${shopSubtitle}.`
    : 'Este documento es generado automáticamente por SGA — Sistema de Gestión Automotriz.';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  // ── Save ────────────────────────────────────────────────────
  const filename = `SGA-Cotizacion-${job.vehicleId}-${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

// ═══════════════════════════════════════════════════════════════
//  RECEIPT PDF — Generated after full payment
// ═══════════════════════════════════════════════════════════════

/**
 * Generates and downloads a professional receipt/invoice PDF for a paid job.
 * @param job       The Job object (must have payments array populated).
 * @param workshop  Optional workshop settings for dynamic branding.
 */
export function generateReceiptPDF(
  job: Job,
  workshop?: WorkshopSettings | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const symbol = workshop?.currencySymbol || '$';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  const shopName = workshop?.workshopName || 'SGA Auto';
  const shopNit = workshop?.taxId || '';
  const shopPhone = workshop?.phone || '';
  const shopAddress = workshop?.address || '';
  const dateStr = new Date().toLocaleDateString('es-PA', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // ── Header Bar (Emerald for receipts) ───────────────────────
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, margin, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (shopAddress) doc.text(shopAddress, margin, 22);
  if (shopNit) doc.text(`NIT: ${shopNit}`, margin, 27);
  if (shopPhone) doc.text(`Tel: ${shopPhone}`, margin, shopNit ? 32 : 27);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', pageWidth - margin, 14, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${dateStr}`, pageWidth - margin, 21, { align: 'right' });
  doc.text(`Orden: ${job.id.substring(0, 12).toUpperCase()}`, pageWidth - margin, 27, { align: 'right' });

  y = 42;

  // ── Client & Vehicle Info ───────────────────────────────────
  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Cliente', margin, y);
  y += 2;
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(10);
  const infoLines = [
    ['Cliente:', job.clientId || '—'],
    ['Vehículo:', job.vehicleId || '—'],
    ['Odómetro:', `${job.odometer?.toLocaleString() || '—'} km`],
  ];
  if (job.clientPhone) infoLines.push(['Teléfono:', job.clientPhone]);
  if (job.clientEmail) infoLines.push(['Email:', job.clientEmail]);

  for (const [label, value] of infoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, y);
    y += 6;
  }

  y += 4;

  // ── Services Performed ──────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Servicios Realizados', margin, y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const approvedItems = (job.inspectionItems || []).filter(
    (item) => item.approved !== false && (item.price || 0) > 0
  );

  const serviceRows = approvedItems.map((item) => [
    item.name,
    item.status,
    item.price ? formatMoney(item.price, symbol) : `${symbol}0.00`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Servicio / Repuesto', 'Estado', 'Precio']],
    body: serviceRows,
    headStyles: {
      fillColor: DARK_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK_COLOR,
    },
    alternateRowStyles: { fillColor: [244, 244, 245] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = getLastTableY(doc, y) + 8;

  // ── Totals Summary ──────────────────────────────────────────
  const laborCost = getLaborCost(job);
  const partsCost = (job.totalEstimate || 0) - laborCost;
  const totalPaid = (job.payments || []).reduce((s, p) => s + p.amount, 0);

  const summaryX = pageWidth - margin - 80;
  const taxRate = workshop?.taxRate || 0;
  const taxName = workshop?.taxName || 'IGV';
  const total = job.totalEstimate || 0;
  const subtotal = taxRate > 0 ? total / (1 + taxRate / 100) : total;
  const taxAmount = total - subtotal;

  doc.setFillColor(24, 24, 27);
  if (taxRate > 0) {
    doc.roundedRect(summaryX - 4, y - 3, 84, 52, 2, 2, 'F');
  } else {
    doc.roundedRect(summaryX - 4, y - 3, 84, 40, 2, 2, 'F');
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.text('Repuestos:', summaryX, y + 4);
  doc.text(formatMoney(partsCost, symbol), pageWidth - margin, y + 4, { align: 'right' });

  doc.text('Mano de Obra:', summaryX, y + 10);
  doc.text(formatMoney(laborCost, symbol), pageWidth - margin, y + 10, { align: 'right' });

  if (taxRate > 0) {
    doc.text('Subtotal:', summaryX, y + 16);
    doc.text(formatMoney(subtotal, symbol), pageWidth - margin, y + 16, { align: 'right' });

    doc.text(`${taxName} (${taxRate}%):`, summaryX, y + 22);
    doc.text(formatMoney(taxAmount, symbol), pageWidth - margin, y + 22, { align: 'right' });

    doc.setDrawColor(...BRAND_COLOR);
    doc.line(summaryX, y + 25, pageWidth - margin, y + 25);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Orden:', summaryX, y + 31);
    doc.text(formatMoney(total, symbol), pageWidth - margin, y + 31, { align: 'right' });

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(11);
    doc.text('TOTAL PAGADO:', summaryX, y + 41);
    doc.text(formatMoney(totalPaid, symbol), pageWidth - margin, y + 41, { align: 'right' });
  } else {
    doc.setDrawColor(...BRAND_COLOR);
    doc.line(summaryX, y + 15, pageWidth - margin, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Orden:', summaryX, y + 22);
    doc.text(formatMoney(total, symbol), pageWidth - margin, y + 22, { align: 'right' });

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(11);
    doc.text('TOTAL PAGADO:', summaryX, y + 31);
    doc.text(formatMoney(totalPaid, symbol), pageWidth - margin, y + 31, { align: 'right' });
  }

  // ── PAID Badge ──────────────────────────────────────────────
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y - 3, 55, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ PAGADO COMPLETO', margin + 27.5, y + 5, { align: 'center' });

  y += 48;

  // ── Payment History ─────────────────────────────────────────
  if (job.payments && job.payments.length > 0) {
    doc.setTextColor(...DARK_COLOR);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Pagos', margin, y);
    y += 2;
    doc.setDrawColor(...BRAND_COLOR);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    const paymentRows = job.payments.map((p) => [
      new Date(p.date).toLocaleDateString('es-PA'),
      p.method,
      p.reference || '—',
      formatMoney(p.amount, symbol),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Método', 'Referencia', 'Monto']],
      body: paymentRows,
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: DARK_COLOR,
      },
      alternateRowStyles: { fillColor: [236, 253, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 55 },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ── Footer ──────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const footerText = `Recibo generado automáticamente por ${shopName}. Conserve este documento como comprobante de pago.`;
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  // ── Save ────────────────────────────────────────────────────
  const filename = `${shopName}-Recibo-${job.vehicleId}-${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
