import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient } from '../../plugins/auth.js';
import { calculateProductPrice, calculateQuoteTotals } from '../pricing/calculator.js';
import { generateQuotePDF } from './pdf.js';
import { saveFile } from '../../shared/utils/storage.js';
import { sendQuoteEmail, sendOrderConfirmationEmail } from '../../shared/utils/mailer.js';
import { getTodayRates } from '../exchange-rates/service.js';
import { z } from 'zod';

function generateDocNumber(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  const padded = String(seq).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

async function nextSequence(model: string): Promise<number> {
  // Usa una sequence para números únicos
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval('${model}_seq')
  `;
  return Number(result[0]?.nextval ?? 1);
}

const createQuoteSchema = z.object({
  cartId: z.string().cuid(),
  notes: z.string().max(500).optional(),
  deliveryAddressId: z.string().cuid().optional(),
  currency: z.enum(['CRC', 'USD', 'EUR']).optional().default('CRC'),
});

export async function quoteRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/quotes — Crear cotización desde carrito
  app.post('/', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const body = createQuoteSchema.parse(request.body);
    const user = (request as any).clientUser;
    const isExempt: boolean = user.company.isExempt;

    // Obtener carrito con productos
    const cart = await prisma.cart.findFirst({
      where: { id: body.cartId, userId: user.id, isActive: true },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                storePrice: true,
                inStock: true,
                imageUrl: true,
                store: {
                  select: { operatingDays: true, openingHour: true, closingHour: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) return reply.status(404).send({ error: 'Carrito no encontrado' });
    if (cart.items.length === 0) return reply.status(400).send({ error: 'El carrito está vacío' });

    // Verificar stock
    const outOfStock = cart.items.filter(i => !i.product.inStock);
    if (outOfStock.length > 0) {
      return reply.status(400).send({
        error: 'Algunos productos están sin stock',
        products: outOfStock.map(i => i.product.name),
      });
    }

    // Tipos de cambio
    const rates = await getTodayRates();

    // Calcular precios
    const itemsWithPricing = cart.items.map(item => {
      const pricing = calculateProductPrice(Number(item.product.storePrice), isExempt);
      return {
        productId: item.product.id,
        quantity: item.quantity,
        pricing,
        product: item.product,
      };
    });

    const totals = calculateQuoteTotals(
      itemsWithPricing,
      0, // Sin flete por ahora
      rates.usdRate,
      rates.eurRate,
    );

    // Obtener info de empresa
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: {
        name: true,
        legalName: true,
        cedula: true,
        type: true,
        address: true,
        phone: true,
        quoteEmail: true,
        invoiceEmail: true,
      },
    });

    // Número de cotización
    const seq = await prisma.quote.count() + 1;
    const quoteNumber = generateDocNumber('AMT-COT', seq);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Crear cotización en BD
    const quote = await prisma.quote.create({
      data: {
        number: quoteNumber,
        companyId: user.companyId,
        userId: user.id,
        status: 'DRAFT',
        subtotal: totals.subtotal,
        ivaAmount: totals.ivaAmount,
        shipping: totals.shipping,
        total: totals.total,
        totalUsd: totals.totalUsd,
        totalEur: totals.totalEur,
        exchangeRateUsd: rates.usdRate,
        exchangeRateEur: rates.eurRate,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        expiresAt,
        items: {
          create: itemsWithPricing.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.product.unit,
            storePrice: i.pricing.storePrice,
            aritthCost: i.pricing.aritthCost,
            unitPrice: i.pricing.subtotalUnit,
            ivaRate: i.pricing.clientIvaRate,
            ivaAmount: i.pricing.clientIva * i.quantity,
            lineTotal: i.pricing.unitTotal * i.quantity,
            productName: i.product.name,
            productSku: i.product.sku,
            imageUrl: i.product.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    // Generar PDF
    const pdfBuffer = await generateQuotePDF({
      quoteNumber,
      date: new Date(),
      expiresAt,
      company: {
        name: company.name,
        legalName: company.legalName,
        cedula: company.cedula,
        type: company.type,
        ...(company.address != null ? { address: company.address } : {}),
        ...(company.phone != null ? { phone: company.phone } : {}),
        ...((company.quoteEmail ?? company.invoiceEmail) != null
          ? { email: (company.quoteEmail ?? company.invoiceEmail)! }
          : {}),
      },
      items: itemsWithPricing.map(i => ({
        description: i.product.name,
        ...(i.product.sku != null ? { sku: i.product.sku } : {}),
        quantity: i.quantity,
        unit: i.product.unit,
        unitPrice: i.pricing.subtotalUnit,
        ivaRate: i.pricing.clientIvaRate,
        ivaAmount: i.pricing.clientIva,
        lineTotal: i.pricing.unitTotal * i.quantity,
      })),
      subtotal: totals.subtotal,
      ivaAmount: totals.ivaAmount,
      shipping: totals.shipping,
      total: totals.total,
      totalUsd: totals.totalUsd,
      exchangeRateUsd: rates.usdRate,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });

    // Guardar PDF
    const pdfUrl = await saveFile('quotes', `${quoteNumber}.pdf`, pdfBuffer);

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'SENT', pdfUrl },
    });

    // Enviar por email
    const recipients = [
      company.quoteEmail,
      company.invoiceEmail,
    ].filter(Boolean) as string[];

    if (recipients.length > 0) {
      await sendQuoteEmail({
        to: recipients,
        quoteNumber,
        companyName: company.name,
        total: totals.total,
        totalUsd: totals.totalUsd,
        expiresAt,
        pdfBuffer,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'QUOTE_CREATED',
        entity: 'Quote',
        entityId: quote.id,
        data: { quoteNumber, total: totals.total },
      },
    });

    // Desactivar carrito
    await prisma.cart.update({
      where: { id: body.cartId },
      data: { isActive: false },
    });

    return reply.status(201).send({
      id: quote.id,
      number: quoteNumber,
      total: totals.total,
      totalUsd: totals.totalUsd,
      pdfUrl,
      expiresAt,
      emailSent: recipients.length > 0,
    });
  });

  // GET /api/quotes — Historial de cotizaciones
  app.get('/', {
    preHandler: [requireClient],
  }, async (request) => {
    const user = (request as any).clientUser;
    const { page = '1', limit = '10', status } = request.query as Record<string, string>;

    const where: any = {
      companyId: user.companyId,
      ...(status && { status }),
    };

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          totalUsd: true,
          pdfUrl: true,
          expiresAt: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.quote.count({ where }),
    ]);

    return { data: quotes, meta: { total, page: Number(page), limit: Number(limit) } };
  });

  // GET /api/quotes/:id — Detalle de cotización
  app.get('/:id', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).clientUser;

    const quote = await prisma.quote.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            productSku: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            ivaRate: true,
            ivaAmount: true,
            lineTotal: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!quote) return reply.status(404).send({ error: 'Cotización no encontrada' });

    return quote;
  });

  // POST /api/quotes/:id/confirm — Confirmar con PO number → crea Orden
  app.post('/:id/confirm', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { poNumber } = request.body as { poNumber: string };
    const user = (request as any).clientUser;

    if (!poNumber?.trim()) {
      return reply.status(400).send({ error: 'Número de PO requerido' });
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        companyId: user.companyId,
        status: { in: ['SENT', 'DRAFT'] },
      },
    });

    if (!quote) return reply.status(404).send({ error: 'Cotización no encontrada o ya confirmada' });

    // Verificar que no ha expirado
    if (new Date() > quote.expiresAt) {
      return reply.status(400).send({ error: 'La cotización ha expirado' });
    }

    // Generar número de orden
    const orderSeq = await prisma.order.count() + 1;
    const orderNumber = generateDocNumber('AMT-ORD', orderSeq);

    // Crear orden
    const order = await prisma.order.create({
      data: {
        number: orderNumber,
        companyId: user.companyId,
        userId: user.id,
        quoteId: id,
        status: 'CONFIRMED',
        poNumber: poNumber.trim(),
        total: quote.total,
      },
    });

    // Marcar cotización como confirmada
    await prisma.quote.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    // Crear factura borrador (para revisión interna Aritth)
    const invoiceSeq = await prisma.invoice.count() + 1;
    const invoiceNumber = generateDocNumber('AMT-FAC', invoiceSeq);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + user.company.creditTermsDays || 30);

    await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        companyId: user.companyId,
        orderId: order.id,
        status: 'PENDING_REVIEW',
        subtotal: quote.subtotal,
        ivaAmount: quote.ivaAmount,
        total: quote.total,
        dueDate,
      },
    });

    // Email de confirmación
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { name: true, invoiceEmail: true, quoteEmail: true },
    });

    const recipients = [company.invoiceEmail, company.quoteEmail].filter(Boolean) as string[];
    if (recipients.length > 0) {
      await sendOrder