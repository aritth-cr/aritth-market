// suppliers/routes.ts
import type { FastifyInstance } from 'fastify';
import { suppliersService } from './service.js';
import { requireAritth } from '../../plugins/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'IMPORTER', 'RETAILER', 'MARKETPLACE']).optional(),
  countryCode: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  verifiedBadge: z.coerce.boolean().optional(),
  isManufacturerOfficial: z.coerce.boolean().optional(),
  isHiddenFromClient: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createBodySchema = z.object({
  internalCode: z.string().min(2).max(50),
  displayName: z.string().min(1).max(200),
  name: z.string().optional(),
  legalName: z.string().optional(),
  type: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'IMPORTER', 'RETAILER', 'MARKETPLACE']).optional(),
  sourceKind: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  region: z.string().optional(),
  currency: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  verifiedBadge: z.boolean().optional(),
  isManufacturerOfficial: z.boolean().optional(),
  isHiddenFromClient: z.boolean().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  avgLeadTimeDays: z.number().int().min(0).optional(),
  avgShippingCost: z.number().min(0).optional(),
  avgDutiesRate: z.number().min(0).max(1).optional(),
});

const updateBodySchema = createBodySchema.partial().omit({ internalCode: true });

export async function supplierRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/suppliers — list with filters (aritth only)
  app.get('/', { preHandler: [requireAritth] }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return suppliersService.list(query as any);
  });

  // GET /api/suppliers/:id
  app.get('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    return suppliersService.getById(id);
  });

  // POST /api/suppliers
  app.post('/', { preHandler: [requireAritth] }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const supplier = await suppliersService.create(body as any);
    reply.status(201);
    return supplier;
  });

  // PATCH /api/suppliers/:id
  app.patch('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    const body = updateBodySchema.parse(request.body);
    return suppliersService.update(id, body as any);
  });

  // DELETE /api/suppliers/:id — soft delete (deactivate)
  app.delete('/:id', { preHandler: [requireAritth] }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    await suppliersService.deactivate(id);
    reply.status(204);
    return;
  });
}
