// promotions/routes.ts
import type { FastifyInstance } from 'fastify';
import { promotionsService } from './service.js';
import { requireAritth, requireClient } from '../../plugins/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createBodySchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

const updateBodySchema = createBodySchema.partial();

const validateBodySchema = z.object({
  code: z.string(),
  orderAmount: z.number().positive(),
});

export async function promotionRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/promotions — aritth only
  app.get('/', { preHandler: [requireAritth] }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return promotionsService.list(query as any);
  });

  // GET /api/promotions/:id — aritth only
  app.get('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    return promotionsService.getById(id);
  });

  // POST /api/promotions/validate — clients can validate promo codes
  app.post('/validate', { preHandler: [requireClient] }, async (request) => {
    const body = validateBodySchema.parse(request.body);
    return promotionsService.validate(body.code, body.orderAmount);
  });

  // POST /api/promotions — aritth only
  app.post('/', { preHandler: [requireAritth] }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const promo = await promotionsService.create(body as any);
    reply.status(201);
    return promo;
  });

  // PATCH /api/promotions/:id
  app.patch('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    const body = updateBodySchema.parse(request.body);
    return promotionsService.update(id, body as any);
  });

  // DELETE /api/promotions/:id — soft delete
  app.delete('/:id', { preHandler: [requireAritth] }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    await promotionsService.deactivate(id);
    reply.status(204);
    return;
  });
}
