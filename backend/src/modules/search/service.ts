import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../shared/prisma/client.js';
import { env } from '../../config/env.js';

const genai = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// =============================================
// DICCIONARIO DE SINÓNIMOS INDUSTRIAL (CR)
// Maneja coloquialismos y terminología local
// =============================================
const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // Herramientas de sujeción
  'prensas de sujeción': ['sargentos mecánicos', 'sargentos', 'clamps', 'grampas', 'abrazaderas de sujeción'],
  'sargentos mecánicos': ['prensas de sujeción', 'clamps', 'grampas'],

  // Herramientas de corte
  'segueta': ['hacksaw', 'sierra para metal', 'arco sierra'],
  'sierra caladora': ['jigsaw', 'sierra de vaivén', 'caladora'],
  'amoladora': ['esmeriladora', 'grinder', 'pulidora angular', 'esmeril angular'],

  // Fijación
  'tornillo': ['perno', 'fijador', 'sujetador'],
  'perno': ['tornillo', 'bolt', 'tirafondo'],
  'tuerca': ['nut', 'tuerca hexagonal'],
  'arandela': ['rondana', 'washer'],

  // Electricidad
  'interruptor': ['switch', 'breaker', 'llave de luz', 'apagador'],
  'cable eléctrico': ['alambre eléctrico', 'conductor', 'cable thhn', 'cable thwn'],
  'extensión': ['extensión eléctrica', 'alargador', 'extension cord'],
  'toma corriente': ['tomacorriente', 'enchufe hembra', 'outlet', 'receptáculo'],

  // Plomería
  'tubo pvc': ['tubería pvc', 'caño pvc', 'cañería pvc'],
  'llave de paso': ['válvula de bola', 'ball valve', 'llave de agua', 'válvula de paso'],
  'unión': ['coupling', 'acoplamiento', 'junta'],

  // Seguridad
  'casco': ['casco de seguridad', 'casco industrial', 'hard hat', 'casco protector'],
  'guantes': ['guantes de trabajo', 'guantes industriales', 'guantes de seguridad'],
  'lentes de seguridad': ['gafas de seguridad', 'anteojos de seguridad', 'safety glasses'],
  'botas de seguridad': ['botas industriales', 'calzado de seguridad', 'botas punta de acero'],

  // Medición
  'cinta métrica': ['metro', 'flexómetro', 'huincha', 'tape measure'],
  'nivel': ['nivel de burbuja', 'nivel de torpedo', 'spirit level'],
  'multímetro': ['tester', 'medidor eléctrico', 'voltímetro'],

  // Adhesivos
  'silicón': ['silicona', 'sellador', 'sealant'],
  'epóxico': ['epoxy', 'pegamento epóxico', 'resina epóxica'],
  'pegamento': ['adhesivo', 'cemento de contacto', 'contact cement'],

  // Materiales
  'madera terciada': ['triplay', 'plywood', 'madera contrachapada'],
  'lámina galvanizada': ['zinc', 'lámina de zinc', 'galvanized sheet'],
  'malla electrosoldada': ['malla de alambre', 'wire mesh'],
};

/**
 * Genera embedding vectorial usando Gemini
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genai.getGenerativeModel({ model: 'models/text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Expande una consulta con sinónimos conocidos
 */
function expandQueryWithSynonyms(query: string): string {
  const lowerQuery = query.toLowerCase().trim();
  const expanded = new Set([lowerQuery]);

  for (const [canonical, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
    const allVariants = [canonical, ...synonyms].map(s => s.toLowerCase());

    // Si la consulta contiene alguna variante, agregar todas las demás
    if (allVariants.some(v => lowerQuery.includes(v) || v.includes(lowerQuery))) {
      allVariants.forEach(v => expanded.add(v));
    }
  }

  return Array.from(expanded).join(' ');
}

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  storePrice: number;
  inStock: boolean;
  imageUrl: string | null;
  score: number;
  matchType: 'semantic' | 'text' | 'synonym';
}

