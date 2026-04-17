import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSearchSuggestions, searchProducts } from './service.js';

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function parseInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const q = typeof query['q'] === 'string' ? query['q'] : '';

      const onlyNational = parseBoolean(query['onlyNational']);
      const onlyInternational = parseBoolean(query['onlyInternational']);

      const result = await searchProducts({
        query: q,
        languageCode: typeof query['lang'] === 'string' ? query['lang'] : 'es',
        pageSize: parseInteger(query['pageSize'], 20),
        ...(onlyNational !== undefined ? { onlyNational } : {}),
        ...(onlyInternational !== undefined ? { onlyInternational } : {}),
      });

      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });

  app.get(
    '/suggestions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as Record<string, unknown>;
        const q = typeof query['q'] === 'string' ? query['q'] : '';

        const items = await getSearchSuggestions(
          q,
          typeof query['lang'] === 'string' ? query['lang'] : 'es',
          parseInteger(query['limit'], 8),
        );

        return reply.send({ items });
      } catch (error) {
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Suggestions failed',
        });
      }
    },
  );
}
