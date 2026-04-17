// ====================================================
// PARTNER API — Public type contracts & mappers
// ====================================================

export interface PublicProduct {
  id: string;
  canonicalName: string | null;
  normalizedName: string | null;
  manufacturerName: string | null;
  manufacturerPartNumber: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  category: string;
  subcategory: string | null;
  unit: string;
  imageUrl: string | null;
  imageUrls: string[];
  inStock: boolean;
  isPublished: boolean;
}

export interface PublicOffer {
  id: string;
  supplierSku: string | null;
  supplierName: string;
  costPrice: string;
  currency: string;
  minQuantity: number;
  leadTimeDays: number;
  inStock: boolean;
  isNational: boolean;
  isManufacturerOffer: boolean;
}

export interface PublicDocument {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  language: string | null;
  mimeType: string | null;
}

export interface QuoteInput {
  items: Array<{
    productId: string;
    supplierOfferId?: string | null;
    quantity: number;
  }>;
  notes?: string;
  currency?: string;
}

export interface QuoteResult {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

/**
 * Maps a raw Prisma Product record to the public API shape.
 */
export function toPublicProduct(product: any): PublicProduct {
  return {
    id: product.id,
    canonicalName: product.canonicalName ?? null,
    normalizedName: product.normalizedName ?? null,
    manufacturerName: product.manufacturerName ?? null,
    manufacturerPartNumber: product.manufacturerPartNumber ?? null,
    brand: product.brand ?? null,
    model: product.model ?? null,
    sku: product.sku ?? null,
    category: product.category,
    subcategory: product.subcategory ?? null,
    unit: product.unit,
    imageUrl: product.imageUrl ?? null,
    imageUrls: product.imageUrls ?? [],
    inStock: product.inStock,
    isPublished: product.isPublished,
  };
}

/**
 * Maps a raw Prisma SupplierOffer record to the public API shape.
 * The supplier name is masked via `displayName` if hidden from client.
 */
export function toPublicOffer(offer: any): PublicOffer {
  return {
    id: offer.id,
    supplierSku: offer.supplierSku ?? null,
    supplierName: offer.supplier?.isHiddenFromClient
      ? 'Proveedor verificado'
      : (offer.supplier?.displayName ?? offer.supplierName),
    costPrice: String(offer.costPrice),
    currency: offer.currency ?? offer.currencyCode ?? 'USD',
    minQuantity: offer.minQuantity ?? 1,
    leadTimeDays: offer.leadTimeDays ?? 0,
    inStock: offer.inStock,
    isNational: offer.isNational ?? false,
    isManufacturerOffer: offer.isManufacturerOffer ?? false,
  };
}

/**
 * Maps a TechnicalDocument to the public shape.
 */
export function toPublicDocument(doc: any): PublicDocument {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    fileUrl: doc.fileUrl,
    language: doc.language ?? null,
    mimeType: doc.mimeType ?? null,
  };
}
