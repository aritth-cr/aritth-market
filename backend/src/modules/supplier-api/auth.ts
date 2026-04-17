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

export function supplierApiAuth(_requiredScope?: string) {
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

    const apiKey = await (prisma as any).supplierAPIKey.findUnique({
      where: { key: hashedKey },
      include: {
        supplier: true,
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

    if (!apiKey.supplier?.isActive) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Supplier account is inactive',
      });
    }

    // Update lastUsedAt asynchronously (non-blocking)
    (prisma as any).supplierAPIKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {/* ignore update errors */});

    (request as any).supplierApiContext = {
      keyId: apiKey.id,
      keyName: apiKey.name ?? 'unnamed',
      supplierId: apiKey.supplierId,
      supplier: apiKey.supplier,
    };
  };
}
