// scraping/adapters/aggregator.ts
// Adapter for AGGREGATOR source kind.
// Aggregators are multi-supplier marketplaces (e.g. MercadoLibre, Amazon Business).
// This is a placeholder — extend with real parsers per aggregator scraperClass.

import type { ScrapingAdapter, ScrapingContext, ScrapedProduct, SourceStoreRecord } from './base.js';

export class AggregatorAdapter implements ScrapingAdapter {
  supports(store: SourceStoreRecord): boolean {
    return store.sourceKind === 'AGGREGATOR';
  }

  async collect(context: ScrapingContext): Promise<ScrapedProduct[]> {
    const { store } = context;
    console.warn(
      `[AggregatorAdapter] No concrete parser implemented for store "${store.name}" (scraperClass="${store.scraperClass ?? 'n/a'}"). ` +
      `Add a case in this adapter or register a dedicated parser. Returning empty set.`,
    );
    return [];
  }
}

export const aggregatorAdapter = new AggregatorAdapter();
