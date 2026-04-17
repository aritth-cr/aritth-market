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
      scrapingStatus: scrapingStatus.map((j: any) => ({
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
  }, async (request, _reply) => {
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
        ...(body.creditLimit !== undefined ? { creditLimit: body.creditLimit } : {}),
        ...(body.creditTermsDays !== undefined ? { creditTermsDays: body.creditTermsDays } : {}),
        ...(body.rejectionReason ? { rejectionReason: body.rejectionReason } : {}),
        ...(body.status === 'ACTIVE' ? {
          approvedAt: new Date(),
          approvedBy: user.id,
        } : {}),
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
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes?: string };
    const user = (request as any).aritthUser;

    const invoice = await prisma.invoice.update({
      where: { id, status: 'PENDING_REVIEW' },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        ...(notes !== undefined ? { reviewNotes: notes } : {}),
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

    return stores.map((s: any) => ({
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
    preHandler: [requireAritth],
  }, async () => {
    return {
      defaultMargin: Number(process.env['DEFAULT_MARGIN'] ?? 0.10),
      ivaRate: Number(process.env['IVA_RATE'] ?? 0.13),
    };
  });

  // =============================================
  // FASE 5 ADMIN ENDPOINTS
  // =============================================

  // ---- SUPPLIERS (ADMIN) ----

  // GET /api/admin/suppliers — List suppliers with filters
  app.get('/suppliers', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { search, page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { internalCode: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: { verifications: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  });

  // GET /api/admin/suppliers/:id — Get supplier details
  app.get('/suppliers/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { verifications: true, pricingModels: true, landedCosts: true },
    });
    if (!supplier) return (request as any).server.httpErrors.notFound('Supplier not found');
    return supplier;
  });

  // POST /api/admin/suppliers/:id/verify — Verify supplier
  app.post('/suppliers/:id/verify', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { type, evidence, notes } = request.body as any;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return (request as any).server.httpErrors.notFound('Supplier not found');

    const verification = await prisma.supplierVerification.upsert({
      where: { supplierId_type: { supplierId: id, type } },
      create: {
        supplierId: id,
        type,
        evidence,
        notes,
        status: 'SUBMITTED',
      },
      update: {
        evidence,
        notes,
        status: 'SUBMITTED',
      },
    });

    return verification;
  });

  // POST /api/admin/suppliers/:id/approve — Approve supplier
  app.post('/suppliers/:id/approve', {
    preHandler: [requireAritth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).aritthUser;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return (request as any).server.httpErrors.notFound('Supplier not found');

    // Mark all verifications as verified
    await prisma.supplierVerification.updateMany({
      where: { supplierId: id },
      data: {
        status: 'VERIFIED',
        verifiedBy: user?.id,
        verifiedAt: new Date(),
      },
    });

    // Update supplier status
    const updated = await prisma.supplier.update({
      where: { id },
      data: { verifiedBadge: true, isActive: true },
      include: { verifications: true },
    });

    reply.status(200);
    return updated;
  });

  // ---- PRODUCTS MASTER (ADMIN) ----

  // GET /api/admin/products/master — List product master records
  app.get('/products/master', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { search, page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(search && {
        OR: [
          { canonicalName: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.productMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.productMaster.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  });

  // GET /api/admin/products/master/:id — Get product master details
  app.get('/products/master/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const product = await prisma.productMaster.findUnique({
      where: { id },
      include: { pricingModels: true, landedCosts: true },
    });
    if (!product) return (request as any).server.httpErrors.notFound('Product not found');
    return product;
  });

  // POST /api/admin/products/master — Create product master
  app.post('/products/master', {
    preHandler: [requireAritth],
  }, async (request, reply) => {
    const { canonicalName, sku, manufacturerName, category, imageUrls } = request.body as any;

    const product = await prisma.productMaster.create({
      data: {
        canonicalName,
        normalizedName: canonicalName.toLowerCase().replace(/\s+/g, '-'),
        sku,
        manufacturerName,
        category,
        imageUrls: imageUrls || [],
      },
    });

    reply.status(201);
    return product;
  });

  // PUT /api/admin/products/master/:id — Update product master
  app.put('/products/master/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { canonicalName, manufacturerName, category, imageUrls } = request.body as any;

    const product = await prisma.productMaster.update({
      where: { id },
      data: {
        ...(canonicalName && { canonicalName, normalizedName: canonicalName.toLowerCase().replace(/\s+/g, '-') }),
        ...(manufacturerName !== undefined && { manufacturerName }),
        ...(category !== undefined && { category }),
        ...(imageUrls && { imageUrls }),
      },
    });

    return product;
  });

  // POST /api/admin/products/master/:id/publish — Publish product
  app.post('/products/master/:id/publish', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const product = await prisma.productMaster.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    return product;
  });

  // ---- PRODUCT DEDUPLICATION (ADMIN) ----

  // GET /api/admin/products/deduplication — List deduplication tasks
  app.get('/products/deduplication', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { status, page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(status && { status }),
    };

    const [dedups, total] = await Promise.all([
      prisma.productDeduplication.findMany({
        where,
        skip,
        take: limit,
        include: { product1: true, product2: true },
        orderBy: { similarity: 'desc' },
      }),
      prisma.productDeduplication.count({ where }),
    ]);

    return {
      data: dedups,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  });

  // GET /api/admin/products/deduplication/:id — Get dedup task details
  app.get('/products/deduplication/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const dedup = await prisma.productDeduplication.findUnique({
      where: { id },
      include: { product1: true, product2: true },
    });
    if (!dedup) return (request as any).server.httpErrors.notFound('Deduplication task not found');
    return dedup;
  });

  // POST /api/admin/products/deduplication/:id/resolve — Resolve deduplication
  app.post('/products/deduplication/:id/resolve', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { resolvedAs, notes } = request.body as any;
    const user = (request as any).aritthUser;

    const dedup = await prisma.productDeduplication.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAs,
        resolutionNotes: notes,
        reviewedBy: user?.id,
        reviewedAt: new Date(),
      },
      include: { product1: true, product2: true },
    });

    return dedup;
  });

  // ---- PRICING MODELS (ADMIN) ----

  // GET /api/admin/pricing/models — List pricing models
  app.get('/pricing/models', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    const [models, total] = await Promise.all([
      prisma.pricingModel.findMany({
        skip,
        take: limit,
        include: { productMaster: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pricingModel.count(),
    ]);

    return {
      data: models,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  });

  // GET /api/admin/pricing/models/:id — Get pricing model details
  app.get('/pricing/models/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const model = await prisma.pricingModel.findUnique({
      where: { id },
      include: { productMaster: true, supplier: true },
    });
    if (!model) return (request as any).server.httpErrors.notFound('Pricing model not found');
    return model;
  });

  // POST /api/admin/pricing/models — Create pricing model
  app.post('/pricing/models', {
    preHandler: [requireAritth],
  }, async (request, reply) => {
    const { productId, supplierId, baseCost, marginStrategy, marginValue, moq } = request.body as any;

    // Calculate selling price
    const baseCostNum = Number(baseCost);
    const marginValueNum = Number(marginValue);
    let sellingPrice = baseCostNum;
    if (marginStrategy === 'PERCENTAGE') {
      sellingPrice = baseCostNum * (1 + marginValueNum / 100);
    } else {
      sellingPrice = baseCostNum + marginValueNum;
    }

    const model = await prisma.pricingModel.create({
      data: {
        productId,
        supplierId,
        baseCost: baseCostNum,
        marginStrategy,
        marginValue: marginValueNum,
        sellingPrice,
        moq: moq || 1,
      },
      include: { productMaster: true, supplier: true },
    });

    reply.status(201);
    return model;
  });

  // PUT /api/admin/pricing/models/:id — Update pricing model
  app.put('/pricing/models/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { baseCost, marginStrategy, marginValue, moq } = request.body as any;

    const baseCostNum = baseCost ? Number(baseCost) : undefined;
    const marginValueNum = marginValue ? Number(marginValue) : undefined;

    let sellingPrice: number | undefined;
    if (baseCostNum !== undefined && marginValueNum !== undefined) {
      if (marginStrategy === 'PERCENTAGE') {
        sellingPrice = baseCostNum * (1 + marginValueNum / 100);
      } else {
        sellingPrice = baseCostNum + marginValueNum;
      }
    }

    const model = await prisma.pricingModel.update({
      where: { id },
      data: {
        ...(baseCostNum !== undefined && { baseCost: baseCostNum }),
        ...(marginStrategy && { marginStrategy }),
        ...(marginValueNum !== undefined && { marginValue: marginValueNum }),
        ...(sellingPrice !== undefined && { sellingPrice }),
        ...(moq !== undefined && { moq }),
      },
      include: { productMaster: true, supplier: true },
    });

    return model;
  });

  // ---- LANDED COSTS (ADMIN) ----

  // GET /api/admin/pricing/landed-costs — List landed costs
  app.get('/pricing/landed-costs', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { page = 1, limit = 50 } = request.query as any;
    const skip = (page - 1) * limit;

    const [costs, total] = await Promise.all([
      prisma.landedCost.findMany({
        skip,
        take: limit,
        include: { productMaster: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.landedCost.count(),
    ]);

    return {
      data: costs,
      meta: { total, page, limit, hasMore: page * limit < total },
    };
  });

  // GET /api/admin/pricing/landed-costs/:id — Get landed cost details
  app.get('/pricing/landed-costs/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const cost = await prisma.landedCost.findUnique({
      where: { id },
      include: { productMaster: true, supplier: true },
    });
    if (!cost) return (request as any).server.httpErrors.notFound('Landed cost not found');
    return cost;
  });

  // POST /api/admin/pricing/landed-costs/calculate — Calculate landed cost
  app.post('/pricing/landed-costs/calculate', {
    preHandler: [requireAritth],
  }, async (request, reply) => {
    const {
      productId,
      supplierId,
      baseCost,
      freightCost,
      customsDuty,
      importTax,
      sourceCountry,
      destinationCountry,
      margin,
    } = request.body as any;

    const baseCostNum = Number(baseCost);
    const freightNum = Number(freightCost || 0);
    const dutyNum = Number(customsDuty || 0);
    const taxNum = Number(importTax || 0);

    const landedCost = baseCostNum + freightNum + dutyNum + taxNum;
    const marginNum = Number(margin || 0);
    const sellingPrice = landedCost * (1 + marginNum / 100);

    const cost = await prisma.landedCost.create({
      data: {
        productId,
        supplierId,
        baseCost: baseCostNum,
        freightCost: freightNum,
        customsDuty: dutyNum,
        importTax: taxNum,
        landedCost,
        sellingPrice,
        margin: marginNum,
        sourceCountry,
        destinationCountry,
      },
      include: { productMaster: true, supplier: true },
    });

    reply.status(201);
    return cost;
  });

  // ---- SUPPLIERS ADMIN CRUD ----

  // POST /api/admin/suppliers — Create a new supplier
  app.post('/suppliers', {
    preHandler: [requireAritth],
  }, async (request, reply) => {
    const {
      internalCode,
      displayName,
      name,
      legalName,
      type,
      sourceKind,
      countryCode,
      region,
      currency,
      websiteUrl,
      contactEmail,
      contactPhone,
      verifiedBadge,
      isManufacturerOfficial,
      isHiddenFromClient,
      notes,
      isActive,
      avgLeadTimeDays,
      avgShippingCost,
      avgDutiesRate,
    } = request.body as any;

    const supplier = await prisma.supplier.create({
      data: {
        internalCode,
        displayName,
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(type !== undefined && { type }),
        ...(sourceKind !== undefined && { sourceKind }),
        ...(countryCode !== undefined && { countryCode }),
        ...(region !== undefined && { region }),
        ...(currency !== undefined && { currency }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(verifiedBadge !== undefined && { verifiedBadge }),
        ...(isManufacturerOfficial !== undefined && { isManufacturerOfficial }),
        ...(isHiddenFromClient !== undefined && { isHiddenFromClient }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        ...(avgLeadTimeDays !== undefined && { avgLeadTimeDays }),
        ...(avgShippingCost !== undefined && { avgShippingCost }),
        ...(avgDutiesRate !== undefined && { avgDutiesRate }),
      },
    });

    reply.status(201);
    return supplier;
  });

  // PUT /api/admin/suppliers/:id — Update a supplier
  app.put('/suppliers/:id', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const {
      displayName,
      name,
      legalName,
      type,
      sourceKind,
      countryCode,
      region,
      currency,
      websiteUrl,
      contactEmail,
      contactPhone,
      verifiedBadge,
      isManufacturerOfficial,
      isHiddenFromClient,
      notes,
      isActive,
      avgLeadTimeDays,
      avgShippingCost,
      avgDutiesRate,
    } = request.body as any;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(type !== undefined && { type }),
        ...(sourceKind !== undefined && { sourceKind }),
        ...(countryCode !== undefined && { countryCode }),
        ...(region !== undefined && { region }),
        ...(currency !== undefined && { currency }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(verifiedBadge !== undefined && { verifiedBadge }),
        ...(isManufacturerOfficial !== undefined && { isManufacturerOfficial }),
        ...(isHiddenFromClient !== undefined && { isHiddenFromClient }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        ...(avgLeadTimeDays !== undefined && { avgLeadTimeDays }),
        ...(avgShippingCost !== undefined && { avgShippingCost }),
        ...(avgDutiesRate !== undefined && { avgDutiesRate }),
      },
      include: { verifications: true },
    });

    return supplier;
  });

  // POST /api/admin/products/deduplication/:id/review — Admin review of dedup task
  app.post('/products/deduplication/:id/review', {
    preHandler: [requireAritth],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { action, masterProductId, notes } = request.body as any;
    const user = (request as any).aritthUser;

    // action: 'MERGE' | 'KEEP_BOTH' | 'REJECT'
    const dedup = await prisma.productDeduplication.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        resolvedAs: action,
        resolutionNotes: notes,
        reviewedBy: user?.id,
        reviewedAt: new Date(),
        ...(masterProductId && { masterProductId }),
      },
      include: { product1: true, product2: true },
    });

    return dedup;
  });
}