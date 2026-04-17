// technical-documents/routes.ts
import type { FastifyInstance } from 'fastify';
import { technicalDocumentsService } from './service.js';
import { requireAritth, requireClient } from '../../plugins/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['DATASHEET', 'MANUAL', 'CERTIFICATE', 'SAFETY_SHEET', 'CATALOG', 'WARRANTY', 'OTHER']).optional(),
  visibility: z.enum(['PUBLIC', 'PARTNER', 'PRIVATE']).optional(),
  language: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createBodySchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(1).max(300),
  type: z.enum(['DATASHEET', 'MANUAL', 'CERTIFICATE', 'SAFETY_SHEET', 'CATALOG', 'WARRANTY', 'OTHER']).optional(),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  language: z.string().max(5).optional(),
  visibility: z.enum(['PUBLIC', 'PARTNER', 'PRIVATE']).optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = createBodySchema.partial();

export async function technicalDocumentRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/technical-documents — clients can see PUBLIC, aritth team sees all
  app.get('/', { preHandler: [requireClient] }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const isAritth = (request as any).aritthUser !== undefined;
    // Non-aritth users can only see PUBLIC documents
    const filters: any = { ...query };
    if (!isAritth) filters.visibility = 'PUBLIC';
    return technicalDocumentsService.list(filters);
  });

  // GET /api/technical-documents/:id
  app.get('/:id', { preHandler: [requireClient] }, async (request) => {
    const { id } = (request.params as { id: string });
    return technicalDocumentsService.getById(id);
  });

  // POST /api/technical-documents — aritth only
  app.post('/', { preHandler: [requireAritth] }, async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const aritthUser = (request as any).aritthUser;
    const doc = await technicalDocumentsService.create({ ...body, uploadedBy: aritthUser?.id } as any);
    reply.status(201);
    return doc;
  });

  // PATCH /api/technical-documents/:id
  app.patch('/:id', { preHandler: [requireAritth] }, async (request) => {
    const { id } = (request.params as { id: string });
    const body = updateBodySchema.parse(request.body);
    return technicalDocumentsService.update(id, body as any);
  });

  // DELETE /api/technical-documents/:id — soft delete
  app.delete('/:id', { preHandler: [requireAritth] }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    await technicalDocumentsService.deactivate(id);
    reply.status(204);
    return;
  });
}
