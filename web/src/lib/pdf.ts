/**
 * PDF Generation Helper (jsPDF + autoTable)
 * Generates professional quote PDFs client-side.
 * No backend or server required.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job } from '@/types';

const BRAND_COLOR: [number, number, number] = [16, 185, 129];   // Emerald-500
const DARK_COLOR:  [number, number, number] = [24, 24, 27];     // zinc-900
const MUTED_COLOR: [number, number, number] = [113, 113, 122];  // zinc-500

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getLaborCost(job: Job): number {
  const partsTotal = job.inspectionItems?.reduce((acc, item) => acc + (item.price || 0), 0) || 0;
  return Math.max(0, job.totalEstimate - partsTotal);
}

/**
 * Generates and downloads a professional PDF quote for the given job.
 * @param job  The Job object from Firestore.
 * @param mode 'advisor' = full detail | 'client' = simplified client version
 */
export function generateQuotePDF(job: Job, mode: 'advisor' | 'client' = 'advisor'): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // ── Header Bar ──────────────────────────────────────────────
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SGA', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestión Automotriz', margin, 24);

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
    const statusColor = statusColors[item.status] || MUTED_COLOR;
    return [
      item.name,
      item.status,
      item.notes || '',
      item.price && item.price > 0 ? formatMoney(item.price) : 'Sin costo',
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
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const laborCost = getLaborCost(job);
  const partsCost = (job.totalEstimate || 0) - laborCost;
  const approvedTotal = job.approvedAmount || job.totalEstimate || 0;

  const summaryX = pageWidth - margin - 70;

  doc.setFillColor(24, 24, 27);
  doc.roundedRect(summaryX - 4, finalY - 5, 74, 32, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mano de Obra:', summaryX, finalY + 1);
  doc.text(formatMoney(laborCost), pageWidth - margin, finalY + 1, { align: 'right' });

  doc.text('Repuestos:', summaryX, finalY + 8);
  doc.text(formatMoney(partsCost), pageWidth - margin, finalY + 8, { align: 'right' });

  doc.setDrawColor(...BRAND_COLOR);
  doc.line(summaryX, finalY + 11, pageWidth - margin, finalY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLOR);
  doc.text('TOTAL:', summaryX, finalY + 18);
  doc.text(formatMoney(approvedTotal > 0 ? approvedTotal : job.totalEstimate || 0), pageWidth - margin, finalY + 18, { align: 'right' });

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
  doc.text('Este documento es generado automáticamente por SGA — Sistema de Gestión Automotriz.', pageWidth / 2, footerY, { align: 'center' });

  // ── Save ────────────────────────────────────────────────────
  const filename = `SGA-Cotizacion-${job.vehicleId}-${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
