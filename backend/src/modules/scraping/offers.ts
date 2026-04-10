import { prisma } from '../../shared/prisma/client.js';

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
    return recentPriceDrops.map((p: any) => ({
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

  return featuredProducts.map((p: any) => ({
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
    categories: categories.map((c: any) => ({ name: c.category, count: c._count.id })),
    totalProducts,
  };
}
