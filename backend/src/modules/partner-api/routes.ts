// ====================================================
// PARTNER API — Public-facing routes under /api/v1
// ====================================================

import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { env } from '../../config/env.js';
import { partnerApiAuth } from './auth.js';
import {
  toPublicProduct,
  toPublicOffer,
  toPublicDocument,
  type QuoteInput,
} from './contracts.js';

function generateDocNumber(prefix: string, seq: number): string {
  const year = new Date().getFullYear();
  const padded = String(seq).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

export async function partnerApiRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------------
  // GET /api/v1/products
  // List all published products (paginated)
  // ----------------------------------------------------------------
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      category?: string;
      inStock?: string;
      q?: string;
    };
  }>(
    '/products',
    { preHandler: [partnerApiAuth()] },
    async (request, reply) => {
      const { page: rawPage, limit: rawLimit, category, inStock, q } = request.query;

      const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? '20', 10) || 20));
      const skip = (page - 1) * limit;

      const where: any = {
        isPublished: true,
        isActive: true,
      };

      if (category) where.category = category;
      if (inStock === 'true') where.inStock = true;
      if (inStock === 'false') where.inStock = false;
      if (q) {
        where.OR = [
          { canonicalName: { contains: q, mode: 'insensitive' } },
          { normalizedName: { contains: q, mode: 'insensitive' } },
          { manufacturerName: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      return reply.send({
        data: products.map(toPublicProduct),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      });
    }
  );

  // ----------------------------------------------------------------
  // GET /api/v1/products/:id/offers
  // Get active supplier offers for a product
  // ----------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    '/products/:id/offers',
    { preHandler: [partnerApiAuth()] },
    async (request, reply) => {
      const { id } = request.params;

      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, isPublished: true, isActive: true },
      });

      if (!product || !product.isPublished || !product.isActive) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      const offers = await prisma.supplierOffer.findMany({
        where: {
          productId: id,
          isActive: true,
        },
        include: {
          supplier: {
            select: {
              id: true,
              displayName: true,
              isHiddenFromClient: true,
              isManufacturerOfficial: true,
              verifiedBadge: true,
            },
          },
        },
        orderBy: [{ isManufacturerOffer: 'desc' }, { costPrice: 'asc' }],
      });

      return reply.send({
        productId: id,
        data: offers.map(toPublicOffer),
      });
    }
  );

  // ----------------------------------------------------------------
  // GET /api/v1/products/:id/documents
  // Get public technical documents for a product
  // ----------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    '/products/:id/documents',
    { preHandler: [partnerApiAuth()] },
    async (request, reply) => {
      const { id } = request.params;

      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, isPublished: true, isActive: true },
      });

      if (!product || !product.isPublished || !product.isActive) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      const documents = await prisma.technicalDocument.findMany({
        where: {
          productId: id,
          isActive: true,
          visibility: 'PUBLIC',
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        productId: id,
        data: documents.map(toPublicDocument),
      });
    }
  );

  // ----------------------------------------------------------------
  // POST /api/v1/quotes
  // Create a quote for the partner's company
  // ----------------------------------------------------------------
  app.post<{ Body: QuoteInput }>(
    '/quotes',
    { preHandler: [partnerApiAuth()] },
    async (request, reply) => {
      const context = (request as any).partnerApiContext;
      const body = request.body as QuoteInput;

      if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'items array is required and must not be empty',
        });
      }

      // Resolve products and compute line items
      const ivaRate = context.isZonaFranca ? 0 : env.IVA_RATE;

      const quoteItemsData: any[] = [];
      let subtotal = 0;
      let ivaAmount = 0;

      for (const item of body.items) {
        if (!item.productId || !item.quantity || item.quantity < 1) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'VALIDATION_ERROR',
            message: 'Each item must have a valid productId and quantity >= 1',
          });
        }

        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isPublished || !product.isActive) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'NOT_FOUND',
            message: `Product ${item.productId} not found or not available`,
          });
        }

        // Prefer supplier offer price if provided and valid
        let unitPrice = Number(product.storePrice);
        let supplierOfferId: string | null = null;

        if (item.supplierOfferId) {
          const offer = await prisma.supplierOffer.findUnique({
            where: { id: item.supplierOfferId },
          });
          if (offer && offer.productId === item.productId && offer.isActive) {
            unitPrice = Number(offer.costPrice);
            supplierOfferId = offer.id;
          }
        }

        const lineIva = unitPrice * ivaRate * item.quantity;
        const lineSubtotal = unitPrice * item.quantity;
        const lineTotal = lineSubtotal + lineIva;

        subtotal += lineSubtotal;
        ivaAmount += lineIva;

        quoteItemsData.push({
          productId: item.productId,
          supplierOfferId,
          quantity: item.quantity,
          unit: product.unit,
          storePrice: product.storePrice,
          aritthCost: product.storePrice,
          unitPrice,
          ivaRate,
          ivaAmount: lineIva,
          lineTotal,
          productName: product.canonicalName ?? product.name,
          productSku: product.sku ?? null,
          imageUrl: product.imageUrl ?? null,
        });
      }

      const total = subtotal + ivaAmount;
      const seq = (await prisma.quote.count()) + 1;
      const quoteNumber = generateDocNumber('AMT-COT', seq);

      // Resolve a user ID for the company (use system/partner placeholder)
      const companyUser = await prisma.user.findFirst({
        where: { companyId: context.companyId },
        select: { id: true },
      });

      if (!companyUser) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'INVALID_OPERATION',
          message: 'No user found for partner company',
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const created = await prisma.quote.create({
        data: {
          number: quoteNumber,
          companyId: context.companyId,
          userId: companyUser.id,
          status: 'DRAFT',
          subtotal,
          ivaAmount,
          shipping: 0,
          total,
          notes: body.notes ?? null,
          expiresAt,
          items: {
            create: quoteItemsData,
          },
        },
        include: {
          items: { select: { id: true } },
        },
      });

      return reply.code(201).send({
        id: created.id,
        number: created.number,
        status: created.status,
        subtotal,
        tax: ivaAmount,
        total,
        itemCount: created.items?.length ?? 0,
      });
    }
  );
}
