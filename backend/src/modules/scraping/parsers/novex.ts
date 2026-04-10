import * as cheerio from 'cheerio';
import { env } from '../../../config/env.js';
import type { ScrapedProduct } from './epa.js';

const BASE_URL = 'https://www.novex.cr';
const DELAY_MS = env.SCRAPING_DELAY_MS;
const MAX_PAGES = env.MAX_PAGES_PER_CATEGORY;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': env.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-CR,es;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    return res.text();
  } catch (err) {
    console.warn(`[Novex] Error fetching ${url}:`, err);
    return null;
  }
}

/**
 * Scraper de Novex Costa Rica.
 * Usa Cheerio (HTML estático) para mayor velocidad.
 */
export async function scrapeNovex(
  onProgress?: (found: number) => void,
): Promise<ScrapedProduct[]> {
  const allProducts: ScrapedProduct[] = [];

  console.log('[Novex] Obteniendo categorías...');
  const categories = await getCategories();
  console.log(`[Novex] ${categories.length} categorías encontradas`);

  for (const cat of categories) {
    console.log(`[Novex] Scrapeando: ${cat.name}`);

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = pageNum === 1
        ? cat.url
        : `${cat.url}?page=${pageNum}`;

      const html = await fetchPage(url);
      if (!html) break;

      const products = parseProductPage(html, cat.name, cat.url);
      if (products.length === 0) break;

      allProducts.push(...products);
      onProgress?.(allProducts.length);

      console.log(`[Novex] ${cat.name} pág ${pageNum}: ${products.length} productos`);
      await sleep(DELAY_MS);
    }
  }

  return allProducts;
}

async function getCategories(): Promise<Array<{ name: string; url: string }>> {
  const html = await fetchPage(BASE_URL);
  if (!html) return getFallbackCategories();

  const $ = cheerio.load(html);
  const categories: Array<{ name: string; url: string }> = [];
  const seen = new Set<string>();

  // Selector principal para nav de Novex
  $('nav a, .menu-category a, .nav-link, .categoria a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();

    if (!name || !href) return;

    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    if (
      fullUrl.includes('novex.cr') &&
      !seen.has(fullUrl) &&
      name.length > 2 &&
      !fullUrl.includes('cuenta') &&
      !fullUrl.includes('carrito') &&
      !fullUrl.includes('login')
    ) {
      seen.add(fullUrl);
      categories.push({ name, url: fullUrl });
    }
  });

  return categories.length > 0 ? categories : getFallbackCategories();
}

function getFallbackCategories(): Array<{ name: string; url: string }> {
  // Categorías conocidas de Novex como fallback
  return [
    { name: 'Herramientas', url: `${BASE_URL}/herramientas` },
    { name: 'Electricidad', url: `${BASE_URL}/electricidad` },
    { name: 'Ferretería', url: `${BASE_URL}/ferreteria` },
    { name: 'Seguridad Industrial', url: `${BASE_URL}/seguridad-industrial` },
    { name: 'Plomería', url: `${BASE_URL}/plomeria` },
    { name: 'Pinturas', url: `${BASE_URL}/pinturas` },
    { name: 'Construcción', url: `${BASE_URL}/construccion` },
    { name: 'Jardinería', url: `${BASE_URL}/jardineria` },
  ];
}

function parseProductPage(
  html: string,
  categoryName: string,
  categoryUrl: string,
): ScrapedProduct[] {
  const $ = cheerio.load(html);
  const products: ScrapedProduct[] = [];

  // Selectores comunes en tiendas costarricenses
  const productSelectors = [
    '.product-item',
    '.product-card',
    '.item.product',
    '[class*="product-grid"] > div',
    '.card.product',
  ];

  let $products = $();
  for (const selector of productSelectors) {
    $products = $(selector);
    if ($products.length > 0) break;
  }

  $products.each((_, el) => {
    try {
      const $el = $(el);

      // Nombre
      const name = $el.find('.product-name, .product-title, h2, h3, .name')
        .first().text().trim();
      if (!name) return;

      // URL externa
      const link = $el.find('a').first();
      const href = link.attr('href') || '';
      const externalUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      const externalId = externalUrl.split('/').filter(Boolean).pop() || `novex-${Date.now()}`;

      // Precio — múltiples formatos posibles
      const priceText = $el.find('.price, .precio, [class*="price"]')
        .first().text().trim();

      // Limpiar precio: "₡12.500,00" → 12500
      const cleanPrice = priceText
        .replace(/[₡$\s]/g, '')
        .replace(/\.(\d{3})/g, '$1')   // Remover puntos de miles
        .replace(',', '.');              // Coma decimal → punto

      const storePrice = parseFloat(cleanPrice) || 0;
      if (storePrice <= 0) return;

      // Stock
      const stockText = $el.find('.stock, .disponibilidad, [class*="stock"]')
        .text().toLowerCase();
      const inStock = !stockText.includes('agotado') &&
        !stockText.includes('no disponible') &&
        !stockText.includes('out of stock');

      // Imagen
      const imgSrc = $el.find('img').attr('src') ||
        $el.find('img').attr('data-src') || '';
      const imageUrl = imgSrc.startsWith('http') ? imgSrc :
        imgSrc ? `${BASE_URL}${imgSrc}` : undefined;

      // SKU
      const sku = $el.find('[class*="sku"], [data-sku]').first().text().trim() ||
        $el.find('[data-sku]').attr('data-sku');

      products.push({
        externalId,
        externalUrl,
        name,
        category: categoryName,
        storePrice,
        inStock,
        imageUrl: imageUrl || undefined,
        sku: sku || undefined,
        unit: 'unidad',
      });
    } catch {
      // Continuar con siguiente
    }
  });

  return products;
}

/**
 * Extrae ofertas/promociones actuales de Novex
 */
export async function scrapeNovexOffers(): Promise<ScrapedProduct[]> {
  const offerUrls = [
    `${BASE_URL}/ofertas`,
    `${BASE_URL}/promociones`,
    `${BASE_URL}/descuentos`,
  ];

  const allOffers: ScrapedProduct[] = [];

  for (const url of offerUrls) {
    const html = await fetchPage(url);
    if (!html) continue;

    const offers = parseProductPage(html, 'Ofertas', url);
    allOffers.push(...offers);
    await sleep(DELAY_MS);
  }

  return allOffers;
}

export { BASE_URL as NOVEX_BASE_URL };
