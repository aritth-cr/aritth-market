// technical-documents/repository.ts
import { prisma } from '../../shared/prisma/client.js';

// Use string types to avoid dependency on Prisma generated client version
type TechnicalDocumentType = string;
type DocumentVisibility = string;

export interface TechnicalDocumentListFilters {
  productId?: string;
  type?: TechnicalDocumentType;
  visibility?: DocumentVisibility;
  language?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTechnicalDocumentInput {
  productId?: string;
  title: string;
  type?: TechnicalDocumentType;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  language?: string;
  visibility?: DocumentVisibility;
  uploadedBy?: string;
  isActive?: boolean;
}

export type UpdateTechnicalDocumentInput = Partial<CreateTechnicalDocumentInput>;

export class TechnicalDocumentsRepository {
  async list(filters: TechnicalDocumentListFilters = {}) {
    const {
      productId,
      type,
      visibility,
      language,
      isActive,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};
    if (productId !== undefined) where.productId = productId;
    if (type !== undefined) where.type = type;
    if (visibility !== undefined) where.visibility = visibility;
    if (language !== undefined) where.language = language;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.technicalDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          versions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.technicalDocument.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return prisma.technicalDocument.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        versions: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async create(data: CreateTechnicalDocumentInput) {
    return prisma.technicalDocument.create({ data: data as any });
  }

  async update(id: string, data: UpdateTechnicalDocumentInput) {
    return prisma.technicalDocument.update({ where: { id }, data: data as any });
  }

  async deactivate(id: string) {
    return prisma.technicalDocument.update({ where: { id }, data: { isActive: false } });
  }
}

export const technicalDocumentsRepository = new TechnicalDocumentsRepository();
