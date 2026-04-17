// pricing/calculator.ts
import { env } from '../../config/env.js';

// ─────────────────────────────────────────
// INTERFACES — backward compat + multi-source
// ─────────────────────────────────────────

export interface PriceBreakdown {
  storePrice: number;      // Precio de la tienda (sin IVA)
  aritthIva: number;       // IVA que paga Aritth al comprar (13%)
  aritthCost: number;      // storePrice + aritthIva
  aritthMargin: number;    // Ganancia Aritth
  subtotalUnit: number;    // Precio unitario para el cliente (sin IVA cliente)
  clientIvaRate: number;   // 0 si exento (Zona Franca), 0.13 si regular
  clientIva: number;       // IVA que paga el cliente
  unitTotal: number;       // Precio final unitario con todo incluido
}

export interface QuoteTotals {
  subtotal: number;        // Suma de subtotals sin IVA cliente
  ivaAmount: number;       // Total IVA cliente
  shipping: number;        // Flete
  total: number;           // Gran total en CRC
  totalUsd: number | null;
  totalEur: number | null;
}

// New multi-source interfaces
export interface QuoteLineInput {
  unitPrice: number;
  quantity: number;
  taxRate?: number;        // e.g. 0.13; defaults to 0
}

export interface QuoteLinesTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface LandedCostInput {
  supplierUnitPrice: number;   // Unit price from supplier in USD (or local currency)
  quantity?: number;           // Units ordered (default 1)
  freight?: number;            // Total freight cost for shipment
  dutyPercent?: number;        // Import duties as decimal (e.g. 0.05 for 5%)
  insurancePercent?: number;   // Insurance as decimal (e.g. 0.01 for 1%)
  ivaPercent?: number;         // IVA/tax as decimal (defaults to env.IVA_RATE)
  marginPercent?: number;      // Aritth margin as decimal (defaults to env.DEFAULT_MARGIN)
}

export interface LandedCostResult {
  supplierSubtotal: number;    // supplierUnitPrice × quantity
  freight: number;
  dutyAmount: number;
  insuranceAmount: number;
  ivaAmount: number;
  landedCostBeforeMargin: number;
  marginAmount: number;
  finalTotal: number;          // Total landed cost including margin
  finalUnitPrice: number;      // finalTotal / quantity
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

export function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}

/** @deprecated Use roundCurrency() */
function round(n: number): number {
  return roundCurrency(n);
}

/**
 * Normalizes a value to a decimal percent.
 * If val is undefined/null/NaN, returns fallback.
 * If val > 1, treats as percentage (e.g. 13 → 0.13).
 */
export function normalizePercent(val: number | undefined | null, fallback: number): number {
  if (val === undefined || val === null || !Number.isFinite(val)) return fallback;
  // If > 1, assume it was passed as 13 instead of 0.13
  return val > 1 ? val / 100 : val;
}

// ─────────────────────────────────────────
// MULTI-SOURCE — Landed Cost Calculator
// ─────────────────────────────────────────

/**
 * Calculates the full landed cost of importing goods from a supplier.
 * Used for multi-source pricing (non-CR suppliers, international procurement).
 */
export function calculateLandedCost(input: LandedCostInput): LandedCostResult {
  const quantity = Number.isFinite(input.quantity) && (input.quantity ?? 0) > 0 ? input.quantity! : 1;
  const supplierSubtotal = roundCurrency(input.supplierUnitPrice * quantity);

  const freight = Number.isFinite(input.freight) ? (input.freight ?? 0) : 0;
  const dutyPercent = normalizePercent(input.dutyPercent, 0);
  const insurancePercent = normalizePercent(input.insurancePercent, 0);
  const ivaPercent = normalizePercent(input.ivaPercent, env.IVA_RATE);
  const marginPercent = normalizePercent(input.marginPercent, env.DEFAULT_MARGIN);

  const dutyAmount = supplierSubtotal * dutyPercent;
  const insuranceAmount = supplierSubtotal * insurancePercent;
  const ivaBase = supplierSubtotal + freight + dutyAmount + insuranceAmount;
  const ivaAmount = ivaBase * ivaPercent;

  const landedCostBeforeMargin = supplierSubtotal + freight + dutyAmount + insuranceAmount + ivaAmount;
  const marginAmount = landedCostBeforeMargin * marginPercent;
  const finalTotal = landedCostBeforeMargin + marginAmount;
  const finalUnitPrice = quantity > 0 ? finalTotal / quantity : finalTotal;

  return {
    supplierSubtotal: roundCurrency(supplierSubtotal),
    freight: roundCurrency(freight),
    dutyAmount: roundCurrency(dutyAmount),
    insuranceAmount: roundCurrency(insuranceAmount),
    ivaAmount: roundCurrency(ivaAmount),
    landedCostBeforeMargin: roundCurrency(landedCostBeforeMargin),
    marginAmount: roundCurrency(marginAmount),
    finalTotal: roundCurrency(finalTotal),
    finalUnitPrice: roundCurrency(finalUnitPrice),
  };
}

