// suppliers/service.ts
import { suppliersRepository, type CreateSupplierInput, type UpdateSupplierInput } from './repository.js';
import type { SupplierListFilters } from './repository.js';

function normalizeInternalCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
}

export class SuppliersService {
  async list(filters: SupplierListFilters = {}) {
    return suppliersRepository.list(filters);
  }

  async getById(id: string) {
    const supplier = await suppliersRepository.findById(id);
    if (!supplier) throw { statusCode: 404, message: 'Supplier not found' };
    return supplier;
  }

  async getByInternalCode(internalCode: string) {
    const supplier = await suppliersRepository.findByInternalCode(internalCode);
    if (!supplier) throw { statusCode: 404, message: 'Supplier not found' };
    return supplier;
  }

  async create(data: CreateSupplierInput) {
    const existing = await suppliersRepository.findByInternalCode(data.internalCode);
    if (existing) throw { statusCode: 409, message: `Supplier with internalCode '${data.internalCode}' already exists` };

    return suppliersRepository.create({
      ...data,
      internalCode: normalizeInternalCode(data.internalCode),
      verifiedBadge: data.isManufacturerOfficial === true ? true : (data.verifiedBadge ?? false),
    });
  }

  async update(id: string, payload: UpdateSupplierInput) {
    await this.getById(id);

    return suppliersRepository.update(id, {
      ...payload,
      ...(payload.isManufacturerOfficial === true ? { verifiedBadge: true } : {}),
    } as any);
  }

  async deactivate(id: string) {
    await this.getById(id);
    return suppliersRepository.deactivate(id);
  }
}

export const suppliersService = new SuppliersService();
