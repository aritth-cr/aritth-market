// seed-data.ts — Static lookup data for Aritth Market FASE 2
// Multi-source global procurement platform

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español',   locale: 'es-CR', isDefault: true  },
  { code: 'en', name: 'English',   locale: 'en-US', isDefault: false },
  { code: 'pt', name: 'Português', locale: 'pt-BR', isDefault: false },
  { code: 'fr', name: 'Français',  locale: 'fr-FR', isDefault: false },
  { code: 'de', name: 'Deutsch',   locale: 'de-DE', isDefault: false },
  { code: 'it', name: 'Italiano',  locale: 'it-IT', isDefault: false },
  { code: 'ja', name: '日本語',     locale: 'ja-JP', isDefault: false },
  { code: 'zh-cn', name: '简体中文', locale: 'zh-CN', isDefault: false },
  { code: 'zh-tw', name: '繁體中文', locale: 'zh-TW', isDefault: false },
];

export const SUPPLIER_TYPES = [
  'MANUFACTURER',
  'DISTRIBUTOR',
  'IMPORTER',
  'RETAILER',
  'MARKETPLACE',
] as const;

export const INITIAL_SUPPLIERS = [
  {
    internalCode: 'EPA-CR',
    displayName: 'EPA Costa Rica',
    name: 'EPA',                           // legacy
    legalName: 'EPA S.A.',
    type: 'RETAILER' as const,
    sourceKind: 'DIRECT_SUPPLIER',
    countryCode: 'CR',
    country: 'CR',                         // legacy
    currency: 'CRC' as const,
    websiteUrl: 'https://www.epa.cr',
    website: 'https://www.epa.cr',         // legacy
    isActive: true,
  },
  {
    internalCode: 'NOVEX-CR',
    displayName: 'Novex Costa Rica',
    name: 'Novex',                         // legacy
    legalName: 'Novex S.A.',
    type: 'RETAILER' as const,
    sourceKind: 'DIRECT_SUPPLIER',
    countryCode: 'CR',
    country: 'CR',                         // legacy
    currency: 'CRC' as const,
    websiteUrl: 'https://www.novex.cr',
    website: 'https://www.novex.cr',       // legacy
    isActive: true,
  },
  {
    internalCode: 'LAGAR-CR',
    displayName: 'El Lagar Costa Rica',
    name: 'El Lagar',                      // legacy
    legalName: 'El Lagar S.A.',
    type: 'RETAILER' as const,
    sourceKind: 'DIRECT_SUPPLIER',
    countryCode: 'CR',
    country: 'CR',                         // legacy
    currency: 'CRC' as const,
    isActive: false,
  },
];

export const TECHNICAL_DOCUMENT_TYPES = [
  'DATASHEET',
  'MANUAL',
  'CERTIFICATE',
  'SAFETY_SHEET',
  'CATALOG',
  'WARRANTY',
  'OTHER',
] as const;

export const PROCUREMENT_STATES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ORDERED',
  'RECEIVED',
  'CANCELLED',
] as const;

export const OPERATIONAL_ALERT_TYPES = [
  'SCRAPING_FAILURE',
  'PRICE_ANOMALY',
  'STOCK_CRITICAL',
  'PAYMENT_OVERDUE',
  'SYSTEM_ERROR',
  'SUPPLIER_OFFLINE',
  'RATE_LIMIT_HIT',
] as const;

// Document visibility levels
export type DocumentVisibility = 'PUBLIC' | 'PARTNER' | 'PRIVATE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
