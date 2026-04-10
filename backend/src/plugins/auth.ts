import Fastify from 'fastify';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import { prisma } from '../shared/prisma/client.js';
import { env } from '../config/env.js';
import {
  UnauthorizedError,
  ForbiddenError,
  CompanyPendingError,
  CompanySuspendedError,
} from '../shared/errors/AppError.js';
type AritthRole = 'SUPER_ADMIN' | 'ADMIN' | 'INVOICE_REVIEWER' | 'FINANCE' | 'OPERATIONS' | 'SUPPORT';
type CompanyRole = 'ADMIN' | 'PURCHASER' | 'VIEWER';

type FastifyInstance = ReturnType<typeof Fastify>;

// Extender tipos de Fastify con info de usuario
declare module 'fastify' {
  interface FastifyRequest {
    clientUser?: {
      id: string;
      clerkId: string;
      companyId: string;
      role: CompanyRole;
      company: {
        id: string;
        type: 'FREE_ZONE' | 'REGULAR';
        status: string;
        isExempt: boolean;
        creditLimit: number;
        currentBalance: number;
        creditTermsDays: number;
      };
    };
    aritthUser?: {
      id: string;
      clerkId: string;
      role: AritthRole;
    };
  }
}

/**
 * Registra el plugin de Clerk en Fastify
 */
export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  await app.register(clerkPlugin, {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });
}

/**
 * Middleware: valida usuario cliente de empresa
 */
export async function requireClient(
  request: any,
  _reply: any,
): Promise<void> {
  const auth = getAuth(request);

  if (!auth.userId) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: auth.userId },
    include: {
      company: {
        select: {
          id: true,
          type: true,
          status: true,
          exonerationCode: true,
          creditLimit: true,
          currentBalance: true,
          creditTermsDays: true,
        },
      },
    },
  });

  if (!user) throw new UnauthorizedError('Usuario no registrado');
  if (!user.isActive) throw new ForbiddenError('Usuario desactivado');

  if (user.company.status === 'PENDING') throw new CompanyPendingError();
  if (user.company.status === 'SUSPENDED') throw new CompanySuspendedError();
  if (user.company.status === 'REJECTED') throw new ForbiddenError('Empresa rechazada');

  request.clientUser = {
    id: user.id,
    clerkId: auth.userId,
    companyId: user.companyId,
    role: user.role,
    company: {
      id: user.company.id,
      type: user.company.type,
      status: user.company.status,
      isExempt: user.company.type === 'FREE_ZONE',
      creditLimit: Number(user.company.creditLimit),
      currentBalance: Number(user.company.currentBalance),
      creditTermsDays: user.company.creditTermsDays,
    },
  };
}

/**
 * Middleware: valida usuario interno Aritth
 */
export async function requireAritth(
  request: any,
  _reply: any,
): Promise<void> {
  const auth = getAuth(request);

  if (!auth.userId) throw new UnauthorizedError();

  const user = await prisma.aritthUser.findUnique({
    where: { clerkId: auth.userId },
    select: { id: true, clerkId: true, role: true, isActive: true },
  });

  if (!user) throw new ForbiddenError('Acceso reservado para equipo Aritth');
  if (!user.isActive) throw new ForbiddenError('Usuario Aritth desactivado');

  request.aritthUser = { id: user.id, clerkId: auth.userId, role: user.role };
}

/**
 * Middleware factory: requiere rol específico de Aritth
 */
export function requireAritthRole(roles: AritthRole[]) {
  return async function (request: any, _reply: any): Promise<void> {
    await requireAritth(request, _reply);

    if (!roles.includes(request.aritthUser.role)) {
      throw new ForbiddenError(`Requiere rol: ${roles.join(' o ')}`);
    }
  };
}

/**
 * Middleware factory: requiere rol específico de cliente
 */
export function requireClientRole(roles: CompanyRole[]) {
  return async function (request: any, _reply: any): Promise<void> {
    await requireClient(request, _reply);
    if (!roles.includes(request.clientUser.role)) {
      throw new ForbiddenError(`Requiere rol: ${roles.join(' o ')}`);
    }
  };
}