// ─────────────────────────────────────────
// MULTI-SOURCE — Quote Lines Totals
// ─────────────────────────────────────────

/**
 * Calculates totals from an array of QuoteLineInput items.
 * Supports per-line tax rates (multi-country sourcing).
 */
export function calculateQuoteLinesTotals(
  items: QuoteLineInput[],
  shipping = 0,
): QuoteLinesTotals {
  const safeShipping = Number.isFinite(shipping) && shipping >= 0 ? shipping : 0;

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    return sum + unitPrice * quantity;
  }, 0);

  const tax = items.reduce((sum, item) => {
    const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const taxRate = normalizePercent(item.taxRate, 0);
    return sum + unitPrice * quantity * taxRate;
  }, 0);

  return {
    subtotal: roundCurrency(subtotal),
    tax: roundCurrency(tax),
    shipping: roundCurrency(safeShipping),
    total: roundCurrency(subtotal + tax + safeShipping),
  };
}

// ─────────────────────────────────────────
// LEGACY — backward-compatible functions (CR domestic pricing)
// ─────────────────────────────────────────

/**
 * Calcula el precio de un producto para un cliente.
 * @deprecated Use calculateLandedCost() for multi-source pricing.
 */
export function calculateProductPrice(
  storePrice: number,
  isExempt: boolean,
  margin: number = env.DEFAULT_MARGIN,
): PriceBreakdown {
  const ivaRate = env.IVA_RATE; // 0.13

  const aritthIva = storePrice * ivaRate;
  const aritthCost = storePrice + aritthIva;
  const aritthMargin = aritthCost * margin;
  const subtotalUnit = aritthCost + aritthMargin;

  const clientIvaRate = isExempt ? 0 : ivaRate;
  const clientIva = subtotalUnit * clientIvaRate;
  const unitTotal = subtotalUnit + clientIva;

  return {
    storePrice: round(storePrice),
    aritthIva: round(aritthIva),
    aritthCost: round(aritthCost),
    aritthMargin: round(aritthMargin),
    subtotalUnit: round(subtotalUnit),
    clientIvaRate,
    clientIva: round(clientIva),
    unitTotal: round(unitTotal),
  };
}

/**
 * Calcula totales de una cotización (legacy CR domestic).
 * @deprecated Use calculateQuoteLinesTotals() for multi-source.
 */
export function calculateQuoteTotals(
  items: Array<{ pricing: PriceBreakdown; quantity: number }>,
  shipping = 0,
  usdRate?: number,
  eurRate?: number,
): QuoteTotals {
  let subtotal = 0;
  let ivaAmount = 0;

  for (const item of items) {
    subtotal += item.pricing.subtotalUnit * item.quantity;
    ivaAmount += item.pricing.clientIva * item.quantity;
  }

  const total = subtotal + ivaAmount + shipping;

  return {
    subtotal: round(subtotal),
    ivaAmount: round(ivaAmount),
    shipping: round(shipping),
    total: round(total),
    totalUsd: usdRate ? round(total / usdRate) : null,
    totalEur: eurRate ? round(total / eurRate) : null,
  };
}

/**
 * Calcula la ganancia de Aritth (SOLO para back-office).
 */
export function calculateAritthProfit(
  storePrice: number,
  quantity: number,
  margin: number = env.DEFAULT_MARGIN,
): { revenue: number; cost: number; profit: number; marginPercent: number } {
  const aritthCost = storePrice * (1 + env.IVA_RATE);
  const subtotalUnit = aritthCost * (1 + margin);
  const revenue = subtotalUnit * quantity;
  const cost = aritthCost * quantity;
  const profit = revenue - cost;

  return {
    revenue: round(revenue),
    cost: round(cost),
    profit: round(profit),
    marginPercent: Math.round(margin * 1000) / 10,
  };
}
