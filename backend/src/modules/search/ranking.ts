export interface SearchOfferPublic {
  id: string;
  supplierId: string;
  supplierInternalCode: string;
  supplierType?: string;
  isManufacturerOfficial: boolean;
  isManufacturerOffer: boolean;
  isNational: boolean;
  verifiedBadge: boolean;
  currencyCode: string;
  unitPrice: number;
  stockQty?: number | null;
  leadTimeDays?: number | null;
  moq?: number | null;
  countryCode?: string | null;
  lastValidatedAt?: string | null;
}

export interface GroupedSearchResult {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  manufacturerName?: string | null;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  category?: string | null;
  imageUrls: string[];
  description?: string | null;
  offers: SearchOfferPublic[];
  bestOffer?: SearchOfferPublic;
  manufacturerOfferCount: number;
  nationalOfferCount: number;
  internationalOfferCount: number;
  score: number;
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function rankOffer(offer: SearchOfferPublic): number {
  let score = 0;

  if (offer.isManufacturerOfficial || offer.isManufacturerOffer) score += 1000;
  if (offer.verifiedBadge) score += 100;
  if (offer.isNational) score += 15;
  if (typeof offer.stockQty === 'number' && offer.stockQty > 0) score += 10;

  const price = safeNumber(offer.unitPrice);
  if (price > 0) {
    score += Math.max(0, 500 - price);
  }

  const leadTime = safeNumber(offer.leadTimeDays);
  if (leadTime > 0) {
    score += Math.max(0, 100 - leadTime);
  }

  return score;
}

export function sortOffers(offers: SearchOfferPublic[]): SearchOfferPublic[] {
  return [...offers].sort((a, b) => {
    const scoreDiff = rankOffer(b) - rankOffer(a);
    if (scoreDiff !== 0) return scoreDiff;

    const priceDiff = safeNumber(a.unitPrice) - safeNumber(b.unitPrice);
    if (priceDiff !== 0) return priceDiff;

    return safeNumber(a.leadTimeDays) - safeNumber(b.leadTimeDays);
  });
}

export function rankGroupedResults(
  results: GroupedSearchResult[],
): GroupedSearchResult[] {
  return [...results]
    .map((result) => {
      const sortedOffers = sortOffers(result.offers);
      const bestOffer = sortedOffers[0];
      const score =
        (bestOffer ? rankOffer(bestOffer) : 0) +
        result.manufacturerOfferCount * 200 +
        result.nationalOfferCount * 15 +
        result.offers.length * 5;

      return {
        ...result,
        offers: sortedOffers,
        bestOffer,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
