// scraping/adapters/manufacturer-official.ts
// Adapter for MANUFACTURER_OFFICIAL source kind.
// Official manufacturer portals (e.g. Siemens, ABB, Schneider) often
// expose authenticated APIs or partner portals.
// This is a placeholder — extend with real integration per manufacturer scraperClass.

import type { ScrapingAdapter, ScrapingContext, ScrapedProduct, SourceStoreRecord } from './base.js';

export class ManufacturerOfficialAdapter implements ScrapingAdapter {
  supports(store: SourceStoreRecord): boolean {
    return store.sourceKind === 'MANUFACTURER_OFFICIAL';
  }

  async collect(context: ScrapingContext): Promise<ScrapedProduct[]> {
    const { store } = context;
    console.warn(
      `[ManufacturerOfficialAdapter] No concrete integration implemented for store "${store.name}" (scraperClass="${store.scraperClass ?? 'n/a'}"). ` +
      `Add a case in this adapter or register a dedicated parser. Returning empty set.`,
    );
    return [];
  }
}

export const manufacturerOfficialAdapter = new ManufacturerOfficialAdapter();
