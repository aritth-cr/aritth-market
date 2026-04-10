/**
 * Aritth Market - TypeScript Types
 * Frontend type definitions reflecting Prisma schema
 */

// ============================================================================
// ENUMS
// ============================================================================

export type CompanyType = 'FREE_ZONE' | 'REGULAR';
export type CompanyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type CompanyRole = 'ADMIN' | 'PURCHASER' | 'VIEWER';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type InvoiceStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';
export type Currency = 'CRC' | 'USD' | 'EUR';
export type ScrapingStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
export type AritthRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'INVOICE_REVIEWER'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'SUPPORT';

// ============================================================================
// COMPANY & USER
// ============================================================================

export interface Company {
  id: string;
  name: string;
  legalName: string;
  cedula: string;
  type: CompanyType;
  status: CompanyStatus;
  creditLimit: number;
  creditUsed: number;
  isExempt: boolean;
  phone: string;
  email: string;
  createdAt: string;
}

export interface User {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: CompanyRole;
  companyId: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// PRODUCTS & STORES
// ============================================================================

export interface SourceStore {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastScrapedAt: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  storePrice: number;
  inStock: boolean;
  imageUrl: string | null;
  unit: string;
  category: string | null;
  storeName: string;
  sourceStoreId: string;
  lastScrapedAt: string;
  embedding?: string | null;
  store?: SourceStore;
}

// ============================================================================
// CART
// ============================================================================

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Omit<Product, 'embedding'>;
}

export interface Cart {
  id: string;
  userId: string;
  isActive: boolean;
  items: CartItem[];
}

// ============================================================================
// QUOTES
// ============================================================================

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  quantity: number;
  unit: string;
  storePrice: number;
  aritthCost: number;
  unitPrice: number;
  ivaRate: number;
  ivaAmount: number;
  lineTotal: number;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  product?: Product;
}

export interface Quote {
  id: string;
  number: string;
  companyId: string;
  userId: string;
  status: QuoteStatus;
  subtotal: number;
  ivaAmount: number;
  shipping: number;
  total: number;
  totalUsd: number;
  totalEur: number;
  exchangeRateUsd: number;
  exchangeRateEur: number;
  pdfUrl: string | null;
  notes: string | null;
  deliveryNotes: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteItem[];
  order?: Order;
}

// ============================================================================
// ORDERS
// ============================================================================

export interface Order {
  id: string;
  number: string;
  companyId: string;
  userId: string;
  quoteId: string;
  status: OrderStatus;
  poNumber: string | null;
  poEmail: string | null;
  total: number;
  addressId: string | null;
  deliveryNotes: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
  quote?: Quote;
  invoice?: Invoice;
  items?: QuoteItem[];
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  number: string;
  companyId: string;
  orderId: string;
  status: InvoiceStatus;
  subtotal: number;
  ivaAmount: number;
  total: number;
  pdfUrl: string | null;
  dueDate: string;
  paidAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  gtiCode: string | null;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  company?: Company;
}

// ============================================================================
// SCRAPING & EXCHANGE RATES
// ============================================================================

export interface ScrapingJob {
  id: string;
  storeId: string;
  status: ScrapingStatus;
  productsFound: number;
  productsUpdated: number;
  errors: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  store?: SourceStore;
}

export interface ExchangeRate {
  id: string;
  date: string;
  usdRate: number;
  eurRate: number;
  source: string;
  createdAt: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies: number;
  totalProducts: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalOrders: number;
  totalRevenue: number;
  pendingInvoices: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
