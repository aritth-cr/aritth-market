import { env } from '../../config/env.js';

export interface PriceBreakdown {
  storePrice: number;      // Precio de la tienda (sin IVA)
  aritthIva: number;       // IVA que paga Aritth al comprar (13%)
  aritthCost: number;      // storePrice + aritthIva
  aritthMargin: number;    // Ganancia Aritth (10%)
  subtotalUnit: number;    // Precio unitario para el cliente (sin IVA cliente)
  clientIvaRate: number;   // 0 si exento (Zona Franca), 0.13 si regular
  clientIva: number;       // IVA que paga el cliente
  unitTotal: number;       // Precio final unitario con todo incluido
}

export interface QuoteTotals {
  subtotal: number;        // Suma de subtotals sin IVA cliente
  ivaAmount: number;       // Total IVA cliente
  shipping: number;        // Flete (0 por ahora)
  total: number;           // Gran total en CRC
  totalUsd: number | null;
  totalEur: number | null;
}

/**
 * Calcula el precio de un producto para un cliente.
 *
 * Lógica de precios AMT:
 * 1. storePrice → precio de tienda (EPA, Novex, etc.) SIN IVA
 * 2. aritthCost = storePrice × 1.13  (Aritth paga IVA al comprar)
 * 3. subtotalUnit = aritthCost × (1 + margin)  (margen de Aritth)
 * 4. Si cliente es Zona Franca: clientIvaRate = 0
 *    Si cliente es regular: clientIvaRate = 0.13
 * 5. unitTotal = subtotalUnit × (1 + clientIvaRate)
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
 * Calcula totales de una cotización
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
 * Calcula la ganancia de Aritth (SOLO para back-office)
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
    marginPercent: margin * 100,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
