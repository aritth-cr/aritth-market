# SMOKE TEST CHECKLIST — Aritth Market FASE 7C

Run these tests against a staging environment after deploy. Mark each item once verified.

## Runtime parity (inherited from FASE 7B)

- [ ] `POST /api/admin/suppliers` — create a supplier (requireAritth)
- [ ] `PUT /api/admin/suppliers/:id` — update a supplier (requireAritth)
- [ ] `POST /api/admin/products/deduplication/:id/review` — review a deduplication case
- [ ] `GET /api/procurement/requests` — list procurement requests
- [ ] `POST /api/procurement/requests` — create a procurement request
- [ ] `POST /api/invoices/:id/notes` — add internal note (alias route)

## Partner API (`/api/v1`)

**Auth**: Bearer token of a valid, active `PartnerAPIKey` (key must be stored as SHA256 hash).

- [ ] `GET /api/v1/products` — returns paginated list of published products
  - Verify `isPublished: true` filter is applied
  - Test `?q=` search filter
  - Test `?category=` filter
  - Test `?inStock=true` filter
- [ ] `GET /api/v1/products/:id/offers` — returns offers for a published product
  - Verify `isHiddenFromClient` suppliers show as "Proveedor verificado"
- [ ] `GET /api/v1/products/:id/documents` — returns PUBLIC technical documents only
  - Verify `visibility: PUBLIC` filter is applied
- [ ] `POST /api/v1/quotes` — creates a DRAFT quote for the partner's company
  - Test with a valid `productId`
  - Test with an optional `supplierOfferId`
  - Verify `ivaRate: 0` for Zona Franca partners
  - Verify `ivaRate: 0.13` for regular companies

## Supplier API (`/api/v1/supplier`)

**Auth**: Bearer token of a valid, active `SupplierAPIKey` (key must be stored as SHA256 hash).

- [ ] `POST /api/v1/supplier/products` — creates an unpublished product
  - Verify product is created with `isPublished: false`
  - Verify a SourceStore `SUPPLIER:{internalCode}` is created/reused
  - Test duplicate SKU returns 409
- [ ] `PUT /api/v1/supplier/products` — updates product by `id`
  - Verify only the supplier's own products can be updated
  - Test update by `sku`
- [ ] `DELETE /api/v1/supplier/products` — soft-deletes a product
  - Verify `isActive: false, isPublished: false` after delete
  - Test delete by `id` and by `sku`
- [ ] `POST /api/v1/supplier/offers` — upserts a supplier offer
  - Test create (expects 201)
  - Test update (same productId + supplierId + supplierSku → expects 200)
  - Verify `lastCheckedAt` and `lastValidatedAt` are updated

## Error cases

- [ ] Invalid Bearer token → 401
- [ ] Inactive API key → 403
- [ ] Missing required fields → 400 with `VALIDATION_ERROR`
- [ ] Non-existent product → 404
- [ ] Supplier trying to update another supplier's product → 404
