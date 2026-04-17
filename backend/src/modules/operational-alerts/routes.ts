// operational-alerts/routes.ts
import type { FastifyInstance } from 'fastify';
import { operationalAlertsService } from './service.js';
import { requireAritth } from '../../plugins/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  type: z.enum([
    'SCRAPING_FAILURE', 'PRICE_ANOMALY', 'STOCK_CRITICAL',
    'PAYMENT_OVERDUE', 'SYSTEM_ERROR', 'SUPPLIER_OFFLINE', 'RATE_LIMIT_HIT',
  ]).optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  isResolved: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createBodySchema = z.object({
  type: z.enum([
    'SCRAPING_FAILURE', 'PRICE_ANOMALY', 'STOCK_CRITICAL',
    'PAYMENT_OVERDUE', 'SYSTEM_ERROR', 'SUPPLIER_OFFLINE', 'RATE_LIMIT_HIT',
  ]),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  title: z.string().min(1).max(300),
  message: z.string().min(1),
  entity: z.string().optional(),
  entityId: z.string().optional(),
});

export async function operationalAlertRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/operational-alerts — aritth only
  app.get('/', { preHandler: [requireAritth] }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return operationalAlertsService.list(query as any);
  });

  // GET /api/operational-alerts/:id
  app.get('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    return operationalAlertsService.getById(id);
  });

  // POST /api/operational-alerts — create alert (internal / aritth)
  app.post('/', { preHandler: [requireAritth] }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const alert = await operationalAlertsService.create(body as any);
    reply.status(201);
    return alert;
  });

  // PATCH /api/operational-alerts/:id/resolve
  app.patch('/:id/resolve', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    const aritthUser = (request as any).aritthUser;
    return operationalAlertsService.resolve(id, aritthUser?.id ?? 'system');
  });

  // PATCH /api/operational-alerts/:id/unresolve
  app.patch('/:id/unresolve', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    return operationalAlertsService.unresolve(id);
  });
}
