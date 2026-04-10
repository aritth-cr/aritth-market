import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveFile } from '../../shared/utils/storage.js';

// =============================================
// COLORES ARITTH MARKET
// =============================================
const COLOR_BG = rgb(0.102, 0.102, 0.102);           // #1a1a1a
const COLOR_PRIMARY = rgb(0.373, 0.424, 0.306);        // #5F6C4E (verde Aritth)
const COLOR_ACCENT = rgb(0.976, 0.455, 0.086);         // #F97316 (naranja accent)
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
const COLOR_MED_GRAY = rgb(0.7, 0.7, 0.7);
const COLOR_DARK_TEXT = rgb(0.1, 0.1, 0.1);

export interface QuotePDFData {
  quoteNumber: string;          // AMT-COT-2025-000001
  date: Date;
  expiresAt: Date;
  company: {
    name: string;
    legalName: string;
    cedula: string;
    type: 'FREE_ZONE' | 'REGULAR';
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    description: string;
    sku?: string;
    quantity: number;
    unit: string;
    unitPrice: number;          // Precio unitario con margen
    ivaRate: number;
    ivaAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  ivaAmount: number;
  shipping: number;
  total: number;
  totalUsd: number | null;
  exchangeRateUsd: number | null;
  notes?: string;
}

/**
 * Genera el PDF de cotización con branding Aritth Market.
 * Retorna el URL relativo del archivo guardado.
 */
export async function generateQuotePDF(data: QuotePDFData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Carta (8.5 x 11 pulgadas)
  const { width, height } = page.getSize();

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let y = height;

  // ---- HEADER ----
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: COLOR_BG });

  // Logo text
  page.drawText('ARITTH MARKET', {
    x: 40, y: height - 45,
    size: 24, font: boldFont, color: COLOR_PRIMARY,
  });

  page.drawText('Automation, Robotics, Integration, Technology, Testing & Hub', {
    x: 40, y: height - 62,
    size: 7.5, font: regularFont, color: COLOR_MED_GRAY,
  });

  // Número de cotización (derecha)
  page.drawText(data.quoteNumber, {
    x: width - 40 - boldFont.widthOfTextAtSize(data.quoteNumber, 14),
    y: height - 40,
    size: 14, font: boldFont, color: COLOR_WHITE,
  });

  page.drawText('COTIZACIÓN', {
    x: width - 40 - boldFont.widthOfTextAtSize('COTIZACIÓN', 9),
    y: height - 55,
    size: 9, font: boldFont, color: COLOR_PRIMARY,
  });

  // Franja verde debajo del header
  page.drawRectangle({ x: 0, y: height - 105, width, height: 5, color: COLOR_PRIMARY });

  y = height - 120;

  // ---- INFO COTIZACIÓN ----
  const dateStr = data.date.toLocaleDateString('es-CR');
  const expiryStr = data.expiresAt.toLocaleDateString('es-CR');

  drawLabel(page, regularFont, boldFont, 40, y, 'Fecha:', dateStr);
  drawLabel(page, regularFont, boldFont, 200, y, 'Válida hasta:', expiryStr);
  drawLabel(page, regularFont, boldFont, 380, y, 'Condición:', 'Contado');

  y -= 25;

  // ---- DATOS DEL CLIENTE ----
  page.drawRectangle({ x: 35, y: y - 70, width: width - 70, height: 80, color: COLOR_LIGHT_GRAY });
  page.drawRectangle({ x: 35, y: y + 5, width: 120, height: 18, color: COLOR_PRIMARY });

  page.drawText('FACTURAR A', {
    x: 40, y: y + 8,
    size: 9, font: boldFont, color: COLOR_WHITE,
  });

  y -= 10;
  page.drawText(data.company.legalName || data.company.name, {
    x: 45, y,
    size: 11, font: boldFont, color: COLOR_DARK_TEXT,
  });

  y -= 16;
  page.drawText(`Cédula Jurídica: ${data.company.cedula}`, {
    x: 45, y,
    size: 9, font: regularFont, color: COLOR_DARK_TEXT,
  });

  if (data.company.type === 'FREE_ZONE') {
    y -= 13;
    page.drawText('✓ Empresa en Zona Franca - Exenta de IVA', {
      x: 45, y,
      size: 9, font: oblique, color: COLOR_PRIMARY,
    });
  }

  if (data.company.address) {
    y -= 13;
    page.drawText(`Dirección: ${data.company.address}`, {
      x: 45, y,
      size: 9, font: regularFont, color: COLOR_DARK_TEXT,
    });
  }

  y -= 30;

  // ---- TABLA DE PRODUCTOS ----
  const tableTop = y;
  const colWidths = [25, 205, 55, 50, 85, 85]; // #, Descripción, Cant, Unidad, Precio Unit, Total
  const colX = [40];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i]! + colWidths[i]!);
  }

  // Header de tabla
  page.drawRectangle({ x: 35, y: y - 2, width: width - 70, height: 20, color: COLOR_BG });

  const headers = ['#', 'DESCRIPCIÓN', 'CANT.', 'UNIDAD', 'PRECIO UNIT.', 'TOTAL'];
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: (colX[i] ?? 40) + 3, y: y + 4,
      size: 8, font: boldFont, color: COLOR_WHITE,
    });
  });

  y -= 22;

  // Filas de productos
  data.items.forEach((item, idx) => {
    const rowColor = idx % 2 === 0 ? COLOR_WHITE : rgb(0.97, 0.97, 0.97);
    page.drawRectangle({ x: 35, y: y - 4, width: width - 70, height: 18, color: rowColor });

    const truncName = item.description.length > 42
      ? item.description.substring(0, 39) + '...'
      : item.description;

    const rowData = [
      String(idx + 1),
      item.sku ? `${truncName}\n  SKU: ${item.sku}` : truncName,
      String(item.quantity),
      item.unit,
      formatCRC(item.unitPrice),
      formatCRC(item.lineTotal),
    ];

    rowData.forEach((text, i) => {
      const lines = text.split('\n');
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: (colX[i] ?? 40) + 3,
          y: y + (li === 0 ? 5 : -4),
          size: i === 1 && li === 1 ? 7 : 8.5,
          font: i === 1 && li === 1 ? oblique : regularFont,
          color: i === 1 && li === 1 ? COLOR_MED_GRAY : COLOR_DARK_TEXT,
        });
      });
    });

    y -= 20;
  });

  // Línea separadora
  page.drawLine({ start: { x: 35, y }, end: { x: width - 35, y }, thickness: 1, color: COLOR_MED_GRAY });

  y -= 20;

  // ---- TOTALES ----
  const totX = 380;

  drawSummaryRow(page, regularFont, boldFont, totX, y, 'Subtotal:', formatCRC(data.subtotal));
  y -= 16;

  if (data.ivaAmount > 0) {
    drawSummaryRow(page, regularFont, boldFont, totX, y, 'IVA (13%):', formatCRC(data.ivaAmount));
    y -= 16;
  } else {
    drawSummaryRow(page, regularFont, oblique, totX, y, 'IVA:', 'Exento (Zona Franca)');
    y -= 16;
  }

  if (data.shipping > 0) {
    drawSummaryRow(page, regularFont, boldFont, totX, y, 'Flete:', formatCRC(data.shipping));
    y -= 16;
  }

  // Total destacado
  y -= 5;
  page.drawRectangle({ x: totX - 5, y: y - 5, width: width - totX - 30, height: 24, color: COLOR_PRIMARY });

  page.drawText('TOTAL:', {
    x: totX, y: y + 4,
    size: 11, font: boldFont, color: COLOR_WHITE,
  });

  page.drawText(formatCRC(data.total), {
    x: width - 35 - boldFont.widthOfTextAtSize(formatCRC(data.total), 11),
    y: y + 4,
    size: 11, font: boldFont, color: COLOR_WHITE,
  });

  // Equivalente en USD
  if (data.totalUsd && data.exchangeRateUsd) {
    y -= 22;
    const usdText = `Equivalente: $${data.totalUsd.toLocaleString('es-CR', { minimumFractionDigits: 2 })} USD (TC: ₡${data.exchangeRateUsd.toFixed(2)})`;
    page.drawText(usdText, {
      x: totX, y,
      size: 8, font: oblique, color: COLOR_MED_GRAY,
    });
  }

  y -= 35;

  // ---- CAJA DE CONFIRMACIÓN ----
  page.drawRectangle({ x: 35, y: y - 55, width: width - 70, height: 65, color: COLOR_BG });

  page.drawText('Para confirmar su pedido', {
    x: 50, y: y - 15,
    size: 10, font: boldFont, color: COLOR_WHITE,
  });

  page.drawText('Envíe su Orden de Compra (PO) indicando este número de cotización a:', {
    x: 50, y: y - 30,
    size: 9, font: regularFont, color: COLOR_MED_GRAY,
  });

  page.drawText('ventas@aritth.com', {
    x: 50, y: y - 46,
    size: 13, font: boldFont, color: COLOR_PRIMARY,
  });

  // Notas
  if (data.notes) {
    y -= 75;
    page.drawText('Notas:', { x: 40, y, size: 9, font: boldFont, color: COLOR_DARK_TEXT });
    y -= 14;
    page.drawText(data.notes, { x: 40, y, size: 9, font: regularFont, color: COLOR_DARK_TEXT });
  }

  // ---- FOOTER ----
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: COLOR_BG });

  page.drawText('ventas@aritth.com  |  aritth.com  |  Zona Franca, San José, Costa Rica', {
    x: 40, y: 13,
    size: 8, font: regularFont, color: COLOR_MED_GRAY,
  });

  page.drawText(`${data.quoteNumber}`, {
    x: width - 150, y: 13,
    size: 8, font: regularFont, color: COLOR_MED_GRAY,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ---- HELPERS ----

function formatCRC(amount: number): string {
  return `₡${amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function drawLabel(
  page: any,
  regular: any,
  bold: any,
  x: number,
  y: number,
  label: string,
  value: string,
): void {
  page.drawText(label, { x, y, size: 9, font: regular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(value, { x: x + bold.widthOfTextAtSize(label, 9) + 4, y, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1) });
}

function drawSummaryRow(
  page: any,
  regular: any,
  bold: any,
  x: number,
  y: number,
  label: string,
  value: string,
): void {
  page.drawText(label, { x, y, size: 9, font: regular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(value, {
    x: 570 - bold.widthOfTextAtSize(value, 9),
    y, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
}
