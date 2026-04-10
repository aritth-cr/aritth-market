import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireAritth, requireAritthRole } from '../../plugins/auth.js';
import { createScrapingJob, runScraping } from '../scraping/engine.js';
import { z } from 'zod';

export async function backOfficeRoutes(app: FastifyInstance): Promise<void> {

  // ---- DASHBOARD ----

  // GET /api/admin/dashboard — KPIs principales
  app.get('/dashboard', {
    preHandler: [requireAritth],
  }, async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      companiesActive,
      companiesPending,
      invoicesPendingReview,
      revenueThisMonth,
      revenueLastMonth,
      overdueInvoices,
      recentOrders,
      scrapingStatus,
    ] = await Promise.all([
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'PENDING_REVIEW' } }),

      prisma.invoice.aggregate({
        where: { status: 'SENT', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'SENT',
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: { status: 'SENT', dueDate: { lt: now } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          number: true, total: true, status: true, createdAt: true,
          company: { select: { name: true } },
        },
      }),
      prisma.scrapingJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { store: { select: { name: true } } },
      }),
    ]);

    const revenueThis = Number(revenueThisMonth._sum.total ?? 0);
    const revenueLast = Number(revenueLastMonth._sum.total ?? 0);

    return {
      kpis: {
        companiesActive,
        companiesPending,
        invoicesPendingReview,
        overdueInvoices,
        revenueThisMonth: revenueThis,
        revenueLastMonth: revenueLast,
        revenueGrowth: revenueLast > 0
          ? ((revenueThis - revenueLast) / revenueLast * 100).toFixed(1)
          : null,
      },
      recentOrders,
      scrapingStatus: scrapingStatus.map(j => ({
        store: j.store.name,
        status: j.status,
        productsFound: j.productsFound,
        completedAt: j.completedAt,
        createdAt: j.createdAt,
      })),
    };
  });

  // ---- EMPRESAS ----

  // GET /api/admin/companies — Lista de empresas con filtros
  app.get('/companies', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { status, page = '1', limit = '20' } = request.query as Record<string, string>;

    const where: any = status ? { status } : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          name: true,
          legalName: true,
          cedula: true,
          type: true,
          status: true,
          creditLimit: true,
          currentBalance: true,
          creditTermsDays: true,
          createdAt: true,
          approvedAt: true,
          _count: { select: { orders: true, invoices: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return { data: companies, meta: { total, page: Number(page), limit: Number(limit) } };
  });

  // PUT /api/admin/companies/:id — Aprobar / Rechazar empresa
  app.put('/companies/:id', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['ACTIVE', 'REJECTED', 'SUSPENDED']),
      creditLimit: z.number().min(0).optional(),
      creditTermsDays: z.number().int().min(0).optional(),
      rejectionReason: z.string().optional(),
    }).parse(request.body);

    const user = (request as any).aritthUser;

    const company = await prisma.company.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.creditLimit !== undefined && { creditLimit: body.creditLimit }),
        ...(body.creditTermsDays !== undefined && { creditTermsDays: body.creditTermsDays }),
        ...(body.rejectionReason && { rejectionReason: body.rejectionReason }),
        ...(body.status === 'ACTIVE' && {
          approvedAt: new Date(),
          approvedBy: user.id,
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `COMPANY_${body.status}`,
        entity: 'Company',
        entityId: id,
        data: { previousStatus: company.status, ...body },
      },
    });

    return { success: true, company };
  });

  // ---- FACTURAS ----

  // GET /api/admin/invoices/pending — Cola de revisión
  app.get('/invoices/pending', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN', 'INVOICE_REVIEWER', 'FINANCE'])],
  }, async () => {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
      include: {
        company: { select: { name: true, type: true } },
        order: {
          select: {
            number: true,
            poNumber: true,
            quote: {
              select: {
                number: true,
                items: {
                  select: {
                    productName: true,
                    quantity: true,
                    unit: true,
                    unitPrice: true,
                    lineTotal: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return { data: invoices };
  });

  // PUT /api/admin/invoices/:id/approve — Aprobar factura
  app.put('/invoices/:id/approve', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN', 'INVOICE_REVIEWER', 'FINANCE'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes?: string };
    const user = (request as any).aritthUser;

    const invoice = await prisma.invoice.update({
      where: { id, status: 'PENDING_REVIEW' },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    // Log
    await prisma.auditLog.create({
      data: {
        action: 'INVOICE_APPROVED',
        entity: 'Invoice',
        entityId: id,
      },
    });

    // TODO: Cuando GTI esté integrado, aquí se enviaría la factura electrónica
    // Por ahora la contadora la procesa manualmente

    return { success: true, invoiceNumber: invoice.number, status: invoice.status };
  });

  // ---- CUENTAS POR COBRAR ----

  // GET /api/admin/finance/receivables — Aging report
  app.get('/finance/receivables', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE'])],
  }, async () => {
    const now = new Date();

    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'OVERDUE'] } },
      include: {
        company: { select: { name: true, type: true, creditTermsDays: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Aging buckets
    const buckets = {
      current: [] as any[],
      days1_30: [] as any[],
      days31_60: [] as any[],
      days61_90: [] as any[],
      over90: [] as any[],
    };

    let totalCurrent = 0, total1_30 = 0, total31_60 = 0, total61_90 = 0, totalOver90 = 0;

    for (const inv of invoices) {
      const daysOverdue = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const total = Number(inv.total);

      const record = {
        id: inv.id,
        number: inv.number,
        company: inv.company.name,
        total,
        dueDate: inv.dueDate,
        daysOverdue,
      };

      if (daysOverdue <= 0) {
        buckets.current.push(record);
        totalCurrent += total;
      } else if (daysOverdue <= 30) {
        buckets.days1_30.push(record);
        total1_30 += total;
      } else if (daysOverdue <= 60) {
        buckets.days31_60.push(record);
        total31_60 += total;
      } else if (daysOverdue <= 90) {
        buckets.days61_90.push(record);
        total61_90 += total;
      } else {
        buckets.over90.push(record);
        totalOver90 += total;
      }
    }

    return {
      summary: {
        current: { count: buckets.current.length, total: totalCurrent },
        days1_30: { count: buckets.days1_30.length, total: total1_30 },
        days31_60: { count: buckets.days31_60.length, total: total31_60 },
        days61_90: { count: buckets.days61_90.length, total: total61_90 },
        over90: { count: buckets.over90.length, total: totalOver90 },
        grandTotal: totalCurrent + total1_30 + total31_60 + total61_90 + totalOver90,
      },
      buckets,
    };
  });

  // ---- SCRAPING ----

  // GET /api/admin/scraping/status
  app.get('/scraping/status', {
    preHandler: [requireAritth],
  }, async () => {
    const stores = await prisma.sourceStore.findMany({
      include: {
        _count: { select: { products: true } },
        scrapingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, productsFound: true, completedAt: true, errors: true },
        },
      },
    });

    return stores.map(s => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      totalProducts: s._count.products,
      lastScrapedAt: s.lastScrapedAt,
      lastJob: s.scrapingJobs[0] ?? null,
    }));
  });

  // POST /api/admin/scraping/:storeId/trigger — Disparar scraping manual
  app.post('/scraping/:storeId/trigger', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'])],
  }, async (request, reply) => {
    const { storeId } = request.params as { storeId: string };

    const store = await prisma.sourceStore.findUnique({ where: { id: storeId } });
    if (!store) return reply.status(404).send({ error: 'Tienda no encontrada' });

    const jobId = await createScrapingJob(storeId);

    // Ejecutar en background (no bloquear la respuesta)
    setImmediate(() => {
      runScraping(storeId, jobId).catch(err =>
        console.error(`[Scraping] Error en job ${jobId}:`, err),
      );
    });

    return reply.status(202).send({
      jobId,
      message: `Scraping de ${store.name} iniciado`,
    });
  });

  // ---- PRECIOS ----

  // GET /api/admin/pricing/margin — Ver margen actual
  app.get('/pricing/margin', {
    preHandler: [requireAritthRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE'])],
  }, async () => {
    return {
      currentMargin: Number(process.env['DEFAULT_MARGIN'] ?? 0.10) * 100,
      ivaRate: Number(process.env['IVA_RATE'] ?? 0.13) * 100,
      note: 'Para cambiar el margen, actualiza DEFAULT_MARGIN en el .env y reinicia el servidor',
    };
  });
}