export interface SearchOptions {
  query: string;
  limit?: number;
  category?: string;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Búsqueda inteligente de productos.
 *
 * Estrategia multicapa:
 * 1. Expandir consulta con sinónimos del diccionario
 * 2. Búsqueda textual rápida (PostgreSQL full-text)
 * 3. Búsqueda semántica con Gemini embeddings + pgvector
 * 4. Combinar y rankear resultados
 */
export async function searchProducts(opts: SearchOptions): Promise<SearchResult[]> {
  const { query, limit = 20, category, inStockOnly = false, minPrice, maxPrice } = opts;

  // Expandir con sinónimos
  const expandedQuery = expandQueryWithSynonyms(query);

  const results = new Map<string, SearchResult>();

  // --- 1. Búsqueda textual rápida con PostgreSQL ---
  try {
    const textResults = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      category: string;
      storePrice: number;
      inStock: boolean;
      imageUrl: string | null;
    }>>`
      SELECT id, name, category, "storePrice", "inStock", "imageUrl"
      FROM "Product"
      WHERE "isActive" = true
        AND "inStock" = ${inStockOnly ? true : 'inStock'}
        ${category ? prisma.$queryRaw`AND category = ${category}` : prisma.$queryRaw``}
        AND (
          to_tsvector('spanish', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, ''))
          @@ plainto_tsquery('spanish', ${expandedQuery})
          OR name ILIKE ${'%' + query + '%'}
        )
      LIMIT ${limit * 2}
    `;

    for (const row of textResults) {
      results.set(row.id, { ...row, score: 0.7, matchType: 'text' });
    }
  } catch (err) {
    console.warn('[Search] Error en búsqueda textual:', err);
  }

  // --- 2. Búsqueda semántica con Gemini + pgvector ---
  try {
    const embedding = await generateEmbedding(expandedQuery);
    const embeddingStr = `[${embedding.join(',')}]`;

    const semanticResults = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      category: string;
      storePrice: number;
      inStock: boolean;
      imageUrl: string | null;
      similarity: number;
    }>>`
      SELECT id, name, category, "storePrice", "inStock", "imageUrl",
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Product"
      WHERE "isActive" = true
        AND embedding IS NOT NULL
        ${inStockOnly ? prisma.$queryRaw`AND "inStock" = true` : prisma.$queryRaw``}
        ${category ? prisma.$queryRaw`AND category = ${category}` : prisma.$queryRaw``}
        ${minPrice ? prisma.$queryRaw`AND "storePrice" >= ${minPrice}` : prisma.$queryRaw``}
        ${maxPrice ? prisma.$queryRaw`AND "storePrice" <= ${maxPrice}` : prisma.$queryRaw``}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    for (const row of semanticResults) {
      if (row.similarity > 0.65) {
        const existing = results.get(row.id);
        if (!existing || row.similarity > existing.score) {
          results.set(row.id, {
            ...row,
            storePrice: Number(row.storePrice),
            score: row.similarity,
            matchType: 'semantic',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Search] Error en búsqueda semántica:', err);
  }

  // Ordenar por score y retornar
  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Genera y guarda embeddings para un producto.
 * Se llama al upsertear productos durante el scraping.
 */
export async function generateProductEmbedding(
  productId: string,
  name: string,
  category: string,
  description?: string,
  brand?: string,
): Promise<void> {
  try {
    const textToEmbed = [name, category, description, brand]
      .filter(Boolean)
      .join(' ');

    const embedding = await generateEmbedding(textToEmbed);
    const embeddingStr = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      UPDATE "Product"
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${productId}
    `;
  } catch (err) {
    console.warn(`[Search] Error generando embedding para ${productId}:`, err);
  }
}

/**
 * Obtiene sugerencias de búsqueda (autocomplete)
 */
export async function getSearchSuggestions(partial: string): Promise<string[]> {
  if (partial.length < 2) return [];

  const results = await prisma.product.findMany({
    where: {
      isActive: true,
      inStock: true,
      OR: [
        { name: { contains: partial, mode: 'insensitive' } },
        { category: { contains: partial, mode: 'insensitive' } },
        { brand: { contains: partial, mode: 'insensitive' } },
      ],
    },
    select: { name: true, category: true },
    distinct: ['name'],
    take: 8,
  });

  return results.map(r => r.name);
}
