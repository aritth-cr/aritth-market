// supplier-offers/repository.ts
import { prisma } from '../../shared/prisma/client.js';

// Use string type to avoid dependency on Prisma generated client version
type CurrencyCode = string;

export interface SupplierOfferListFilters {
  supplierId?: string;
  productId?: string;
  isActive?: boolean;
  inStock?: boolean;
  currency?: CurrencyCode;
  page?: number;
  limit?: number;
}

export interface CreateSupplierOfferInput {
  supplierId: string;
  productId?: string;
  supplierSku?: string;
  supplierName: string;
  costPrice: number;
  currency?: CurrencyCode;
  minQuantity?: number;
  leadTimeDays?: number;
  landedCostUsd?: number;
  landedCostLocal?: number;
  inStock?: boolean;
  isActive?: boolean;
  lastCheckedAt?: Date;
}

export type UpdateSupplierOfferInput = Partial<Omit<CreateSupplierOfferInput, 'supplierId'>>;

export class SupplierOffersRepository {
  async list(filters: SupplierOfferListFilters = {}) {
    const {
      supplierId,
      productId,
      isActive,
      inStock,
      currency,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (productId !== undefined) where.productId = productId;
    if (isActive !== undefined) where.isActive = isActive;
    if (inStock !== undefined) where.inStock = inStock;
    if (currency !== undefined) where.currency = currency;

    const [data, total] = await Promise.all([
      prisma.supplierOffer.findMany({
        where,
        orderBy: { costPrice: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          supplier: { select: { id: true, displayName: true, internalCode: true, countryCode: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      prisma.supplierOffer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return prisma.supplierOffer.findUnique({
      where: { id },
      include: {
        supplier: true,
        product: { select: { id: true, name: true, sku: true } },
        pricingRules: { where: { isActive: true } },
      },
    });
  }

  async findBestOfferForProduct(productId: string) {
    return prisma.supplierOffer.findFirst({
      where: { productId, isActive: true, inStock: true },
      orderBy: { landedCostUsd: 'asc' },
      include: { supplier: true },
    });
  }

  async create(data: CreateSupplierOfferInput) {
    return prisma.supplierOffer.create({ data: data as any });
  }

  async update(id: string, data: UpdateSupplierOfferInput) {
    return prisma.supplierOffer.update({ where: { id }, data: data as any });
  }

  async deactivate(id: string) {
    return prisma.supplierOffer.update({ where: { id }, data: { isActive: false } });
  }
}

export const supplierOffersRepository = new SupplierOffersRepository();
