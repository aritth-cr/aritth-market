/**
 * Aritth Market — Client Portal API
 * Helper dedicado para el portal cliente.
 * Separa los tipos y llamadas del cliente de los de admin.
 */

import type {
  ClientSearchResponse,
  ClientProductDetail,
  ClientInvoice,
  ClientCompanyProfile,
  ClientProcurementRequest,
} from '@/types/client-portal';

// ---- helpers internos ----

function getApiBaseUrl(): string {
  return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ============================================================================
// BÚSQUEDA
// ============================================================================

export async function searchClientProducts(
  token: string,
  params: {
    q: string;
    languageCode?: string;
    onlyNational?: boolean;
    onlyInternational?: boolean;
    pageSize?: number;
  }
): Promise<ClientSearchResponse> {
  const sp = new URLSearchParams();
  sp.set('q', params.q);
  if (params.languageCode) sp.set('languageCode', params.languageCode);
  if (params.onlyNational) sp.set('onlyNational', 'true');
  if (params.onlyInternational) sp.set('onlyInternational', 'true');
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));

  return apiFetch<ClientSearchResponse>(`/api/search?${sp.toString()}`, token);
}

/** Fallback cuando search no tiene índice: usa el endpoint de productos legacy */
export async function listCatalogFallback(token: string, query?: string): Promise<unknown> {
  const sp = new URLSearchParams();
  if (query) sp.set('q', query);

  return apiFetch<unknown>(`/api/products?${sp.toString()}`, token);
}

// ============================================================================
// DETALLE DE PRODUCTO
// ============================================================================

export async function getClientProductDetail(
  token: string,
  productId: string
): Promise<ClientProductDetail> {
  return apiFetch<ClientProductDetail>(`/api/products/${productId}`, token);
}

// ============================================================================
// FACTURAS (cliente)
// ============================================================================

export async function getClientInvoices(token: string): Promise<ClientInvoice[]> {
  const response = await apiFetch<
    { items?: ClientInvoice[]; invoices?: ClientInvoice[] }
  >('/api/invoices', token);
  return response.items ?? response.invoices ?? [];
}

export function getInvoiceDownloadUrl(invoiceId: string): string {
  return `${getApiBaseUrl()}/api/invoices/${invoiceId}/download`;
}

// ============================================================================
// PERFIL DE EMPRESA
// ============================================================================

export async function getClientCompanyProfile(token: string): Promise<ClientCompanyProfile> {
  return apiFetch<ClientCompanyProfile>('/api/companies/me', token);
}

// ============================================================================
// SOLICITUDES DE COMPRA
// ============================================================================

export async function getClientProcurementRequests(
  token: string
): Promise<ClientProcurementRequest[]> {
  const response = await apiFetch<
    { items?: ClientProcurementRequest[]; data?: ClientProcurementRequest[] }
  >('/api/procurement/requests', token);
  return response.items ?? response.data ?? [];
}

export async function createProcurementRequest(
  token: string,
  data: { productId?: string; notes?: string; offerId?: string }
): Promise<ClientProcurementRequest> {
  return apiFetch<ClientProcurementRequest>('/api/procurement/requests', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
