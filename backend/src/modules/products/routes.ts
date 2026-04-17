import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient } from '../../plugins/auth.js';
import { calculateProductPrice } from '../pricing/calculator.js';
import { searchProducts, getSearchSuggestions } from '../search/service.js';
import { z } from 'zod';

const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  availableToday: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'name', 'newest']).optional().default('name'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
});

export async function productRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/products - Catálogo con filtros (visible a clientes)
  app.get('/', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const query = productQuerySchema.parse(request.query);
    const user = (request as any).clientUser;
    const isExempt: boolean = user.company.isExempt;

    // FASE 4: motor de búsqueda agrupado por producto
    const searchText =
      typeof (request.query as any).q === 'string'
        ? String((request.query as any).q).trim()
        : typeof (request.query as any).search === 'string'
          ? String((request.query as any).search).trim()
          : '';

    if (searchText) {
      const grouped = await searchProducts({
        query: searchText,
        languageCode:
          typeof (request.query as any).lang === 'string'
            ? String((request.query as any).lang)
            : 'es',
        onlyNational:
          (request.query as any).onlyNational === 'true' ||
          (request.query as any).onlyNational === true,
        onlyInternational:
          (request.query as any).onlyInternational === 'true' ||
          (request.query as any).onlyInternational === true,
        pageSize:
          typeof (request.query as any).limit === 'string'
            ? Number.parseInt(String((request.query as any).limit), 10)
            : 20,
      });
      return reply.send({ mode: 'grouped-search', ...grouped });
    }

    // Filtro de "Disponible Hoy" — basado en horarios de tiendas
    let storeIdsAvailableToday: string[] | undefined;
    if (query.availableToday) {
      const now = new Date();
      const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
      const currentDay = dayNames[now.getDay()]!;
      const currentHour = now.getHours();

      const stores = await prisma.sourceStore.findMany({
        where: {
          isActive: true,
          operatingDays: { has: currentDay },
          openingHour: { lte: currentHour },
          closingHour: { gte: currentHour + 1 },
        },
        select: { id: true },
      });

      storeIdsAvailableToday = stores.map((s: { id: string }) => s.id);
      if (storeIdsAvailableToday!.length === 0) {
        return { data: [], meta: { total: 0, page: query.page, limit: query.limit, hasMore: false } };
      }
    }

    // Construir filtro Prisma
    const where: any = {
      isActive: true,
      ...(query.category && { category: { contains: query.category, mode: 'insensitive' } }),
      ...(query.inStock !== undefined && { inStock: query.inStock }),
      ...(storeIdsAvailableToday && { storeId: { in: storeIdsAvailableToday } }),
      ...(query.minPrice !== undefined && { storePrice: { gte: query.minPrice } }),
      ...(query.maxPrice !== undefined && { storePrice: { lte: query.maxPrice } }),
      // NOTA: NO incluir filtro por storeId — privado, solo back-office
    };

    const orderBy: any = {
      price_asc: { storePrice: 'asc' },
      price_desc: { storePrice: 'desc' },
      name: { name: 'asc' },
      newest: { createdAt: 'desc' },
    }[query.sortBy];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          name: true,
          description: true,
          brand: true,
          sku: true,
          category: true,
          subcategory: true,
          unit: true,
          storePrice: true,
          inStock: true,
          imageUrl: true,
          // storeId: NO se incluye en respuesta a clientes
          store: {
            select: {
              operatingDays: true,
              openingHour: true,
              closingHour: true,
              // name: NO se incluye — privado
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const now = new Date();
    const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const currentDay = dayNames[now.getDay()]!;
    const currentHour = now.getHours();

    const data = products.map((p: any) => {
      const price = Number(p.storePrice);
      const pricing = calculateProductPrice(price, isExempt);

      // Estimado de entrega (sin revelar la tienda fuente)
      const storeOpen = p.store.operatingDays.includes(currentDay) &&
        currentHour >= p.store.openingHour &&
        currentHour < p.store.closingHour - 1;

      let deliveryEstimate: string;
      if (!p.inStock) {
        deliveryEstimate = 'Sin stock';
      } else if (storeOpen) {
        deliveryEstimate = 'Hoy';
      } else {
        // Calcular próximo día hábil
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = dayNames[tomorrow.getDay()]!;
        deliveryEstimate = p.store.operatingDays.includes(tomorrowDay)
          ? 'Mañana'
          : '2-3 días hábiles';
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        brand: p.brand,
        sku: p.sku,
        category: p.category,
        subcategory: p.subcategory,
        unit: p.unit,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
        pricing: {
          unitPrice: pricing.subtotalUnit,      // Precio sin IVA cliente
          unitTotal: pricing.unitTotal,          // Con IVA cliente
          ivaRate: pricing.clientIvaRate,
          ivaAmount: pricing.clientIva,
          isExempt: pricing.clientIvaRate === 0,
        },
        deliveryEstimate,
        // storeId y store.name: OMITIDOS intencionalmente
      };
    });

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasMore: query.page * query.limit < total,
      },
    };
  });

  // GET /api/products/categories - Lista de categorías disponibles
  app.get('/categories/list', {
    preHandler: [requireClient],
  }, async () => {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, inStock: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return categories.map((c: any) => ({
      name: c.category,
      count: c._count.id,
    }));
  });

  // GET /api/products/suggestions - Autocompletado
  app.get('/suggestions', {
    preHandler: [requireClient],
  }, async (request) => {
    const { q } = request.query as { q?: string };
    if (!q || q.length < 2) return { suggestions: [] };

    const suggestions = await getSearchSuggestions(q);
    return { suggestions };
  });

  // GET /api/products/:id - Detalle de producto
  app.get('/:id', {
    preHandler: [requireClient],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const user = (request as any).clientUser;
    const isExempt: boolean = user.company.isExempt;

    const product = await prisma.product.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        brand: true,
        sku: true,
        category: true,
        subcategory: true,
        unit: true,
        storePrice: true,
        inStock: true,
        imageUrl: true,
        externalUrl: true,
        store: {
          select: {
            operatingDays: true,
            openingHour: true,
            closingHour: true,
          },
        },
      },
    });

    if (!product) {
      return (request as any).server.httpErrors.notFound('Producto no encontrado');
    }

    const pricing = calculateProductPrice(Number(product.storePrice), isExempt);

    return {
      ...product,
      storePrice: undefined,   // No exponer precio de tienda
      externalUrl: undefined,  // No exponer URL de tienda fuente
      store: undefined,        // No exponer info de tienda
      pricing: {
        unitPrice: pricing.subtotalUnit,
        unitTotal: pricing.unitTotal,
        ivaRate: pricing.clientIvaRate,
        ivaAmount: pricing.clientIva,
        isExempt: pricing.clientIvaRate === 0,
      },
    };
  });

  // POST /api/products/:id/alert - Suscribir alerta de stock/precio
  app.post('/:id/alert', {
    preHandler: [requireClient],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { type, targetPrice } = request.body as { type: 'STOCK' | 'PRICE'; targetPrice?: number };
    const user = (request as any).clientUser;

    await prisma.stockAlert.upsert({
      where: {
        userId_productId_type: {
          userId: user.id,
          productId: id,
          type,
        },
      },
      create: {
        userId: user.id,
        productId: id,
        type,
        ...(targetPrice !== undefined ? { targetPrice } : {}),
      },
      update: {
        ...(targetPrice !== undefined ? { targetPrice } : {}),
        isActive: true,
      },
    });

    return { success: true };
  });
}
