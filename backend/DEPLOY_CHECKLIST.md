# DEPLOY CHECKLIST — Aritth Market FASE 7C

Complete all steps in order before and after deploying to production.

## Pre-deploy

### Build verification
- [ ] `cd backend && npm run build` exits with 0 errors
- [ ] `cd frontend && npm run build` exits with 0 errors (19/19 pages)
- [ ] No TypeScript `tsc --noEmit` errors in backend

### Database
- [ ] Confirm `PartnerAPIKey` model is present in Prisma schema and applied via `prisma migrate deploy`
- [ ] Confirm `SupplierAPIKey` model is present in Prisma schema and applied via `prisma migrate deploy`
- [ ] Confirm `invoice_seq` PostgreSQL sequence exists (used by invoice number generation)
- [ ] Confirm `ProcurementRequest` table exists (FASE 7B migration)
- [ ] Backup production database before deploy

### Environment variables
- [ ] `DATABASE_URL` points to production database
- [ ] `FRONTEND_URL` is set to the production frontend URL (for CORS)
- [ ] `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` are set
- [ ] `IVA_RATE` is set (default: 0.13)
- [ ] `DEFAULT_MARGIN` is set for pricing calculations
- [ ] `STORAGE_PATH` points to the correct static file directory
- [ ] `APP_NAME` is set
- [ ] `NODE_ENV=production`

### API key provisioning — CRITICAL

**Rule**: `PartnerAPIKey.key` and `SupplierAPIKey.key` must ALWAYS store the `sha256(rawKey)`,
never the raw key. The raw key is given once to the partner/supplier and never persisted.

#### Generating a Partner API key (run in a trusted admin script or Railway console):
```ts
import { createHash, randomBytes } from 'crypto';
import { prisma } from './src/shared/prisma/client.js';

const rawKey   = randomBytes(32).toString('hex');          // 64-char hex
const hashedKey = createHash('sha256').update(rawKey).digest('hex');

await prisma.partnerAPIKey.update({
  where: { companyId: '<COMPANY_ID>' },
  data:  { key: hashedKey, isActive: true },
});

console.log('Give this key to the partner (store it nowhere):', rawKey);
```

#### Generating a Supplier API key:
```ts
const rawKey    = randomBytes(32).toString('hex');
const hashedKey = createHash('sha256').update(rawKey).digest('hex');

await prisma.supplierAPIKey.create({
  data: { supplierId: '<SUPPLIER_ID>', key: hashedKey, name: 'Production key', isActive: true },
});

console.log('Give this key to the supplier (store it nowhere):', rawKey);
```

- [ ] Partner API key provisioned and raw key delivered securely
- [ ] Supplier API key provisioned and raw key delivered securely
- [ ] Verify: attempting auth with wrong key returns 401

## Deploy

- [ ] Deploy backend to production server / container
- [ ] Run `prisma migrate deploy` on production database
- [ ] Deploy frontend to production (Vercel / Railway / etc.)
- [ ] Restart backend service (PM2 / Docker / Railway)
- [ ] Confirm `/health` endpoint returns `{ status: "ok" }`

## Post-deploy smoke tests

- [ ] Run all items in `SMOKE_TEST_CHECKLIST.md` against production
- [ ] Verify at least one Partner API key works end-to-end
- [ ] Verify at least one Supplier API key works end-to-end
- [ ] Check backend logs for any unhandled errors in the first 5 minutes
- [ ] Verify frontend loads and all major pages render without 5xx errors

## Rollback plan

If critical issues are found:
1. Redeploy the previous backend version
2. Run `prisma migrate resolve --rolled-back <migration_name>` if a migration is the cause
3. Notify team and document the issue before retrying
