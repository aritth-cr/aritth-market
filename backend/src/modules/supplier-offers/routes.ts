// supplier-offers/routes.ts
import type { FastifyInstance } from 'fastify';
import { supplierOffersService } from './service.js';
import { requireAritth } from '../../plugins/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  supplierId: z.string().optional(),
  productId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  currency: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createBodySchema = z.object({
  supplierId: z.string(),
  productId: z.string().optional(),
  supplierSku: z.string().optional(),
  supplierName: z.string().min(1),
  costPrice: z.number().positive(),
  currency: z.string().optional(),
  minQuantity: z.number().int().min(1).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  landedCostUsd: z.number().positive().optional(),
  landedCostLocal: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = createBodySchema.partial().omit({ supplierId: true });

export async function supplierOfferRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/supplier-offers
  app.get('/', { preHandler: [requireAritth] }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return supplierOffersService.list(query as any);
  });

  // GET /api/supplier-offers/:id
  app.get('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    return supplierOffersService.getById(id);
  });

  // GET /api/supplier-offers/best/:productId
  app.get('/best/:productId', { preHandler: [requireAritth] }, async (request) => {
    const { productId } = (request.params as { productId: string });
    return supplierOffersService.getBestOfferForProduct(productId);
  });

  // POST /api/supplier-offers
  app.post('/', { preHandler: [requireAritth] }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const offer = await supplierOffersService.create(body as any);
    reply.status(201);
    return offer;
  });

  // PATCH /api/supplier-offers/:id
  app.patch('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    const body = updateBodySchema.parse(request.body);
    return supplierOffersService.update(id, body as any);
  });

  // DELETE /api/supplier-offers/:id — soft delete
  app.delete('/:id', { preHandler: [requireAritth] }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    await supplierOffersService.deactivate(id);
    reply.status(204);
    return;
  });
}
