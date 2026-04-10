# DECISIONS — Registro de decisiones técnicas Aritth Market
> Cada decisión importante debe quedar documentada aquí: qué se decidió, por qué, y quién lo validó.

---

## Formato de entrada
```
## [FECHA] [ÁREA] — Título de la decisión
**Decisión:** ...
**Razón:** ...
**Alternativas descartadas:** ...
**Validado por:** ...
**Impacto:** ...
```

---

## 2026-04-09 ARQUITECTURA — Stack tecnológico

**Decisión:** Fastify 5 + TypeScript + Prisma + PostgreSQL + pgvector + Redis + BullMQ para backend. Next.js 15 + Clerk + Tailwind para frontend.

**Razón:** Fastify supera Express en throughput para APIs de alto volumen. Prisma simplifica ORM tipado. pgvector habilita búsqueda semántica sin infraestructura externa. Clerk maneja auth compleja (empresas + roles) sin escribirla desde cero.

**Alternativas descartadas:** Express (más lento), Supabase auth (menos control sobre roles), ElasticSearch (costoso para MVP), NestJS (overhead innecesario en este tamaño).

**Validado por:** Claude (decisión inicial del proyecto)

**Impacto:** Alto — afecta todo el stack.

---

## 2026-04-09 PRECIOS — Lógica IVA costarricense

**Decisión:**
- Costo Aritth = precio tienda × 1.13 (Aritth absorbe IVA de compra)
- Precio con margen = costo × 1.10 (10% ganancia)
- Cliente Zona Franca: paga precio con margen (sin IVA de venta)
- Cliente regular: paga precio con margen × 1.13 (con IVA de venta)

**Razón:** Modelo de negocio definido por el cliente. Zona Franca tiene exención de IVA en Costa Rica.

**Validado por:** Kevin (dueño del negocio)

---

## 2026-04-09 FACTURAS — Flujo manual con revisión interna

**Decisión:** Las facturas no se generan automáticamente al confirmar una orden. Requieren revisión interna por un INVOICE_REVIEWER antes de enviarse al cliente.

**Razón:** Proceso de negocio de Aritth — validan datos de facturación antes de emitir. Futuro: integración con sistema GTI (código `gtiCode` en schema).

**Validado por:** Claude (inferido del schema existente)

---

## 2026-04-09 RUTAS — Separación admin interno vs admin back-office

**Decisión:**
- `/api/admin/*` → back-office de Aritth (solo usuarios `AritthUser`)
- `/api/orders/admin/*` y `/api/invoices/admin/*` → acciones admin dentro de cada módulo (misma auth pero organizadas por dominio)

**Razón:** Mantener cada módulo cohesivo. Las acciones de órdenes e invoices viven con sus rutas.

**Alternativas descartadas:** Poner todo en back-office/routes.ts (genera un archivo monolítico de 1000+ líneas).

**Validado por:** Claude

---

## 2026-04-09 NEGOCIO — Aritth como cara visible (NO-RELAY de tienda)

**Decisión:** En la experiencia cliente, Aritth cotiza, vende, factura y responde. EPA/Novex son fuente interna de abastecimiento, no visibles al cliente.

**Razón:** Modelo de negocio Aritth. Exposición de fuente destruye margen y posicionamiento.

**Validado por:** Kevin

**Impacto:** Todo el customer-facing layer debe mostrar solo marca Aritth.

---

## 2026-04-09 PRODUCTO — Captura máxima de información

**Decisión:** Capturar: nombre, desc, specs, marca, modelo, SKU, precio, disponibilidad, imágenes, dims, peso, material, usos, compatibilidades, garantía, fabricante, categoría, atributos técnicos, docs. Contenido parafraseable con IA solo para claridad. Nunca inventar datos técnicos/garantía. Diferenciar: extraído / normalizado / enriquecido.

**Validado por:** Kevin

---

## 2026-04-09 DEPLOY — Configs Railway + Vercel

**Decisión:** nixpacks.toml sin [start] (evita conflicto). railway.json startCommand: `npx prisma db push && node dist/server.js`. Sin --accept-data-loss. No vercel.json (Next.js 15 detectado automáticamente).

**Validado por:** Claude (análisis propio)

---

## 2026-04-09 ARQUITECTURA — Dos capas de producto

**Decisión:** La arquitectura visual y funcional debe soportar (1) panel admin interno Aritth y (2) portal futuro clientes corporativos. Componentes no deben quedar amarrados solo al admin.

**Validado por:** Kevin + ChatGPT director técnico

## 2026-04-09 NUMERACIÓN — Documentos AMT

**Decisión:** Usar PostgreSQL sequences (`quote_seq`, `order_seq`, `invoice_seq`) para números únicos. Formato: `AMT-COT-YYYY-000001`.

**Razón:** Las sequences de PostgreSQL son atómicas, seguras en concurrencia, sin colisiones aunque haya múltiples instancias del backend.

**Alternativas descartadas:** Auto-increment de Pris