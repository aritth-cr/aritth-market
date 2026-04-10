import * as cheerio from 'cheerio';
import { prisma } from '../../shared/prisma/client.js';
import { env } from '../../config/env.js';

/**
 * Servicio de Ofertas / Promociones del Homepage.
 * Extrae las ofertas actuales de EPA y Novex para mostrar
 * en la página principal de Aritth Market.
 * El origen de la tienda se oculta a los clientes.
 */

export interface HomepageOffer {
  productId: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;   // storePrice real
  discountPercent: number; // % de descuento calculado
  category: string;
  inStock: boolean;
  // storeSource: OMITIDO — privado
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': env.USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

/**
 * Scraping de ofertas de EPA
 */
async function getEpaOffers(): Promise<Array<{ name: string; price: number; imageUrl?: string; category: string }>> {
  const offerUrls = [
    'https://www.epa.cr/promotions',
    'https://www.epa.cr/ofertas',
    'https://www.epa.cr/sale',
  ];

  for (const url of offerUrls) {
    const html = await fetchHtml(url);
    if (!html) continue;

    const $ = cheerio.load(html);
    const offers: Array<{ name: string; price: number; imageUrl?: string; category: string }> = [];

    $('.product-item, .item.product').each((_, el) => {
      const $el = $(el);
      const name = $el.find('.product-item-name, .product-item-link').text().trim();
      const priceText = $el.find('.special-price .price, .price').first().text().trim();
      const price = parseFloat(priceText.replace(/[₡,.\s]/g, '').slice(0, -2)) || 0;
      const img = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const cat = $el.closest('[class*="category"]').attr('data-category') || 'Herramientas';

      if (name && price > 0) {
        offers.push({ name, price, imageUrl: img, category: cat });
      }
    });

    if (offers.length > 0) return offers.slice(0, 20);
  }

  return [];
}

/**
 * Obtiene ofertas combinadas de todas las tiendas.
 * Busca primero en BD productos con precios bajados recientemente.
 */
export async function getHomepageOffers(limit = 12): Promise<HomepageOffer[]> {
  // Estrategia 1: Productos con bajada de precio reciente en BD
  const recentPriceDrops = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    storePrice: number;
    imageUrl: string | null;
    category: string;
    inStock: boolean;
    previousPrice: number;
  }>>`
    SELECT p.id, p.name, p."storePrice", p."imageUrl", p.category, p."inStock",
           ph."storePrice" as "previousPrice"
    FROM "Product" p
    JOIN "PriceHistory" ph ON ph."productId" = p.id
    WHERE p."isActive" = true
      AND p."inStock" = true
      AND ph."recordedAt" >= NOW() - INTERVAL '7 days'
      AND ph."storePrice" > p."storePrice"
      AND (ph."storePrice" - p."storePrice") / ph."storePrice" >= 0.05
    ORDER BY (ph."storePrice" - p."storePrice") / ph."storePrice" DESC
    LIMIT ${limit}
  `;

  if (recentPriceDrops.length >= limit / 2) {
    return recentPriceDrops.map(p => ({
      productId: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      originalPrice: Number(p.storePrice),
      discountPercent: Math.round(
        ((Number(p.previousPrice) - Number(p.storePrice)) / Number(p.previousPrice)) * 100,
      ),
      category: p.category,
      inStock: p.inStock,
    }));
  }

  // Estrategia 2: Productos destacados de BD (más baratos en su categoría)
  const featuredProducts = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    storePrice: number;
    imageUrl: string | null;
    category: string;
    inStock: boolean;
  }>>`
    SELECT DISTINCT ON (p.category) p.id, p.name, p."storePrice",
           p."imageUrl", p.category, p."inStock"
    FROM "Product" p
    WHERE p."isActive" = true AND p."inStock" = true
    ORDER BY p.category, p."storePrice" ASC
    LIMIT ${limit}
  `;

  return featuredProducts.map(p => ({
    productId: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    originalPrice: Number(p.storePrice),
    discountPercent: 0, // Sin descuento calculado
    category: p.category,
    inStock: p.inStock,
  }));
}

/**
 * Ruta pública de ofertas para el homepage
 */
export async function getOffersForHomepage() {
  const [offers, categories, totalProducts] = await Promise.all([
    getHomepageOffers(12),
    prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, inStock: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
    prisma.product.count({ where: { isActive: true, inStock: true } }),
  ]);

  return {
    offers,
    categories: categories.map(c => ({ name: c.category, count: c._count.id })),
    totalProducts,
    lastUpdated: new Date(),
  };
}
