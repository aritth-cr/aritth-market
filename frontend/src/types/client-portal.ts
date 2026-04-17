/**
 * Aritth Market — Client Portal Types
 * Tipos exclusivos del portal cliente.
 * REGLA: nunca exponer storeId, storeName ni supplierName real.
 * Solo se expone supplierInternalCode al cliente.
 */

// ============================================================================
// BÚSQUEDA AGRUPADA
// ============================================================================

export interface ClientOfferPublic {
  id: string;
  supplierInternalCode: string;   // código interno, nunca el nombre real
  currencyCode?: string;
  unitPrice?: number;
  isNational?: boolean;
  lastValidatedAt?: string | null;
}

export interface ClientSearchResultGroup {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  manufacturerName?: string | null;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  category?: string | null;
  imageUrls: string[];
  description?: string | null;
  offers: ClientOfferPublic[];
  bestOffer?: ClientOfferPublic;
  manufacturerOfferCount: number;
  nationalOfferCount: number;
  internationalOfferCount: number;
  score: number;
}

export interface ClientSearchResponse {
  query: string;
  languageCode: string;
  total: number;
  items: ClientSearchResultGroup[];
}

// ============================================================================
// DETALLE DE PRODUCTO
// ============================================================================

export interface ClientTechnicalDocument {
  id: string;
  title: string;
  typeCode?: string;
  url: string;
  languageCode?: string;
}

export interface ClientProductDetail {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  manufacturerName?: string | null;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  imageUrls: string[];
  offers: ClientOfferPublic[];
  bestOffer?: ClientOfferPublic;
  manufacturerOfferCount: number;
  nationalOfferCount: number;
  internationalOfferCount: number;
  technicalDocuments?: ClientTechnicalDocument[];
  synonyms?: string[];
}

// ============================================================================
// PERFIL DE EMPRESA
// ============================================================================

export interface ClientCompanyProfile {
  id: string;
  name: string;
  legalName: string;
  cedula: string;
  type: 'FREE_ZONE' | 'REGULAR';
  status: string;
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  isExempt: boolean;
  phone: string;
  email: string;
  createdAt: string;
}

// ============================================================================
// FACTURAS (vista cliente)
// ============================================================================

export interface ClientInvoice {
  id: string;
  number: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  ivaAmount: number;
  total: number;
  dueDate: string;
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  order?: {
    id: string;
    number: string;
    poNumber: string | null;
  };
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

export interface ClientNotification {
  id: string;
  title: string;
  message: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  resolvedAt?: string | null;
}

// ============================================================================
// SOLICITUDES DE COMPRA (PROCUREMENT)
// ============================================================================

export interface ClientProcurementRequest {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    canonicalName?: string;
    manufacturerPartNumber?: string | null;
    brand?: string | null;
  };
  selectedOffer?: {
    id: string;
    supplierInternalCode: string;
    currencyCode?: string;
    unitPrice?: number;
    isNational?: boolean;
  };
}
