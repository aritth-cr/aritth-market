// operational-alerts/service.ts
import { prisma } from '../../shared/prisma/client.js';

// Use string types to avoid dependency on Prisma generated client version
type OperationalAlertType = string;
type AlertSeverity = string;

export interface CreateOperationalAlertInput {
  type: OperationalAlertType;
  severity?: AlertSeverity;
  title: string;
  message: string;
  entity?: string;
  entityId?: string;
}

export interface OperationalAlertListFilters {
  type?: OperationalAlertType;
  severity?: AlertSeverity;
  isResolved?: boolean;
  page?: number;
  limit?: number;
}

export class OperationalAlertsService {
  async list(filters: OperationalAlertListFilters = {}) {
    const { type, severity, isResolved, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (type !== undefined) where.type = type;
    if (severity !== undefined) where.severity = severity;
    if (isResolved !== undefined) where.isResolved = isResolved;

    const [data, total] = await Promise.all([
      prisma.operationalAlert.findMany({
        where,
        orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.operationalAlert.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getById(id: string) {
    const alert = await prisma.operationalAlert.findUnique({ where: { id } });
    if (!alert) throw { statusCode: 404, message: 'OperationalAlert not found' };
    return alert;
  }

  async create(data: CreateOperationalAlertInput) {
    return prisma.operationalAlert.create({ data: data as any });
  }

  async resolve(id: string, resolvedBy: string) {
    await this.getById(id);
    return prisma.operationalAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async unresolve(id: string) {
    await this.getById(id);
    return prisma.operationalAlert.update({
      where: { id },
      data: {
        isResolved: false,
        resolvedAt: null,
        resolvedBy: null,
      },
    });
  }

  /** Helper to fire an alert from scrapers / jobs */
  static async fire(data: CreateOperationalAlertInput): Promise<void> {
    try {
      await prisma.operationalAlert.create({ data: data as any });
    } catch {
      // Non-blocking — don't let alert creation crash callers
      console.error('[OperationalAlert] Failed to create alert:', data.title);
    }
  }
}

export const operationalAlertsService = new OperationalAlertsService();
