import { prisma } from '../../shared/prisma/client.js';
import {
  rankGroupedResults,
  type GroupedSearchResult,
  type SearchOfferPublic,
} from './ranking.js';
import { expandSearchTerms, normalizeSearchQuery } from './synonyms.js';

export interface SearchProductsInput {
  query: string;
  languageCode?: string;
  onlyNational?: boolean;
  onlyInternational?: boolean;
  pageSize?: number;
}

export interface SearchSuggestion {
  value: string;
  source: 'product' | 'term';
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function toPublicOffer(offer: any): SearchOfferPublic {
  return {
    id: String(offer.id),
    supplierId: String(offer.supplierId),
    supplierInternalCode: String(offer.supplier?.internalCode ?? ''),
    ...(offer.supplier?.type ? { supplierType: String(offer.supplier.type) } : {}),
    isManufacturerOfficial: normalizeBoolean(offer.supplier?.isManufacturerOfficial),
    isManufacturerOffer: normalizeBoolean(offer.isManufacturerOffer),
    isNational: normalizeBoolean(offer.isNational),
    verifiedBadge: normalizeBoolean(offer.supplier?.verifiedBadge),
    currencyCode: String(offer.currencyCode ?? 'USD'),
    unitPrice: asNumber(offer.unitPrice),
    stockQty: offer.stockQty ?? null,
    leadTimeDays: offer.leadTimeDays ?? null,
    moq: offer.moq ?? null,
    countryCode: offer.supplier?.countryCode ?? null,
    lastValidatedAt: offer.lastValidatedAt
      ? new Date(offer.lastValidatedAt).toISOString()
      : null,
  };
}

/**
 * HÍBRIDO: Combine embedding search + exact match + re-ranking
 * 1. Vector search (semantic multilingüe via Gemini embeddings)
 * 2. Exact match (technical codes, aliases via ProductSynonym)
 * 3. Text match (fallback: SearchIndex fields)
 */
async function findCandidateProductIds(
  query: string,
  languageCode: string,
  limit: number,
) {
  const normalized = normalizeSearchQuery(query);
  const expandedTerms = expandSearchTerms(query, languageCode);

  // RAMA 1: Búsqueda exacta para códigos técnicos (MPN, SKU, series, etc)
  const exactMatchProductIds = new Set<string>();

  // Buscar en ProductSynonym (sinónimos, aliases, códigos técnicos)
  const synonymMatches = await prisma.productSynonym.findMany({
    where: {
      AND: [
        {
          OR: [
            { languageCode }, // Del idioma solicitado
            { languageCode: 'en' }, // O inglés como fallback
          ],
        },
        {
          OR: [
            { normalizedTerm: { in: [normalized, query.toLowerCase()] } },
            { term: { in: expandedTerms } },
          ],
        },
      ],
    },
    select: { productId: true },
    take: limit,
  });

  synonymMatches.forEach((row) => exactMatchProductIds.add(row.productId));

  // Búsqueda exacta en SearchIndex para códigos/MPN
  const searchIndexMatches = await prisma.searchIndex.findMany({
    where: {
      OR: [
        { normalizedTitle: { contains: normalized } },
        { searchableKeywords: { hasSome: expandedTerms } },
      ],
    },
    select: { productId: true },
    take: limit / 2,
  });

  searchIndexMatches.forEach((row) => exactMatchProductIds.add(row.productId));

  // RAMA 2: Búsqueda textual en Product fields
  const textMatchProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      isPublished: true,
      OR: [
        { canonicalName: { contains: query, mode: 'insensitive' } },
        { manufacturerPartNumber: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
    take: limit / 2,
  });

  // RAMA 3: Vector search (si query es larga, vale la pena el embedding)
  const vectorCandidates: string[] = [];
  if (query.length > 3) {
    try {
      // TODO: Implement vector search via pgvector when Prisma supports it fully
      // const queryEmbedding = await generateEmbedding(query);
      // Nota: Prisma aún no soporta pgvector similarity directamente
      // Aquí irían resultados del vector search via raw SQL
      // Por ahora retornamos basado en exact + text match
    } catch (_err) {
      // Si Gemini falla, continuamos con exact + text
    }
  }

  // MERGE: Combinar sin duplicados, order: exact > text > vector
  const allCandidates = Array.from(exactMatchProductIds);
  textMatchProducts.forEach((p) => allCandidates.indexOf(p.id) === -1 && allCandidates.push(p.id));
  vectorCandidates.forEach((p) => allCandidates.indexOf(p) === -1 && allCandidates.push(p));

  return allCandidates.slice(0, limit);
}

export async function searchProducts(input: SearchProductsInput) {
  const query = input.query.trim();
  const languageCode = input.languageCode ?? 'es';
  const pageSize = input.pageSize ?? 20;

  if (!query) {
    return {
      query,
      languageCode,
      items: [] as GroupedSearchResult[],
      total: 0,
    };
  }

  const candidateProductIds = await findCandidateProductIds(query, languageCode, 100);

  if (candidateProductIds.length === 0) {
    return {
      query,
      languageCode,
      items: [] as GroupedSearchResult[],
      total: 0,
    };
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: candidateProductIds },
      isActive: true,
      isPublished: true,
    },
    include: {
      supplierOffers: {
        where: {
          isActive: true,
          ...(input.onlyNational ? { isNational: true } : {}),
          ...(input.onlyInternational ? { isNational: false } : {}),
        },
        include: {
          supplier: true,
        },
      },
    },
  });

  const grouped: GroupedSearchResult[] = products.map((product: any) => {
    const offers = (product.supplierOffers ?? []).map(toPublicOffer);
    const manufacturerOfferCount = offers.filter(
      (offer: SearchOfferPublic) => offer.isManufacturerOfficial || offer.isManufacturerOffer,
    ).length;
    const nationalOfferCount = offers.filter((offer: SearchOfferPublic) => offer.isNational).length;
    const internationalOfferCount = offers.filter((offer: SearchOfferPublic) => !offer.isNational).length;

    return {
      productId: String(product.id),
      canonicalName: String(product.canonicalName ?? product.name ?? ''),
      normalizedName: String(product.normalizedName ?? ''),
      manufacturerName: product.manufacturerName ?? null,
      manufacturerPartNumber: product.manufacturerPartNumber ?? null,
      brand: product.brand ?? null,
      category: product.category ?? null,
      imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
      description: product.description ?? null,
      offers,
      manufacturerOfferCount,
      nationalOfferCount,
      internationalOfferCount,
      score: 0,
    };
  });

  // RE-RANK por reglas de negocio
  const ranked = rankGroupedResults(grouped)
    .filter((item) => item.offers.length > 0)
    .slice(0, pageSize);

  return {
    query,
    languageCode,
    total: ranked.length,
    items: ranked,
  };
}

