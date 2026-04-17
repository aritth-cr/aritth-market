// ====================================================
// SUPPLIER API — Type contracts & helpers
// ====================================================

export interface SupplierProductCreate {
  name: string;
  canonicalName?: string;
  normalizedName?: string;
  manufacturerName?: string;
  manufacturerPartNumber?: string;
  brand?: string;
  model?: string;
  sku?: string;
  category: string;
  subcategory?: string;
  unit?: string;
  description?: string;
  imageUrl?: string;
  storePrice: number;
  inStock?: boolean;
}

export interface SupplierProductUpdate {
  id?: string;
  sku?: string;
  canonicalName?: string;
  normalizedName?: string;
  manufacturerName?: string;
  manufacturerPartNumber?: string;
  brand?: string;
  model?: string;
  category?: string;
  subcategory?: string;
  unit?: string;
  description?: string;
  imageUrl?: string;
  storePrice?: number;
  inStock?: boolean;
}

export interface SupplierProductDelete {
  id?: string;
  sku?: string;
}

export interface SupplierOfferUpsert {
  productId: string;
  supplierSku?: string;
  supplierName: string;
  costPrice: number;
  currency?: string;
  minQuantity?: number;
  leadTimeDays?: number;
  inStock?: boolean;
  stockQty?: number;
  moq?: number;
  isNational?: boolean;
  isManufacturerOffer?: boolean;
}

/**
 * Build a synthetic SKU-like internal identifier from product fields.
 * Used when a product doesn't have a native SKU.
 */
export function buildSkuInternal(data: {
  manufacturerName?: string | null;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  sku?: string | null;
}): string | null {
  if (data.sku) return data.sku;
  if (data.manufacturerPartNumber) {
    const prefix = (data.manufacturerName ?? data.brand ?? 'UNK')
      .replace(/\s+/g, '_')
      .toUpperCase()
      .slice(0, 10);
    return `${prefix}-${data.manufacturerPartNumber}`;
  }
  return null;
}
