// scraping/adapters/base.ts
// Base interface for all scraping adapters in the multi-source engine.

export interface ScrapedProduct {
  externalId: string;
  externalUrl: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  storePrice: number;
  inStock: boolean;
  imageUrl?: string;
  unit: string;
}

export interface SourceStoreRecord {
  id: string;
  name: string;
  code?: string | null;
  scraperClass?: string | null;
  sourceKind?: string | null;
  baseUrl?: string | null;
  isActive?: boolean;
}

export interface ScrapingContext {
  store: SourceStoreRecord;
  jobId: string;
  delayMs: number;
  onProgress?: (count: number) => void;
}

/**
 * All scraping adapters must implement this interface.
 * Each adapter is responsible for collecting products from a specific
 * source type (direct supplier, aggregator, procurement platform, etc.)
 */
export interface ScrapingAdapter {
  /**
   * Returns true if this adapter can handle the given store.
   */
  supports(store: SourceStoreRecord): boolean;

  /**
   * Collects all available products from the store.
   */
  collect(context: ScrapingContext): Promise<ScrapedProduct[]>;
}
