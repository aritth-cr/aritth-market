# CLEANUP CHECKLIST — Aritth Market Post-FASE 7C

## Backend

### Procurement
- [ ] Confirm `procurementRoutes` uses the official Fastify auth flow (currently uses `getRequestContext` with loose header extraction — consider migrating to `requireClient` or `requireAritth` middleware)
- [ ] Review `/api/procurement/requests` — currently has no auth guard; add `requireClient` or `requireAritth` depending on intended actor
- [ ] Remove or consolidate duplicate alias routes (e.g. `/api/invoices/:id/notes` and `/api/invoices/admin/:id/notes` doing the same thing)

### Invoices
- [ ] Audit the two notes aliases (`POST /api/invoices/:id/notes` and `POST /api/invoices/admin/:id/notes`) — unify or document the intended path
- [ ] Replace raw `nextval('invoice_seq')` with a Prisma-managed counter if the sequence was not explicitly created in the DB

### General
- [ ] Remove any leftover `console.log` debug statements across all modules
- [ ] Ensure all sensitive environment variables are rotated before deploy (CLERK secret, DB URL, JWT secret)
- [ ] Audit all `prisma as any` usages — validate each model name matches the actual Prisma schema

### Partner & Supplier API
- [ ] API keys are stored as SHA256 hashes — document the key generation flow for operators
- [ ] Ensure minimum scopes are enforced if scopes are added to the schema later
- [ ] Technical documents must be served via Aritth CDN/static route — confirm no public S3 bucket redirect

## Frontend

### Procurement
- [ ] Verify the procurement page fetches from `/api/procurement/requests` (not `/api/procurement` directly)
- [ ] Confirm pagination and `pageSize` params match the backend defaults

### General
- [ ] Audit legacy types in `types/index.ts` — remove fields that no longer exist in the backend response
- [ ] Check `ClientLayout` — verify `cartCount` polling interval is not too aggressive (current: every X seconds)
- [ ] Verify `/profile` page is read-only in the client portal (no exposed edit capabilities for fields managed by Aritth)
- [ ] Ensure the client portal does not expose `supplierName` or `displayName` from `SupplierOffer` where `isHiddenFromClient === true`

## Seguridad

- [ ] API keys (Partner and Supplier) must only be stored as hashed values — never log raw keys
- [ ] Ensure Bearer token is never logged in request logs (sanitize `Authorization` header in logger)
- [ ] Rate limiting is global at 100 req/min — consider a tighter limit for `/api/v1` endpoints
- [ ] Verify Helmet CSP is not blocking Partner API usage from external clients (CSP is server-to-server API, may not apply)
- [ ] Confirm no unauthenticated routes leak catalog data beyond `/api/offers` (homepage)
