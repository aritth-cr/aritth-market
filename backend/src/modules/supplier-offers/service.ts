// supplier-offers/service.ts
import {
  supplierOffersRepository,
  type CreateSupplierOfferInput,
  type UpdateSupplierOfferInput,
  type SupplierOfferListFilters,
} from './repository.js';

export class SupplierOffersService {
  async list(filters: SupplierOfferListFilters = {}) {
    return supplierOffersRepository.list(filters);
  }

  async getById(id: string) {
    const offer = await supplierOffersRepository.findById(id);
    if (!offer) throw { statusCode: 404, message: 'SupplierOffer not found' };
    return offer;
  }

  async getBestOfferForProduct(productId: string) {
    return supplierOffersRepository.findBestOfferForProduct(productId);
  }

  async create(data: CreateSupplierOfferInput) {
    return supplierOffersRepository.create(data);
  }

  async update(id: string, data: UpdateSupplierOfferInput) {
    await this.getById(id);
    return supplierOffersRepository.update(id, data);
  }

  async deactivate(id: string) {
    await this.getById(id);
    return supplierOffersRepository.deactivate(id);
  }
}

export const supplierOffersService = new SupplierOffersService();
