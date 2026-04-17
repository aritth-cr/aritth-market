// technical-documents/service.ts
import {
  technicalDocumentsRepository,
  type CreateTechnicalDocumentInput,
  type UpdateTechnicalDocumentInput,
  type TechnicalDocumentListFilters,
} from './repository.js';

export class TechnicalDocumentsService {
  async list(filters: TechnicalDocumentListFilters = {}) {
    return technicalDocumentsRepository.list(filters);
  }

  async getById(id: string) {
    const doc = await technicalDocumentsRepository.findById(id);
    if (!doc) throw { statusCode: 404, message: 'TechnicalDocument not found' };
    return doc;
  }

  async create(data: CreateTechnicalDocumentInput) {
    return technicalDocumentsRepository.create(data);
  }

  async update(id: string, data: UpdateTechnicalDocumentInput) {
    await this.getById(id);
    return technicalDocumentsRepository.update(id, data);
  }

  async deactivate(id: string) {
    await this.getById(id);
    return technicalDocumentsRepository.deactivate(id);
  }
}

export const technicalDocumentsService = new TechnicalDocumentsService();
