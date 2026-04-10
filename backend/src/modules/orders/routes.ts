import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { requireClient, requireAdmin } from '../../plugins/auth.js';
import { z } from 'zod';

// Esquemas de validación
const cancelOrderSchema = z.object({});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  estimatedDelivery: z.string().datetime().optional(),
  deliveryNotes: z.string().max(1000).optional(),
});

const updateDeliverySchema = z.object({
  estimatedDelivery: z.string().datetime().optional(),
  deliveryNotes: z.string().max(1000).optional(),
});

// Transiciones válidas de status
const validStatusTransitions: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Función auxiliar para validar transición de status
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  return validStatusTransitions[currentStatus]?.includes(newStatus) ?? false;
}

// Función auxiliar para formatear respuestas de lista
interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

function formatListResponse<T>(items: T[], total: number, page: number, limit: number): ListResponse<T> {
  return {
    data: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // ========== RUTAS DE CLIENTE ==========

  // GET /api/orders — Listar órdenes de la empresa con filtros opcionales
  app.get('/', {
    preHandler: [requireClient],
  }, async (request) => {
    const user = (request as any).clientUser;
    const { status, page = '1', limit = '20' } = request.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where: any = {
      companyId: user.companyId,
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          poNumber: true,
          createdAt: true,
          updatedAt: true,
          estimatedDelivery: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return formatListResponse(orders, total, pageNum, limitNum);
  });

  // GET /api/orders/:id — Detalle completo de orden
  app.get('/:id', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const user = (request as any).clientUser;
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        quote: {
          select: {
            id: true,
            number: true,
            status: true,
            subtotal: true,
            ivaAmount: true,
            total: true,
            pdfUrl: true,
            expiresAt: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                productSku: true,
                quantity: true,
                unit: true,
                unitPrice: true,
                ivaRate: true,
                ivaAmount: true,
                lineTotal: true,
                imageUrl: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            subtotal: true,
            ivaAmount: true,
            total: true,
            pdfUrl: true,
            dueDate: true,
            paidAt: true,
            reviewedAt: true,
            reviewNotes: true,
            gtiCode: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Orden no encontrada',
      });
    }

    return order;
  });

  // POST /api/orders/:id/cancel — Cancelar orden
  app.post('/:id/cancel', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const user = (request as any).clientUser;
    const { id } = request.params as { id: string };

    cancelOrderSchema.parse(request.body ?? {});

    const order = await prisma.order.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Orden no encontrada',
      });
    }

    // Validar que la orden se pueda cancelar
    if (!['CONFIRMED', 'PROCESSING'].includes(order.status)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'INVALID_OPERATION',
        message: `No se puede cancelar una orden en estado ${order.status}. Solo se pueden cancelar órdenes en estado CONFIRMED o PROCESSING.`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
      include: {
        invoice: {
          select: { id: true, number: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ORDER_CANCELLED',
        entity: 'Order',
        entityId: id,
        data: { orderNumber: order.number, previousStatus: order.status },
      },
    }).catch(() => {
      // Si falla el audit log, no interrumpir la operación
    });

    return reply.status(200).send({
      id: updatedOrder.id,
      number: updatedOrder.number,
      status: updatedOrder.status,
      message: 'Orden cancelada correctamente',
    });
  });

  // GET /api/orders/:id/tracking — Info de seguimiento
  app.get('/:id/tracking', {
    preHandler: [requireClient],
  }, async (request, reply) => {
    const user = (request as any).clientUser;
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, companyId: user.companyId },
      select: {
        id: true,
        number: true,
        status: true,
        estimatedDelivery: true,
        deliveryNotes: true,
        createdAt: true,
        updatedAt: true,
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            pdfUrl: true,
            dueDate: true,
            paidAt: true,
          },
        },
      },
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Orden no encontrada',
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.number,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      deliveryNotes: order.deliveryNotes,
      createdAt: order.createdAt,
      lastUpdate: order.updatedAt,
      invoice: order.invoice ? {
        invoiceNumber: order.invoice.number,
        invoiceStatus: order.invoice.status,
        invoicePdfUrl: order.invoice.pdfUrl,
        dueDate: order.invoice.dueDate,
        paidAt: order.invoice.paidAt,
      } : null,
    };
  });

  // ========== RUTAS DE ADMIN ==========

  // GET /api/orders/admin/list — Listar todas las órdenes con filtros
  app.get('/admin/list', {
    preHandler: [requireAdmin],
  }, async (request) => {
    const { status, companyId, page = '1', limit = '20' } = request.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              legalName: true,
              type: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return formatListResponse(orders, total, pageNum, limitNum);
  });

  // PATCH /api/orders/admin/:id/status — Cambiar status de orden
  app.patch('/admin/:id/status', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateStatusSchema.parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        status: true,
        companyId: true,
      },
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Orden no encontrada',
      });
    }

    // Validar transición de status
    if (!isValidStatusTransition(order.status, body.status)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'INVALID_OPERATION',
        message: `No se puede cambiar de ${order.status} a ${body.status}. Transición no permitida.`,
      });
    }

    const updateData: any = {
      status: body.status,
      updatedAt: new Date(),
    };

    if (body.estimatedDelivery) {
      updateData.estimatedDelivery = new Date(body.estimatedDelivery);
    }

    if (body.deliveryNotes !== undefined) {
      updateData.deliveryNotes = body.deliveryNotes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { name: true },
        },
        user: {
          select: { email: true, name: true },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (request as any).aritthUser.id,
        action: 'ORDER_STATUS_UPDATED',
        entity: 'Order',
        entityId: id,
        data: {
          orderNumber: order.number,
          previousStatus: order.status,
          newStatus: body.status,
          estimatedDelivery: body.estimatedDelivery,
          deliveryNotes: body.deliveryNotes,
        },
      },
    }).catch(() => {
      // Si falla el audit log, no interrumpir la operación
    });

    return reply.status(200).send({
      id: updatedOrder.id,
      number: updatedOrder.number,
      status: updatedOrder.status,
      estimatedDelivery: updatedOrder.estimatedDelivery,
      deliveryNotes: updatedOrder.deliveryNotes,
      updatedAt: updatedOrder.updatedAt,
      message: 'Estado de orden actualizado correctamente',
    });
  });

  // PATCH /api/orders/admin/:id/delivery — Actualizar fecha de entrega y notas
  app.patch('/admin/:id/delivery', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateDeliverySchema.parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        status: true,
      },
    });

    if (!order) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Orden no encontrada',
      });
    }

    // Validar que la orden esté en un estado donde se pueda actualizar entrega
    if (!['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'INVALID_OPERATION',
        message: `No se puede actualizar entrega de una orden en estado ${order.status}`,
      });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.estimatedDelivery) {
      updateData.estimatedDelivery = new Date(body.estimatedDelivery);
    }

    if (body.deliveryNotes !== undefined) {
      updateData.deliveryNotes = body.deliveryNotes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (request as any).aritthUser.id,
        action: 'ORDER_DELIVERY_UPDATED',
        entity: 'Order',
        entityId: id,
        data: {
          orderNumber: order.number,
          estimatedDelivery: body.estimatedDelivery,
          deliveryNotes: body.deliveryNotes,
        },
      },
    }).catch(() => {
      // Si falla el audit log, no interrumpir la operación
    });

    return reply.status(200).send({
      id: updatedOrder.id,
      number: updatedOrder.number,
      estimatedDelivery: updatedOrder.estimatedDelivery,
      deliveryNotes: updatedOrder.deliveryNotes,
      updatedAt: updatedOrder.updatedAt,
      message: 'Información de entrega actualizada correctamente',
    });
  });
}
