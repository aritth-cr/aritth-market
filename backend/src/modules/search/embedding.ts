// search/embedding.ts
// Gemini embeddings para búsqueda semántica multilingüe
// NOTA: Implementación futura cuando Prisma genere tipos de ProductEmbedding
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

/**
 * Genera embedding para un texto usando Gemini
 * El embedding captura significado técnico en 9 idiomas
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });

  try {
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
