import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient, requireClientRole } from '../../plugins/auth.js';
import { z } from 'zod';

const registerCompanySchema = z.object({
  // Datos de empresa
  name: z.string().min(2).max(100),
  legalName: z.string().min(2).max(150),
  cedula: z.string().min(8).max(20),
  type: z.enum(['FREE_ZONE', 'REGULAR']),
  exonerationCode: z.string().optional(),

  // Contacto
  phone: z.string().optional(),
  address: z.string().optional(),
  canton: z.string().optional(),
  province: z.string().optional(),

  // Emails
  invoiceEmail: z.string().email().optional(),
  quoteEmail: z.string().email().optional(),
  preferredCurrency: z.enum(['CRC', 'USD', 'EUR']).optional().default('CRC'),

  // Primer usuario admin
  userEmail: z.string().email(),
  userName: z.string().min(2),
  userClerkId: z.string(),
});

export async function companyRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/companies/register — Registro de nueva empresa (público)
  app.post('/register', async (request, reply) => {
    const body = registerCompanySchema.parse(request.body);

    // Verificar que la cédula no esté ya registrada
    const existing = await prisma.company.findUnique({
      where: { cedula: body.cedula },
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Ya existe una empresa registrada con esa cédula jurídica',
      });
    }

    // Crear empresa + primer usuario en transacción
    const company = await prisma.$transaction(async (tx: any) => {
      const newCompany = await tx.company.create({
        data: {
          name: body.name,
          legalName: body.legalName,
          cedula: body.cedula,
          type: body.type,
          exonerationCode: body.type === 'FREE_ZONE' ? (body.exonerationCode ?? null) : null,
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.canton !== undefined ? { canton: body.canton } : {}),
          ...(body.province !== undefined ? { province: body.province } : {}),
          ...(body.invoiceEmail !== undefined ? { invoiceEmail: body.invoiceEmail } : {}),
          ...(body.quoteEmail !== undefined ? { quoteEmail: body.quoteEmail } : {}),
          preferredCurrency: body.preferredCurrency,
          status: 'PENDING',
        },
      });

      await tx.user.create({
        data: {
          clerkId: body.userClerkId,
          companyId: newCompany.id,
          email: body.userEmail,
          name: body.userName,
          role: 'ADMIN',
        },
      });

      // Crear solicitud de aprobación
      await tx.approvalRequest.create({
        data: {
          companyId: newCompany.id,
          type: 'REGISTRATION',
          data: {
            name: body.name,
            cedula: body.cedula,
            type: body.type,
            contactEmail: body.userEmail,
          },
        },
      });

      return newCompany;
    });

    return reply.status(201).send({
      id: company.id,
      name: company.name,
      status: 'PENDING',
      message: 'Su empresa ha sido registrada. El equipo de Aritth la revisará en breve.',
    });
  });

  // GET /api/companies/me — Info de empresa del usuario autenticado
  app.get('/me', {
    preHandler: [requireClient],
  }, async (request) => {
    const user = (request as any).clientUser;

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        cedula: true,
        type: true,
        status: true,
        creditLimit: true,
        currentBalance: true,
        creditTermsDays: true,
        phone: true,
        address: true,
        canton: true,
        province: true,
        invoiceEmail: true,
        quoteEmail: true,
        preferredCurrency: true,
        createdAt: true,
        // Privado - no exponer:
        // exonerationCode: omitido
        // approvedBy: omitido
      },
    });

    return {
      ...company,
      availableCredit: Number(company.creditLimit) - Number(company.currentBalance),
    };
  });

  // GET /api/companies/me/addresses
  app.get('/me/addresses', {
    preHandler: [requireClient],
  }, async (request) => {
    const user = (request as any).clientUser;

    return prisma.address.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  });

  // POST /api/companies/me/addresses — Agregar dirección (solo ADMIN)
  app.post('/me/addresses', {
    preHandler: [requireClientRole(['ADMIN'])],
  }, async (request, reply) => {
    const user = (request as any).clientUser;
    const body = z.object({
      label: z.string().min(1).max(50),
      address: z.string().min(5),
      canton: z.string(),
      province: z.string(),
      contactName: z.string().optional(),
      contactPhone: z.string().optional(),
      isDefault: z.boolean().optional().default(false),
    }).parse(request.body);

    if (body.isDefault) {
      // Quitar default de otras direcciones
      await prisma.address.updateMany({
        where: { companyId: user.companyId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { ...body, companyId: user.companyId },
    });

    return reply.status(201).send(address);
  });

  // GET /api/companies/me/users — Lista de usuarios de la empresa
  app.get('/me/users', {
    preHandler: [requireClientRole(['ADMIN'])],
  }, async (request) => {
    const user = (request as any).clientUser;

    return prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  });
}