// promotions/service.ts
import { prisma } from '../../shared/prisma/client.js';

export interface PromotionListFilters {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePromotionInput {
  code: string;
  description?: string;
  discountType?: string;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  isActive?: boolean;
  validFrom: Date | string;
  validUntil: Date | string;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export class PromotionsService {
  async list(filters: PromotionListFilters = {}) {
    const { isActive, page = 1, limit = 50 } = filters;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: { validUntil: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promotion.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getById(id: string) {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw { statusCode: 404, message: 'Promotion not found' };
    return promo;
  }

  async getByCode(code: string) {
    const promo = await prisma.promotion.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo) throw { statusCode: 404, message: 'Promotion not found' };
    return promo;
  }

  async validate(code: string, orderAmount: number) {
    const promo = await prisma.promotion.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo || !promo.isActive) throw { statusCode: 404, message: 'Promotion not found or inactive' };

    const now = new Date();
    if (promo.validFrom > now) throw { statusCode: 400, message: 'Promotion not yet valid' };
    if (promo.validUntil < now) throw { statusCode: 400, message: 'Promotion has expired' };
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw { statusCode: 400, message: 'Promotion has reached maximum uses' };
    }
    if (promo.minOrderAmount !== null && orderAmount < Number(promo.minOrderAmount)) {
      throw { statusCode: 400, message: `Minimum order amount is ${promo.minOrderAmount}` };
    }

    return {
      valid: true,
      discount: {
        type: promo.discountType,
        value: Number(promo.discountValue),
      },
      promotion: promo,
    };
  }

  async create(data: CreatePromotionInput) {
    const existing = await prisma.promotion.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw { statusCode: 409, message: `Promotion with code '${data.code}' already exists` };

    return prisma.promotion.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      } as any,
    });
  }

  async update(id: string, data: UpdatePromotionInput) {
    await this.getById(id);
    return prisma.promotion.update({
      where: { id },
      data: data as any,
    });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.promotion.update({ where: { id }, data: { isActive: false } });
  }
}

export const promotionsService = new PromotionsService();
