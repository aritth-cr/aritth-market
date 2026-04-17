import { createHash } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] ?? null;
}

export function partnerApiAuth() {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const rawToken = extractBearerToken(request);

    if (!rawToken) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Bearer token is required',
      });
    }

    const hashedKey = hashApiKey(rawToken);

    const apiKey = await (prisma as any).partnerAPIKey.findUnique({
      where: { key: hashedKey },
      include: {
        company: true,
      },
    });

    if (!apiKey) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
      });
    }

    if (!apiKey.isActive) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'API key is inactive',
      });
    }

    // Update lastUsedAt asynchronously (non-blocking)
    (prisma as any).partnerAPIKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {/* ignore update errors */});

    const company = apiKey.company;
    const now = new Date();
    const isZonaFranca =
      company.exonerationCode != null &&
      (company.exonerationExpiry == null || company.exonerationExpiry > now);

    (request as any).partnerApiContext = {
      keyId: apiKey.id,
      keyName: apiKey.name ?? 'unnamed',
      companyId: company.id,
      company,
      defaultCurrency: company.preferredCurrency,
      isZonaFranca,
    };
  };
}
