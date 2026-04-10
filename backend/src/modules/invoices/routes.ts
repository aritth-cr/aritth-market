import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient, requireAritth } from '../../plugins/auth.js';
import { z } from 'zod';

const invoiceQuerySchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminListSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  companyId: z.string().optional(),
  overdue: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createInvoiceSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  dueDate: z.string().datetime().or(z.date()),
  notes: z.string().optional(),
});

const reviewInvoiceSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
  gtiCode: z.string().optional(),
});

const paymentSchema = z.object({
  paidAt: z.string().datetime().or(z.date()).optional(),
});

const noteSchema = z.object({
  content: z.string().min(1, 'content is required'),
});

function generateInvoiceNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `AMT-FAC-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextInvoiceSeq(): Promise<number> {
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('invoice_seq')`;
  return Number(result[0]?.nextval ?? 1);
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export async function invoicesRoutes(app: FastifyInstance) {
  /**
   * CLIENT ROUTES
   */

  /**
   * GET /api/invoices
   * List invoices for the authenticated client's company
   */
  app.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/api/invoices',
    { onRequest: [requireClient] },
    async (request, reply) => {
      const clientUser = (request as any).clientUser;
      const query = invoiceQuerySchema.parse(request.query);

      const where = {
        companyId: clientUser.companyId,
        ...(query.status && { status: query.status }),
      };

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                number: true,
                total: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      const totalPages = Math.ceil(total / query.limit);

      const response: PaginatedResponse<any> = {
        data: invoices,
        total,
        page: query.page,
        totalPages,
      };

      return reply.send(response);
    }
  );

  /**
   * GET /api/invoices/:id
   * Get a specific invoice with full details
   */
  app.get<{ Params: { id: string } }>(
    '/api/invoices/:id',
    { onRequest: [requireClient] },
    async (request, reply) => {
      const clientUser = (request as any).clientUser;
      const { id } = request.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              quote: {
                include: {
                  items: true,
                },
              },
            },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      if (invoice.companyId !== clientUser.companyId) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      return reply.send(invoice);
    }
  );

  /**
   * GET /api/invoices/:id/pdf
   * Get the PDF URL for an invoice
   */
  app.get<{ Params: { id: string } }>(
    '/api/invoices/:id/pdf',
    { onRequest: [requireClient] },
    async (request, reply) => {
      const clientUser = (request as any).clientUser;
      const { id } = request.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        select: { id: true, companyId: true, pdfUrl: true },
      });

      if (!invoice) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      if (invoice.companyId !== clientUser.companyId) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      if (!invoice.pdfUrl) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'PDF not available for this invoice',
        });
      }

      return reply.send({ pdfUrl: invoice.pdfUrl });
    }
  );

  /**
   * ADMIN ROUTES
   */

  /**
   * POST /api/invoices/admin
   * Create a new invoice from an order
   */
  app.post<{ Body: any }>(
    '/api/invoices/admin',
    { onRequest: [requireAritth] },
    async (request, reply) => {

      let body;
      try {
        body = createInvoiceSchema.parse(request.body);
      } catch (error) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: body.orderId },
        include: {
          quote: true,
          invoice: {
            select: { id: true },
          },
        },
      });

      if (!order) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      if (order.invoice) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'INVALID_OPERATION',
          message: 'Order already has an associated invoice',
        });
      }

      const seq = await nextInvoiceSeq();
      const invoiceNumber = generateInvoiceNumber(seq);

      const dueDate = new Date(body.dueDate);

      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          companyId: order.companyId,
          orderId: order.id,
          status: 'PENDING_REVIEW',
          subtotal: order.quote.subtotal,
          ivaAmount: order.quote.ivaAmount,
          total: order.quote.total,
          dueDate,
          ...(body.notes && { reviewNotes: body.notes }),
        },
        include: {
          order: {
            include: {
              quote: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });

      return reply.code(201).send(invoice);
    }
  );

  /**
   * GET /api/invoices/admin/list
   * List all invoices with admin filters
   */
  app.get<{ Querystring: any }>(
    '/api/invoices/admin/list',
    { onRequest: [requireAritth] },
    async (request, reply) => {
      const query = adminListSchema.parse(request.query);

      const now = new Date();

      const where: any = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.companyId) {
        where.companyId = query.companyId;
      }

      if (query.overdue) {
        where.AND = [
          { dueDate: { lt: now } },
          {
            status: {
              notIn: ['PAID', 'CANCELLED'],
            },
          },
        ];
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                number: true,
                total: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      const totalPages = Math.ceil(total / query.limit);

      const response: PaginatedResponse<any> = {
        data: invoices,
        total,
        page: query.page,
        totalPages,
      };

      return reply.send(response);
    }
  );

  /**
   * PATCH /api/invoices/admin/:id/review
   * Review (approve/reject) an invoice
   */
  app.patch<{ Params: { id: string }; Body: any }>(
    '/api/invoices/admin/:id/review',
    { onRequest: [requireAritth] },
    async (request, reply) => {
      const aritthUser = (request as any).aritthUser;
      const { id } = request.params;

      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'INVOICE_REVIEWER'];
      if (!allowedRoles.includes(aritthUser.role)) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'FORBIDDEN',
          message: 'You do not have permission to review invoices',
        });
      }

      let body;
      try {
        body = reviewInvoiceSchema.parse(request.body);
      } catch (error) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      if (invoice.status !== 'PENDING_REVIEW') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'INVALID_OPERATION',
          message: 'Only invoices in PENDING_REVIEW status can be reviewed',
        });
      }

      const now = new Date();

      if (body.action === 'approve') {
        const updated = await prisma.invoice.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedBy: aritthUser.id,
            reviewedAt: now,
            gtiCode: body.gtiCode,
          },
          include: {
            order: {
              include: {
                quote: {
                  include: {
                    items: true,
                  },
                },
              },
            },
          },
        });

        return reply.send(updated);
      }

      if (body.action === 'reject') {
        const updated = await prisma.invoice.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            reviewedBy: aritthUser.id,
            reviewedAt: now,
            reviewNotes: body.reviewNotes,
          },
          include: {
            order: {
              include: {
                quote: {
                  include: {
                    items: true,
                  },
                },
              },
            },
          },
        });

        return reply.send(updated);
      }
    }
  );

  /**
   * PATCH /api/invoices/admin/:id/send
   * Mark an invoice as sent to the client
   */
  app.patch<{ Params: { id: string } }>(
    '/api/invoices/admin/:id/send',
    { onRequest: [requireAritth] },
    async (request, reply) => {
      const { id } = request.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      if (invoice.status !== 'APPROVED') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'INVALID_OPERATION',
          message: 'Only APPROVED invoices can be sent',
        });
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
        },
        include: {
          order: {
            include: {
              quote: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });

      return reply.send(updated);
    }
  );

  /**
   * PATCH /api/invoices/admin/:id/payment
   * Register a payment for an invoice
   */
  app.patch<{ Params: { id: string }; Body: any }>(
    '/api/invoices/admin/:id/payment',
    { onRequest: [requireAritth] },
    async (request, reply) => {
      const { id } = request.params;

      let body;
      try {
        body = paymentSchema.parse(request.body);
      } catch (error) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      const validStatuses = ['SENT', 'OVERDUE'];
      if (!validStatuses.includes(invoice.status)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'INVALID_OPERATION',
          message: 'Only SENT or OVERDUE invoices can be marked as paid',
        });
      }

      const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt,
        },
        include: {
          order: {
            include: {
              quote: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      });

      return reply.send(updated);
    }
  );

  /**
   * POST /api/invoices/admin/:id/notes
   * Add an internal note to an invoice
   */
  app.post<{ Params: { id: string }; Body: any }>(
    '/api/invoices/admin/:id/notes',
    { onRequest: [requireAritth] },
    async (request, reply) => {
      const aritthUser = (request as any).aritthUser;
      const { id } = request.params;

      let body;
      try {
        body = noteSchema.parse(request.body);
      } catch (_error) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
        });
      }

      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) {
        return reply.code(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Factura no encontrada' });
      }

      const note = await prisma.internalNote.create({
        data: {
          invoiceId: id,
          authorId: aritthUser.id,
          content: body.content,
        },
      });

      return reply.send(note);
    },
  );
}
