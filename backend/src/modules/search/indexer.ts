import { prisma } from '../../shared/prisma/client.js';
import { expandSearchTerms, normalizeSearchQuery } from './synonyms.js';

export interface BuildSearchIndexInput {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  manufacturerName?: string | null;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  languageCode?: string;
}

function buildKeywords(input: BuildSearchIndexInput): string[] {
  const rawTerms = [
    input.canonicalName,
    input.normalizedName,
    input.manufacturerName,
    input.manufacturerPartNumber,
    input.brand,
    input.category,
  ].filter(Boolean) as string[];

  const expanded = rawTerms.flatMap((term) =>
    expandSearchTerms(term, input.languageCode ?? 'es'),
  );

  return Array.from(new Set(expanded.map(normalizeSearchQuery))).filter(Boolean);
}

export async function queueReindex(productId: string) {
  return prisma.searchIndex.updateMany({
    where: { productId },
    data: {
      reindexQueuedAt: new Date(),
    },
  });
}

export async function upsertProductSearchIndex(input: BuildSearchIndexInput) {
  // Note: languageCode removed from SearchIndex (FASE 4+: 1 index per product)
  // const _languageCode = input.languageCode ?? 'es';

  const searchableTitle = input.canonicalName;
  const searchableBody = [
    input.description,
    input.brand,
    input.manufacturerName,
    input.manufacturerPartNumber,
    input.category,
  ]
    .filter(Boolean)
    .join(' | ');

  const searchableKeywords = buildKeywords(input);

  const normalizedTitle = normalizeSearchQuery(
    [searchableTitle, searchableBody, ...searchableKeywords].filter(Boolean).join(' '),
  );

  // FASE 4+: SearchIndex es 1 por producto (no por idioma)
  // Delete existing and create new (simpler than handling upsert complexity)
  await prisma.searchIndex.deleteMany({ where: { productId: input.productId } });

  return prisma.searchIndex.create({
    data: {
      productId: input.productId,
      searchableTitle,
      searchableBody,
      searchableKeywords,
      normalizedTitle,
      lastIndexedAt: new Date(),
      reindexQueuedAt: null,
    },
  });
}

export async function replaceLocalizedSearchTerms(input: BuildSearchIndexInput) {
  const languageCode = input.languageCode ?? 'es';
  const terms = buildKeywords(input);

  await prisma.localizedSearchTerm.deleteMany({
    where: {
      productId: input.productId,
      languageCode,
    },
  });

  if (terms.length === 0) return [];

  return prisma.$transaction(
    terms.map((term, index) =>
      prisma.localizedSearchTerm.create({
        data: {
          productId: input.productId,
          languageCode,
          term,
          normalizedTerm: normalizeSearchQuery(term),
          termKind: index === 0 ? 'CANONICAL' : 'SYNONYM',
          weight: index === 0 ? 100 : 70,
        },
      }),
    ),
  );
}
