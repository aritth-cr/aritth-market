// scraping/adapters/direct-supplier.ts
// Adapter for DIRECT_SUPPLIER source kind.
// Wraps the existing per-store parsers (EPA, Novex) using the scraperClass field.

import type { ScrapingAdapter, ScrapingContext, ScrapedProduct, SourceStoreRecord } from './base.js';
import { scrapeEPA } from '../parsers/epa.js';
import { scrapeNovex } from '../parsers/novex.js';

// Re-export ScrapedProduct from epa.ts compatible type
// (Both parsers return the same ScrapedProduct shape)

export class DirectSupplierAdapter implements ScrapingAdapter {
  supports(store: SourceStoreRecord): boolean {
    const kind = store.sourceKind ?? '';
    return kind === 'DIRECT_SUPPLIER' || kind === '';
  }

  async collect(context: ScrapingContext): Promise<ScrapedProduct[]> {
    const { store, onProgress } = context;
    const scraperClass = store.scraperClass?.toLowerCase() ?? '';

    const onProg = (count: number) => {
      onProgress?.(count);
      console.log(`[${store.name}] Progreso: ${count} productos encontrados`);
    };

    switch (scraperClass) {
      case 'epa':
        return scrapeEPA(onProg) as Promise<ScrapedProduct[]>;
      case 'novex':
        return scrapeNovex(onProg) as Promise<ScrapedProduct[]>;
      default:
        console.warn(`[DirectSupplierAdapter] No parser found for scraperClass="${scraperClass}" on store "${store.name}". Returning empty.`);
        return [];
    }
  }
}

export const directSupplierAdapter = new DirectSupplierAdapter();
