import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

function formatCRC(amount: number): string {
  return '₡' + amount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


interface QuoteEmailData {
  to: string[];
  quoteNumber: string;
  companyName: string;
  total: number;
  totalUsd: number | null;
  expiresAt: Date;
  pdfBuffer: Buffer;
}

interface OrderEmailData {
  to: string[];
  orderNumber: string;
  quoteNumber: string;
  companyName: string;
  poNumber: string;
  total: number;
}

/**
 * Envía cotización por email con PDF adjunto
 */
export async function sendQuoteEmail(data: QuoteEmailData): Promise<void> {
  const totalFormatted = formatCRC(data.total);
  const usdLine = data.totalUsd
    ? `<p style="color:#aaa;font-size:13px">Equivalente: $${data.totalUsd.toLocaleString('es-CR', { minimumFractionDigits: 2 })} USD</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#1a1a1a;padding:30px 40px;text-align:center">
      <h1 style="color:#5F6C4E;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px">ARITTH MARKET</h1>
      <p style="color:#888;margin:5px 0 0;font-size:13px">Automation, Robotics, Integration, Technology, Testing & Hub</p>
    </div>

    <!-- Body -->
    <div style="padding:40px">
      <h2 style="color:#1a1a1a;margin-top:0">Cotización ${data.quoteNumber}</h2>
      <p>Estimados,</p>
      <p>Adjunto encontrará la cotización <strong>${data.quoteNumber}</strong> para <strong>${data.companyName}</strong>.</p>

      <div style="background:#f8f8f8;border-left:4px solid #5F6C4E;padding:20px;margin:25px 0;border-radius:0 4px 4px 0">
        <p style="margin:0;font-size:18px;font-weight:bold;color:#1a1a1a">Total: ${totalFormatted}</p>
        ${usdLine}
        <p style="margin:8px 0 0;color:#666;font-size:13px">Válida hasta: ${data.expiresAt.toLocaleDateString('es-CR')}</p>
      </div>

      <div style="background:#1a1a1a;border-radius:8px;padding:20px;text-align:center;margin:25px 0">
        <p style="color:#fff;margin:0 0 5px;font-size:14px">Para confirmar su pedido, envíe su orden de compra (PO) a:</p>
        <p style="color:#5F6C4E;margin:0;font-size:18px;font-weight:bold">ventas@aritth.com</p>
        <p style="color:#888;margin:5px 0 0;font-size:12px">Indique el número de cotización en el asunto</p>
      </div>

      <p style="color:#666;font-size:13px">Si tiene alguna consulta, no dude en contactarnos.</p>
    </div>

    <!-- Footer -->
    <div style="background:#1a1a1a;padding:20px 40px;text-align:center">
      <p style="color:#666;margin:0;font-size:12px">ventas@aritth.com | aritth.com</p>
      <p style="color:#444;margin:5px 0 0;font-size:11px">Zona Franca | San José, Costa Rica</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: data.to.join(', '),
    cc: env.INTERNAL_EMAIL,
    subject: `Cotización ${data.quoteNumber} - Aritth Market`,
    html,
    attachments: [
      {
        filename: `${data.quoteNumber}.pdf`,
        content: data.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

/**
 * Envía confirmación de orden
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const totalFormatted = formatCRC(data.total);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1a1a1a;padding:30px 40px;text-align:center">
      <h1 style="color:#5F6C4E;margin:0;font-size:28px;letter-spacing:2px">ARITTH MARKET</h1>
    </div>
    <div style="padding:40px">
      <h2 style="color:#1a1a1a">✅ Orden Confirmada: ${data.orderNumber}</h2>
      <p>Hemos recibido su orden de compra <strong>${data.poNumber}</strong> para la cotización <strong>${data.quoteNumber}</strong>.</p>
      <div style="background:#f8f8f8;border-left:4px solid #5F6C4E;padding:20px;margin:25px 0;border-radius:0 4px 4px 0">
        <p style="margin:0"><strong>Orden:</strong> ${data.orderNumber}</p>
        <p style="margin:5px 0 0"><strong>PO del cliente:</strong> ${data.poNumber}</p>
        <p style="margin:5px 0 0"><strong>Total:</strong> ${totalFormatted}</p>
      </div>
      <p>Nuestro equipo procesará su orden y recibirá la factura a la brevedad.</p>
    </div>
    <div style="background:#1a1a1a;padding:20px;text-align:center">
      <p style="color:#666;margin:0;font-size:12px">ventas@aritth.com | aritth.com</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: data.to.join(', '),
    cc: env.INTERNAL_EMAIL,
    subject: `Orden Confirmada ${data.orderNumber} - Aritth Market`,
    html,
  });
}
