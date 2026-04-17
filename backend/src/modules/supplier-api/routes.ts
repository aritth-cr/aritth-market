// ====================================================
// SUPPLIER API — Catalog management routes /api/v1/supplier
// ====================================================

import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma/client.js';
import { supplierApiAuth } from './auth.js';
import {
  buildSkuInternal,
  type SupplierProductCreate,
  type SupplierProductUpdate,
  type SupplierProductDelete,
  type SupplierOfferUpsert,
} from './contracts.js';

/**
 * Resolve or create a SourceStore dedicated to a supplier's product submissions.
 * This gives every supplier an isolated "store" in the catalog for their own products.
 */
async function resolveSupplierStore(_supplierId: string, supplierCode: string): Promise<string> {
  const storeName = `SUPPLIER:${supplierCode}`;
  const existing = await (prisma as any).sourceStore.findFirst({
    where: { name: storeName },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await (prisma as any).sourceStore.create({
    data: {
      name: storeName,
      baseUrl: '',
      scraperClass: 'supplier_direct',
      isActive: true,
      operatingDays: [],
    },
  });
  return created.id;
}

export async function supplierApiRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------------
  // POST /api/v1/supplier/products
  // Submit a new product to the catalog (starts as unpublished)
  // ----------------------------------------------------------------
  app.post<{ Body: SupplierProductCreate }>(
    '/products',
    { preHandler: [supplierApiAuth('catalog:write')] },
    async (request, reply) => {
      const context = (request as any).supplierApiContext;
      const body = request.body as SupplierProductCreate;

      if (!body?.name || !body?.category || body?.storePrice == null) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'name, category, and storePrice are required',
        });
      }

      const storeId = await resolveSupplierStore(
        context.supplierId,
        context.supplier?.internalCode ?? context.supplierId
      );

      const skuInternal = buildSkuInternal(body);
      const externalId = skuInternal ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Check uniqueness within this supplier's store
      const existing = await prisma.product.findUnique({
        where: { storeId_externalId: { storeId, externalId } },
      });

      if (existing) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'CONFLICT',
          message: 'A product with this SKU already exists for this supplier',
          existingId: existing.id,
        });
      }

      const product = await prisma.product.create({
        data: {
          storeId,
          externalId,
          name: body.name,
          canonicalName: body.canonicalName ?? null,
          normalizedName: body.normalizedName ?? null,
          manufacturerName: body.manufacturerName ?? null,
          manufacturerPartNumber: body.manufacturerPartNumber ?? null,
          brand: body.brand ?? null,
          model: body.model ?? null,
          sku: body.sku ?? skuInternal ?? null,
          category: body.category,
          subcategory: body.subcategory ?? null,
          unit: body.unit ?? 'unidad',
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
          storePrice: body.storePrice,
          inStock: body.inStock ?? true,
          isPublished: false, // requires admin review before publishing
          isActive: true,
          externalUrl: '',
        },
      });

      return reply.code(201).send(product);
    }
  );

  // ----------------------------------------------------------------
  // PUT /api/v1/supplier/products
  // Update an existing product by id or sku
  // ----------------------------------------------------------------
  app.put<{ Body: SupplierProductUpdate }>(
    '/products',
    { preHandler: [supplierApiAuth('catalog:write')] },
    async (request, reply) => {
      const context = (request as any).supplierApiContext;
      const body = request.body as SupplierProductUpdate;

      if (!body?.id && !body?.sku) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Either id or sku is required to identify the product',
        });
      }

      const storeId = await resolveSupplierStore(
        context.supplierId,
        context.supplier?.internalCode ?? context.supplierId
      );

      let product;
      if (body.id) {
        product = await prisma.product.findFirst({
          where: { id: body.id, storeId },
        });
      } else {
        product = await prisma.product.findFirst({
          where: { sku: body.sku!, storeId },
        });
      }

      if (!product) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Product not found for this supplier',
        });
      }

      const updateData: any = {};
      if (body.canonicalName !== undefined) updateData.canonicalName = body.canonicalName;
      if (body.normalizedName !== undefined) updateData.normalizedName = body.normalizedName;
      if (body.manufacturerName !== undefined) updateData.manufacturerName = body.manufacturerName;
      if (body.manufacturerPartNumber !== undefined) updateData.manufacturerPartNumber = body.manufacturerPartNumber;
      if (body.brand !== undefined) updateData.brand = body.brand;
      if (body.model !== undefined) updateData.model = body.model;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
      if (body.unit !== undefined) updateData.unit = body.unit;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.storePrice !== undefined) updateData.storePrice = body.storePrice;
      if (body.inStock !== undefined) updateData.inStock = body.inStock;

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });

      return reply.send(updated);
    }
  );

  // ----------------------------------------------------------------
  // DELETE /api/v1/supplier/products
  // Remove a product by id or sku (marks as inactive)
  // ----------------------------------------------------------------
  app.delete<{ Body: SupplierProductDelete }>(
    '/products',
    { preHandler: [supplierApiAuth('catalog:write')] },
    async (request, reply) => {
      const context = (request as any).supplierApiContext;
      const body = request.body as SupplierProductDelete;

      if (!body?.id && !body?.sku) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Either id or sku is required to identify the product',
        });
      }

      const storeId = await resolveSupplierStore(
        context.supplierId,
        context.supplier?.internalCode ?? context.supplierId
      );

      let product;
      if (body.id) {
        product = await prisma.product.findFirst({
          where: { id: body.id, storeId },
        });
      } else {
        product = await prisma.product.findFirst({
          where: { sku: body.sku!, storeId },
        });
      }

      if (!product) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Product not found for this supplier',
        });
      }

      // Soft delete — mark as inactive and unpublished
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false, isPublished: false },
      });

      return reply.send({ success: true, id: product.id });
    }
  );

  // ----------------------------------------------------------------
  // POST /api/v1/supplier/offers
  // Upsert a supplier offer for a given product
  // ----------------------------------------------------------------
  app.post<{ Body: SupplierOfferUpsert }>(
    '/offers',
    { preHandler: [supplierApiAuth('catalog:write')] },
    async (request, reply) => {
      const context = (request as any).supplierApiContext;
      const body = request.body as SupplierOfferUpsert;

      if (!body?.productId || !body?.supplierName || body?.costPrice == null) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'productId, supplierName, and costPrice are required',
        });
      }

      // Verify the product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        select: { id: true, isActive: true },
      });

      if (!product || !product.isActive) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Find existing offer for upsert
      const existingOffer = await prisma.supplierOffer.findFirst({
        where: {
          productId: body.productId,
          supplierId: context.supplierId,
          ...(body.supplierSku ? { supplierSku: body.supplierSku } : {}),
        },
      });

      const offerData = {
        supplierId: context.supplierId,
        productId: body.productId,
        supplierSku: body.supplierSku ?? null,
        supplierName: body.supplierName,
        costPrice: body.costPrice,
        currency: (body.currency ?? 'USD') as any,
        minQuantity: body.minQuantity ?? 1,
        leadTimeDays: body.leadTimeDays ?? 0,
        inStock: body.inStock ?? true,
        stockQty: body.stockQty ?? null,
        moq: body.moq ?? null,
        isNational: body.isNational ?? false,
        isManufacturerOffer: body.isManufacturerOffer ?? false,
        isActive: true,
        lastCheckedAt: new Date(),
        lastValidatedAt: new Date(),
      };

      if (existingOffer) {
        const updated = await prisma.supplierOffer.update({
          where: { id: existingOffer.id },
          data: offerData,
        });
        return reply.send(updated);
      }

      const created = await prisma.supplierOffer.create({ data: offerData });
      return reply.code(201).send(created);
    }
  );
}
