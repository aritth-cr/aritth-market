import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { productRoutes } from './modules/products/routes.js';
import { quoteRoutes } from './modules/quotes/routes.js';
import { companyRoutes } from './modules/companies/routes.js';
import { backOfficeRoutes } from './modules/back-office/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { invoicesRoutes } from './modules/invoices/routes.js';
import { getOffersForHomepage } from './modules/scraping/offers.js';
import { clerkWebhookRoutes } from './modules/webhooks/clerk.js';
import { AppError } from './shared/errors/AppError.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // ---- SEGURIDAD ----
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
  });

  await app.register(cors, {
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Demasiadas solicitudes. Por favor espere un momento.',
    }),
  });

  // ---- AUTH ----
  await registerAuthPlugin(app);

  // ---- ARCHIVOS ESTÁTICOS (PDFs) ----
  await app.register(staticFiles, {
    root: join(process.cwd(), env.STORAGE_PATH),
    prefix: '/files/',
  });

  // ---- RUTAS PÚBLICAS ----

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    app: env.APP_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // Ofertas homepage (público — no requiere auth para SEO)
  app.get('/api/offers', async () => getOffersForHomepage());

  // Webhooks (públicos, sin auth)
  await app.register(async (webhooks) => {
    await webhooks.register(clerkWebhookRoutes, { prefix: '' });
  }, { prefix: '/api/webhooks' });

  // ---- RUTAS AUTENTICADAS ----
  await app.register(async (api) => {
    await api.register(companyRoutes, { prefix: '/companies' });
    await api.register(productRoutes, { prefix: '/products' });
    await api.register(quoteRoutes, { prefix: '/quotes' });
    await api.register(orderRoutes, { prefix: '/orders' });
    await api.register(invoicesRoutes, { prefix: '/invoices' });

    // Rutas de carrito
    await api.register(async (cartApi) => {
      const { prisma } = await import('./shared/prisma/client.js');
      const { requireClient } = await import('./plugins/auth.js');

      cartApi.get('/', { preHandler: [requireClient] }, async (req) => {
        const user = (req as any).clientUser;
        return prisma.cart.findFirst({
          where: { userId: user.id, isActive: true },
          include: { items: { include: { product: { select: { id: true, name: true, storePrice: true, imageUrl: true, inStock: true, unit: true } } } } },
        });
      });

      cartApi.post('/items', { preHandler: [requireClient] }, async (req, reply) => {
        const user = (req as any).clientUser;
        const { productId, quantity = 1 } = req.body as { productId: string; quantity?: number };

        let cart = await prisma.cart.findFirst({ where: { userId: user.id, isActive: true } });
        if (!cart) {
          cart = await prisma.cart.create({ data: { userId: user.id } });
        }

        await prisma.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId } },
          create: { cartId: cart.id, productId, quantity },
          update: { quantity: { increment: quantity } },
        });

        return reply.status(201).send({ success: true });
      });

      cartApi.delete('/items/:productId', { preHandler: [requireClient] }, async (req) => {
        const user = (req as any).clientUser;
        const { productId } = req.params as { productId: string };
        const cart = await prisma.cart.findFirst({ where: { userId: user.id, isActive: true } });
        if (cart) {
          await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
        }
        return { success: true };
      });

      // GET /api/cart/count — Número de items en el carrito (para badge en navbar)
      cartApi.get('/count', { preHandler: [requireClient] }, async (req) => {
        const user = (req as any).clientUser;
        const cart = await prisma.cart.findFirst({
          where: { userId: user.id, isActive: true },
          select: { _count: { select: { items: true } } },
        });
        return { count: cart?._count.items ?? 0 };
      });
    }, { prefix: '/cart' });

  }, { prefix: '/api' });

  // ---- RUTAS ADMIN (BACK-OFFICE) ----
  await app.register(backOfficeRoutes, { prefix: '/api/admin' });

  // ---- MANEJO DE ERRORES GLOBAL ----
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
      });
    }

    // Errores de validación Zod
    if (error.name === 'ZodError') {
      return reply.status(422).send({
        statusCode: 422,
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: JSON.parse(error.message),
      });
    }

    // Error 429 de rate limit
    if (error.statusCode === 429) {
      return reply.status(429).send(error);
    }

    // Error interno
    app.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
    });
  });

  return app;
}
