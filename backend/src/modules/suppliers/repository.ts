// suppliers/repository.ts
import { prisma } from '../../shared/prisma/client.js';

// Use string types to avoid dependency on Prisma generated client version
type SupplierType = string;
type CurrencyCode = string;

export interface SupplierListFilters {
  search?: string;
  type?: SupplierType;
  countryCode?: string;
  isActive?: boolean;
  verifiedBadge?: boolean;
  isManufacturerOfficial?: boolean;
  isHiddenFromClient?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateSupplierInput {
  internalCode: string;
  displayName: string;
  name?: string;
  legalName?: string;
  type?: SupplierType;
  sourceKind?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  currency?: CurrencyCode;
  websiteUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  verifiedBadge?: boolean;
  isManufacturerOfficial?: boolean;
  isHiddenFromClient?: boolean;
  notes?: string;
  isActive?: boolean;
  avgLeadTimeDays?: number;
  avgShippingCost?: number;
  avgDutiesRate?: number;
}

export type UpdateSupplierInput = Partial<Omit<CreateSupplierInput, 'internalCode'>>;

export class SuppliersRepository {
  async list(filters: SupplierListFilters = {}) {
    const {
      search,
      type,
      countryCode,
      isActive,
      verifiedBadge,
      isManufacturerOfficial,
      isHiddenFromClient,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { internalCode: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type !== undefined) where.type = type;
    if (countryCode !== undefined) where.countryCode = countryCode;
    if (isActive !== undefined) where.isActive = isActive;
    if (verifiedBadge !== undefined) where.verifiedBadge = verifiedBadge;
    if (isManufacturerOfficial !== undefined) where.isManufacturerOfficial = isManufacturerOfficial;
    if (isHiddenFromClient !== undefined) where.isHiddenFromClient = isHiddenFromClient;

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { offers: true } } },
      }),
      prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return prisma.supplier.findUnique({
      where: { id },
      include: { offers: { take: 10, orderBy: { updatedAt: 'desc' } } },
    });
  }

  async findByInternalCode(internalCode: string) {
    return prisma.supplier.findUnique({ where: { internalCode } });
  }

  async create(data: CreateSupplierInput) {
    return prisma.supplier.create({ data: data as any });
  }

  async update(id: string, data: UpdateSupplierInput) {
    return prisma.supplier.update({
      where: { id },
      data: data as any,
    });
  }

  async deactivate(id: string) {
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const suppliersRepository = new SuppliersRepository();
