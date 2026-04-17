// scraping/engine.ts
// Multi-source scraping engine — replaces the hardcoded EPA/Novex switch.
// Adapter is selected dynamically based on SourceStore.sourceKind.

import { prisma } from '../../shared/prisma/client.js';
import { generateProductEmbedding } from '../search/service.js';
import { sendQuoteEmail } from '../../shared/utils/mailer.js';

import type { ScrapingAdapter, ScrapedProduct, SourceStoreRecord, ScrapingContext } from './adapters/base.js';
import { directSupplierAdapter } from './adapters/direct-supplier.js';
import { aggregatorAdapter } from './adapters/aggregator.js';
import { procurementPlatformAdapter } from './adapters/procurement-platform.js';
import { manufacturerOfficialAdapter } from './adapters/manufacturer-official.js';

// ──────────────────────────────────────────
// Adapter registry — add new adapters here
// ──────────────────────────────────────────

const ADAPTERS: ScrapingAdapter[] = [
  directSupplierAdapter,
  aggregatorAdapter,
  procurementPlatformAdapter,
  manufacturerOfficialAdapter,
];

function selectAdapter(store: SourceStoreRecord): ScrapingAdapter | null {
  return ADAPTERS.find(a => a.supports(store)) ?? null;
}

// ──────────────────────────────────────────
// Core engine functions
// ──────────────────────────────────────────

/**
 * Ejecuta el scraping de una tienda específica.
 * Actualiza el ScrapingJob con progreso y resultado.
 */
export async function runScraping(storeId: string, jobId: string): Promise<void> {
  const store = await prisma.sourceStore.findUnique({ where: { id: storeId } });

  if (!store) {
    throw new Error(`SourceStore not found: ${storeId}`);
  }

  const adapter = selectAdapter(store as SourceStoreRecord);
  if (!adapter) {
    throw new Error(
      `No scraping adapter available for store "${store.name ?? storeId}" ` +
      `(sourceKind="${(store as any).sourceKind ?? 'unknown'}")`,
    );
  }

  // Marcar job como RUNNING
  await prisma.scrapingJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  let productsFound = 0;
  let productsUpdated = 0;
  const errors: string[] = [];

  try {
    const context: ScrapingContext = {
      store: store as SourceStoreRecord,
      jobId,
      delayMs: (process.env.SCRAPING_DELAY_MS ? parseInt(process.env.SCRAPING_DELAY_MS) : 1000),
      onProgress: (count: number) => {
        productsFound = count;
        console.log(`[${store.name}] Progreso: ${count} productos encontrados`);
      },
    };

    const products = await adapter.collect(context);
    productsFound = products.length;
    console.log(`[${store.name}] Total productos: ${productsFound}`);

    // Persist results in batches
    await persistIndexedResults(store as SourceStoreRecord, products);
    productsUpdated = products.length;

    // Marcar tiendas que quedaron sin ver como inactivas
    await prisma.product.updateMany({
      where: {
        storeId,
        lastSeenAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      data: { isActive: false },
    });

    // Actualizar tienda
    await prisma.sourceStore.update({
      where: { id: storeId },
      data: { lastScrapedAt: new Date() },
    });

    // Marcar job como SUCCESS
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCESS',
        productsFound,
        productsUpdated,
        completedAt: new Date(),
      },
    });

    console.log(`[${store.name}] ✅ Scraping completado: ${productsFound} encontrados, ${productsUpdated} actualizados`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(errorMsg);
    console.error(`[${store.name}] ❌ Error:`, errorMsg);

    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        productsFound,
        productsUpdated,
        errors,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * Persists scraped products to the database in batches of 50.
 * Handles price history and embedding generation.
 */
export async function persistIndexedResults(
  store: SourceStoreRecord,
  products: ScrapedProduct[],
): Promise<void> {
  const BATCH_SIZE = 50;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(p => upsertProduct(store.id, p)));
  }
}

async function upsertProduct(storeId: string, p: ScrapedProduct): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: { storeId_externalId: { storeId, externalId: p.externalId } },
    select: { id: true, storePrice: true, inStock: true },
  });

  const data = {
    externalUrl: p.externalUrl,
    name: p.name,
    ...(p.description !== undefined ? { description: p.description } : {}),
    ...(p.brand !== undefined ? { brand: p.brand } : {}),
    ...(p.sku !== undefined ? { sku: p.sku } : {}),
    category: p.category,
    ...(p.subcategory !== undefined ? { subcategory: p.subcategory } : {}),
    storePrice: p.storePrice,
    inStock: p.inStock,
    ...(p.imageUrl !== undefined ? { imageUrl: p.imageUrl } : {}),
    unit: p.unit,
    isActive: true,
    lastSeenAt: new Date(),
  };

  if (!existing) {
    const created = await prisma.product.create({
      data: { ...data, storeId, externalId: p.externalId },
    });

    // Generar embedding en background
    void generateProductEmbedding(
      created.id,
      p.name,
      p.category,
      p.description,
      p.brand,
    );
  } else {
    if (Number(existing.storePrice) !== p.storePrice) {
      await prisma.priceHistory.create({
        data: { productId: existing.id, storePrice: p.storePrice },
      });
    }

    await prisma.product.update({ where: { id: existing.id }, data });

    if (!existing.inStock && p.inStock) {
      void notifyStockAlerts(existing.id);
    }
  }
}

/**
 * Notifica a usuarios con alertas de stock cuando el producto vuelve
 */
async function notifyStockAlerts(productId: string): Promise<void> {
  const alerts = await prisma.stockAlert.findMany({
    where: { productId, type: 'STOCK', isActive: true },
    include: {
      user: { select: { email: true, name: true } },
      product: { select: { name: true, externalUrl: true } },
    },
  });

  for (const alert of alerts) {
    try {
      await sendQuoteEmail({
        to: [alert.user.email],
        quoteNumber: 'ALERTA-STOCK',
        companyName: alert.user.name,
        total: 0,
        totalUsd: null,
        expiresAt: new Date(),
        pdfBuffer: Buffer.from(''),
      });

      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date() },
      });
    } catch (err) {
      console.warn(`[StockAlert] Error notificando ${alert.user.email}:`, err);
    }
  }
}

/**
 * Crea un nuevo job de scraping y lo encola
 */
export async function createScrapingJob(storeId: string): Promise<string> {
  const job = await prisma.scrapingJob.create({
    data: {
      storeId,
      status: 'QUEUED',
    },
  });

  return job.id;
}
