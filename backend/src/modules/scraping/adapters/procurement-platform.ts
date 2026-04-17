// scraping/adapters/procurement-platform.ts
// Adapter for PROCUREMENT_PLATFORM source kind.
// Procurement platforms expose structured product catalogs (APIs, EDI, XML feeds).
// This is a placeholder — extend with real integration per platform scraperClass.

import type { ScrapingAdapter, ScrapingContext, ScrapedProduct, SourceStoreRecord } from './base.js';

export class ProcurementPlatformAdapter implements ScrapingAdapter {
  supports(store: SourceStoreRecord): boolean {
    return store.sourceKind === 'PROCUREMENT_PLATFORM';
  }

  async collect(context: ScrapingContext): Promise<ScrapedProduct[]> {
    const { store } = context;
    console.warn(
      `[ProcurementPlatformAdapter] No concrete integration implemented for store "${store.name}" (scraperClass="${store.scraperClass ?? 'n/a'}"). ` +
      `Add a case in this adapter or register a dedicated parser. Returning empty set.`,
    );
    return [];
  }
}

export const procurementPlatformAdapter = new ProcurementPlatformAdapter();