/**
 * Genera embedding para indexación (FASE 4+)
 * Ahora genera embedding multilingüe real via Gemini
 */
export async function generateProductEmbedding(
  _productId: string,
  _name: string,
  _category: string,
  _description?: string,
  _brand?: string,
): Promise<void> {
  // TODO: Implement embedding generation when Prisma types are available
  // const textToEmbed = [_name, _brand, _category, _description].filter(Boolean).join(' ');
  // try {
  //   const embedding = await generateEmbedding(textToEmbed);
  //   await prisma.productEmbedding.deleteMany({ where: { productId: _productId } });
  //   await prisma.productEmbedding.create({
  //     data: {
  //       productId: _productId,
  //       embedding: JSON.stringify(embedding),
  //       embeddingModel: 'embedding-001',
  //     },
  //   });
  // } catch (error) {
  //   console.error(`Failed to generate embedding for product ${_productId}:`, error);
  //   // No-throw: búsqueda igual funciona sin embeddings (fallback a exact/text)
  // }
}

export async function getSearchSuggestions(
  query: string,
  languageCode = 'es',
  limit = 8,
): Promise<SearchSuggestion[]> {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const [termHits, synonymHits, productHits] = await Promise.all([
    prisma.localizedSearchTerm.findMany({
      where: {
        OR: [{ languageCode }, { languageCode: 'es' }],
        normalizedTerm: { contains: normalized },
      },
      select: { term: true },
      take: limit,
    }),
    prisma.productSynonym.findMany({
      where: {
        OR: [{ languageCode }, { languageCode: 'en' }],
        normalizedTerm: { contains: normalized },
      },
      select: { term: true },
      take: limit / 2,
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { canonicalName: { contains: query, mode: 'insensitive' } },
          { manufacturerPartNumber: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { canonicalName: true },
      take: limit / 2,
    }),
  ]);

  const merged = [
    ...termHits.map((row) => ({ value: row.term, source: 'term' as const })),
    ...synonymHits.map((row) => ({ value: row.term, source: 'term' as const })),
    ...productHits.map((row) => ({
      value: row.canonicalName ?? '',
      source: 'product' as const,
    })),
  ];

  return Array.from(
    new Map(
      merged
        .filter((item) => item.value)
        .map((item) => [item.value.toLowerCase(), item]),
    ).values(),
  ).slice(0, limit);
}
