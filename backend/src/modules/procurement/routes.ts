import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient } from '../../plugins/auth.js';

function parseIntParam(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getRequestContext(request: FastifyRequest) {
  const req = request as any;
  // Use authenticated clientUser set by requireClient preHandler
  const clientUser = req.clientUser;

  return {
    userId: clientUser?.id ?? null,
    companyId: clientUser?.companyId ?? null,
  };
}

export async function procurementRoutes(app: FastifyInstance) {
  // GET /api/procurement/requests — list procurement requests for the company
  app.get('/requests', {
    preHandler: [requireClient],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const { companyId } = getRequestContext(request);

    const page = parseIntParam(query['page'], 1);
    const pageSize = parseIntParam(query['pageSize'], 20);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (query['state']) where.state = query['state'];
    if (query['priority']) where.priority = query['priority'];

    const [requests, total] = await Promise.all([
      prisma.procurementRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.procurementRequest.count({ where }),
    ]);

    return reply.send({
      data: requests,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  });

  // POST /api/procurement/requests — create a new procurement request
  app.post('/requests', {
    preHandler: [requireClient],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { userId, companyId } = getRequestContext(request);

    if (!companyId) {
      return reply.code(400).send({ error: 'companyId is required' });
    }

    const {
      title,
      description,
      items,
      priority = 'NORMAL',
      estimatedAmount,
      currency,
      notes,
    } = body;

    if (!title) {
      return reply.code(400).send({ error: 'title is required' });
    }

    const procurement = await prisma.procurementRequest.create({
      data: {
        companyId,
        requestedBy: userId ?? 'unknown',
        title,
        description,
        items: items ?? [],
        priority,
        ...(estimatedAmount !== undefined && { estimatedAmount }),
        ...(currency && { currency }),
        ...(notes && { notes }),
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return reply.code(201).send(procurement);
  });
}
