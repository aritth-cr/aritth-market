import { chromium } from 'playwright';
import { env } from '../../../config/env.js';

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

const BASE_URL = 'https://www.epa.cr';
const DELAY_MS = env.SCRAPING_DELAY_MS;
const MAX_PAGES = env.MAX_PAGES_PER_CATEGORY;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scraper principal de EPA Costa Rica.
 * Usa Playwright para manejar JavaScript dinámico.
 */
export async function scrapeEPA(
  onProgress?: (found: number) => void,
): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: env.USER_AGENT,
    // Bloquear imágenes y fuentes para mayor velocidad
    extraHTTPHeaders: { 'Accept-Language': 'es-CR,es;q=0.9' },
  });

  // Bloquear recursos innecesarios
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3}', route => route.abort());

  const page = await context.newPage();
  const allProducts: ScrapedProduct[] = [];

  try {
    // 1. Obtener categorías principales
    console.log('[EPA] Obteniendo categorías...');
    const categories = await getCategories(page);
    console.log(`[EPA] ${categories.length} categorías encontradas`);

    // 2. Scrape cada categoría
    for (const cat of categories) {
      console.log(`[EPA] Scrapeando categoría: ${cat.name}`);

      for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
        const url = pageNum === 1 ? cat.url : `${cat.url}?p=${pageNum}`;
        const products = await scrapeCategoryPage(page, url, cat.name);

        if (products.length === 0) break;

        allProducts.push(...products);
        onProgress?.(allProducts.length);

        console.log(`[EPA] ${cat.name} pág ${pageNum}: ${products.length} productos`);
        await sleep(DELAY_MS);
      }
    }
  } finally {
    await browser.close();
  }

  return allProducts;
}

async function getCategories(page: any): Promise<Array<{ name: string; url: string }>> {
  await page.goto(`${BASE_URL}/catalog/category/view/id/2`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  return page.evaluate(() => {
    const links = document.querySelectorAll('.categories-menu a, .nav-sections a');
    const categories: Array<{ name: string; url: string }> = [];
    const seen = new Set<string>();

    links.forEach((link: Element) => {
      const a = link as HTMLAnchorElement;
      const name = a.textContent?.trim();
      const url = a.href;

      if (name && url && url.includes('epa.cr') && !seen.has(url)) {
        seen.add(url);
        categories.push({ name, url });
      }
    });

    return categories.slice(0, 50); // Limitar a 50 categorías
  });
}

async function scrapeCategoryPage(
  page: any,
  url: string,
  categoryName: string,
): Promise<ScrapedProduct[]> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(800);
  } catch {
    console.warn(`[EPA] Timeout en ${url}`);
    return [];
  }

  return page.evaluate((category: string, baseUrl: string) => {
    const products: ScrapedProduct[] = [];
    const items = document.querySelectorAll('.product-item, .item.product');

    items.forEach((item: Element) => {
      try {
        // Nombre
        const nameEl = item.querySelector('.product-item-name a, .product-item-link');
        const name = nameEl?.textContent?.trim();
        if (!name) return;

        // URL y ID externo
        const link = nameEl as HTMLAnchorElement;
        const externalUrl = link?.href || '';
        const idMatch = externalUrl.match(/\/(\d+)\.html$|id\/(\d+)/);
        const externalId = idMatch?.[1] || idMatch?.[2] || externalUrl.split('/').pop() || '';

        // Precio
        const priceEl = item.querySelector('.price, .price-wrapper .price');
        const priceText = priceEl?.textContent?.trim() || '0';
        const storePrice = parseFloat(priceText.replace(/[₡,\s]/g, '').replace('.', '').replace(',', '.')) || 0;
        if (storePrice <= 0) return;

        // Stock
        const inStock = !item.querySelector('.out-of-stock, .unavailable');

        // Imagen
        const imgEl = item.querySelector('img') as HTMLImageElement;
        const imageUrl = imgEl?.src || imgEl?.dataset['src'] || undefined;

        // SKU
        const skuEl = item.querySelector('[data-sku], .sku');
        const sku = skuEl?.getAttribute('data-sku') || skuEl?.textContent?.trim() || undefined;

        products.push({
          externalId: externalId || name.toLowerCase().replace(/\s+/g, '-'),
          externalUrl,
          name,
          category,
          storePrice,
          inStock,
          imageUrl: imageUrl?.startsWith('http') ? imageUrl : undefined,
          sku,
          unit: 'unidad',
        });
      } catch {
        // Continuar con siguiente producto
      }
    });

    return products;
  }, categoryName, BASE_URL) as Promise<ScrapedProduct[]>;
}

export { BASE_URL as EPA_BASE_URL };
