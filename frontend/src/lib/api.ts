/**
 * Cliente API para Aritth Market
 * Todas las llamadas al backend pasan por aquí
 */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new ApiError(response.status, error.message ?? 'Error del servidor', error.error);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- Productos ----
export const productsApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/products?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/products/${id}`, { token }),

  categories: (token: string) =>
    apiFetch('/api/products/categories/list', { token }),

  suggestions: (q: string, token: string) =>
    apiFetch(`/api/products/suggestions?q=${encodeURIComponent(q)}`, { token }),

  setAlert: (id: string, type: 'STOCK' | 'PRICE', token: string) =>
    apiFetch(`/api/products/${id}/alert`, {
      method: 'POST',
      body: JSON.stringify({ type }),
      token,
    }),
};

// ---- Carrito ----
export const cartApi = {
  get: (token: string) =>
    apiFetch('/api/cart', { token }),

  count: (token: string) =>
    apiFetch<{ count: number }>('/api/cart/count', { token }),

  addItem: (productId: string, quantity: number, token: string) =>
    apiFetch('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
      token,
    }),

  removeItem: (productId: string, token: string) =>
    apiFetch(`/api/cart/items/${productId}`, { method: 'DELETE', token }),
};

// ---- Cotizaciones ----
export const quotesApi = {
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  list: (token: string) =>
    apiFetch('/api/quotes', { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/quotes/${id}`, { token }),

  confirm: (id: string, poNumber: string, token: string) =>
    apiFetch(`/api/quotes/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ poNumber }),
      token,
    }),
};

// ---- Empresa ----
export const companyApi = {
  register: (data: Record<string, unknown>) =>
    apiFetch('/api/companies/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    apiFetch('/api/companies/me', { token }),

  addresses: (token: string) =>
    apiFetch('/api/companies/me/addresses', { token }),
};

// ---- Admin ----
export const adminApi = {
  dashboard: (token: string) =>
    apiFetch('/api/admin/dashboard', { token }),

  companies: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/companies?${new URLSearchParams(params)}`, { token }),

  updateCompany: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  pendingInvoices: (token: string) =>
    apiFetch('/api/admin/invoices/pending', { token }),

  approveInvoice: (id: string, notes: string, token: string) =>
    apiFetch(`/api/admin/invoices/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
      token,
    }),

  receivables: (token: string) =>
    apiFetch('/api/admin/finance/receivables', { token }),

  scrapingStatus: (token: string) =>
    apiFetch('/api/admin/scraping/status', { token }),

  triggerScraping: (storeId: string, token: string) =>
    apiFetch(`/api/admin/scraping/${storeId}/trigger`, { method: 'POST', token }),
};

// ---- Órdenes ----
export const ordersApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/orders?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/orders/${id}`, { token }),

  tracking: (id: string, token: string) =>
    apiFetch(`/api/orders/${id}/tracking`, { token }),

  cancel: (id: string, token: string) =>
    apiFetch(`/api/orders/${id}/cancel`, { method: 'POST', token }),

  // Admin
  adminList: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/orders/admin/list?${new URLSearchParams(params)}`, { token }),

  adminUpdateStatus: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/orders/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  adminUpdateDelivery: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/orders/admin/${id}/delivery`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),
};

// ---- Facturas ----
export const invoicesApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/invoices?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/invoices/${id}`, { token }),

  pdf: (id: string, token: string) =>
    apiFetch<{ pdfUrl: string }>(`/api/invoices/${id}/pdf`, { token }),

  // Admin
  adminCreate: (data: { orderId: string; dueDate: string; notes?: string }, token: string) =>
    apiFetch('/api/invoices/admin', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  adminList: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/invoices/admin/list?${new URLSearchParams(params)}`, { token }),

  adminReview: (id: string, data: { action: 'approve' | 'reject'; reviewNotes?: string; gtiCode?: string }, token: string) =>
    apiFetch(`/api/invoices/admin/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  adminSend: (id: string, token: string) =>
    apiFetch(`/api/invoices/admin/${id}/send`, { method: 'PATCH', token }),

  adminRegisterPayment: (id: string, paidAt: string | undefined, token: string) =>
    apiFetch(`/api/invoices/admin/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paidAt }),
      token,
    }),

  adminAddNote: (id: string, content: string, token: string) =>
    apiFetch(`/api/invoices/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }), token }),
};

// ---- FASE 5: SUPPLIERS ----
export const suppliersApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/suppliers?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/admin/suppliers/${id}`, { token }),

  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/api/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/admin/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  verify: (id: string, data: { type: string; evidence?: string; notes?: string }, token: string) =>
    apiFetch(`/api/admin/suppliers/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  approve: (id: string, token: string) =>
    apiFetch(`/api/admin/suppliers/${id}/approve`, { method: 'POST', token }),
};

// ---- FASE 5: PRODUCTS MASTER ----
export const productsMasterApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/products/master?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/admin/products/master/${id}`, { token }),

  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/api/admin/products/master', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/admin/products/master/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  publish: (id: string, token: string) =>
    apiFetch(`/api/admin/products/master/${id}/publish`, { method: 'POST', token }),
};

// ---- FASE 5: DEDUPLICATION ----
export const deduplicationApi = {
  list: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/products/deduplication?${new URLSearchParams(params)}`, { token }),

  get: (id: string, token: string) =>
    apiFetch(`/api/admin/products/deduplication/${id}`, { token }),

  resolve: (id: string, data: { resolvedAs: string; notes?: string }, token: string) =>
    apiFetch(`/api/admin/products/deduplication/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  requestManualReview: (id: string, token: string) =>
    apiFetch(`/api/admin/products/deduplication/${id}/review`, { method: 'POST', token }),
};

// ---- FASE 5: PRICING ----
export const pricingApi = {
  listModels: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/pricing/models?${new URLSearchParams(params)}`, { token }),

  getModel: (id: string, token: string) =>
    apiFetch(`/api/admin/pricing/models/${id}`, { token }),

  createModel: (data: Record<string, unknown>, token: string) =>
    apiFetch('/api/admin/pricing/models', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  updateModel: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/api/admin/pricing/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  listLandedCosts: (params: Record<string, string>, token: string) =>
    apiFetch(`/api/admin/pricing/landed-costs?${new URLSearchParams(params)}`, { token }),

  getLandedCost: (id: string, token: string) =>
    apiFetch(`/api/admin/pricing/landed-costs/${id}`, { token }),

  calculateLandedCost: (data: Record<string, unknown>, token: string) =>
    apiFetch('/api/admin/pricing/landed-costs/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};
