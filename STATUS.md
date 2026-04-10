# Aritth Market — Estado del Proyecto
> Actualizar este archivo al inicio y final de cada sesión de trabajo.
> Al comenzar una sesión nueva, leer SOLO este archivo para retomar contexto.

---

## 🎯 Próxima tarea
- **Fase 5: Deploy** — Railway (backend) + Vercel (frontend). **Bloqueado** hasta que Kevin haga `git push` desde su PC.
- Kevin debe ejecutar los comandos en `GIT_PUSH.md` antes de continuar.

---

## ✅ Completado

### Backend (`aritth-app/backend/src/`)
| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `server.ts` | Servidor Fastify principal | ✅ Completo |
| `app.ts` | Registro de plugins y rutas | ✅ Completo |
| `config/env.ts` | Variables de entorno con Zod | ✅ Completo |
| `plugins/auth.ts` | Middleware Clerk (requireClient / requireAdmin) | ✅ Completo |
| `shared/prisma/schema.prisma` | Schema BD completo (623 líneas, 21 modelos) | ✅ Completo |
| `shared/prisma/client.ts` | Singleton PrismaClient | ✅ Completo |
| `shared/errors/AppError.ts` | Clase de error personalizada | ✅ Completo |
| `shared/utils/mailer.ts` | Nodemailer con Gmail SMTP | ✅ Completo |
| `shared/utils/storage.ts` | Gestión de archivos PDF locales | ✅ Completo |
| `modules/companies/routes.ts` | CRUD empresas + registro público | ✅ Completo |
| `modules/products/routes.ts` | Catálogo, búsqueda IA, detalle (299 líneas) | ✅ Completo |
| `modules/search/service.ts` | Búsqueda semántica con Gemini + pgvector | ✅ Completo |
| `modules/quotes/routes.ts` | Crear/listar/aprobar cotizaciones (408 líneas) | ✅ Completo |
| `modules/quotes/pdf.ts` | Generación PDF con pdf-lib | ✅ Completo |
| `modules/orders/routes.ts` | CRUD completo: listar/detalle/cancelar/tracking + admin (501 líneas) | ✅ Completo |
| `modules/pricing/calculator.ts` | Motor de precios IVA + Zona Franca | ✅ Completo |
| `modules/exchange-rates/service.ts` | Tipos de cambio USD/CRC | ✅ Completo |
| `modules/scraping/engine.ts` | Motor de scraping con BullMQ | ✅ Completo |
| `modules/scraping/parsers/epa.ts` | Parser EPA (168 líneas) | ✅ Completo |
| `modules/scraping/parsers/novex.ts` | Parser Novex (229 líneas) | ✅ Completo |
| `modules/scraping/offers.ts` | Procesamiento de ofertas scrapeadas | ✅ Completo |
| `modules/scraping/seed.ts` | Seed de tiendas fuente | ✅ Completo |
| `modules/scraping/cli.ts` | CLI para correr scrapers | ✅ Completo |
| `modules/back-office/routes.ts` | Panel admin Aritth (370 líneas) | ✅ Completo |
| `modules/invoices/cron.ts` | CRON BullMQ: SENT→OVERDUE cada hora (dueDate < now) | ✅ Implementado* |
| `server.ts` | Wiring `registerOverdueCron()` + graceful shutdown de worker/queue | ✅ Implementado* |

### Frontend (`aritth-app/frontend/src/`)
| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `app/layout.tsx` | Layout raíz con Clerk | ✅ Completo |
| `app/page.tsx` | Landing / redirect | ✅ Completo |
| `app/middleware.ts` | Middleware de autenticación | ✅ Completo |
| `app/(auth)/sign-in` | Página sign-in Clerk | ✅ Completo |
| `app/(auth)/sign-up` | Página sign-up Clerk | ✅ Completo |
| `app/(client)/catalog/page.tsx` | Página catálogo | ✅ Completo |
| `app/(client)/cart/page.tsx` | Página carrito | ✅ Completo |
| `app/(client)/quotes/page.tsx` | Página cotizaciones | ✅ Completo |
| `app/(client)/orders/page.tsx` | Página órdenes | ✅ Completo |
| `app/(admin)/layout.tsx` | Route group layout — auth guard + AdminLayout wrapper | ✅ Implementado* |
| `app/(admin)/dashboard/page.tsx` | Página dashboard admin | ✅ Completo |
| `app/(admin)/companies/page.tsx` | Página empresas admin | ✅ Completo |
| `app/(admin)/invoices/page.tsx` | Página facturas admin | ✅ Completo |
| `app/(admin)/finance/page.tsx` | Página finanzas admin | ✅ Completo |
| `app/(admin)/scraping/page.tsx` | Página scraping admin | ✅ Completo |
| `lib/api.ts` | Cliente API centralizado + invoicesApi + ordersApi extendido | ✅ Completo |
| `styles/globals.css` | Estilos globales | ✅ Completo |
| `components/layout/AdminLayout.tsx` | Layout sidebar admin — dark theme, 5 nav items, mobile drawer, UserButton | ✅ Implementado* |
| `components/layout/ClientLayout.tsx` | Layout cliente con nav | ✅ Completo |
| `components/catalog/CatalogContent.tsx` | Catálogo con búsqueda IA | ✅ Completo |
| `components/cart/CartContent.tsx` | Carrito de compras | ✅ Completo |
| `components/quotes/QuotesContent.tsx` | Lista de cotizaciones | ✅ Completo |
| `components/orders/OrdersContent.tsx` | Lista de órdenes | ✅ Completo |
| `components/admin/AdminDashboard.tsx` | Dashboard estadísticas | ✅ Completo |
| `components/admin/AdminCompanies.tsx` | Gestión empresas | ✅ Completo |
| `components/admin/AdminInvoices.tsx` | Gestión facturas | ✅ Completo |
| `components/admin/AdminFinance.tsx` | Módulo finanzas | ✅ Completo |
| `components/admin/AdminScraping.tsx` | Control de scraping | ✅ Completo |

### Documentación
| Archivo | Estado |
|---------|--------|
| `GUIA_INSTALACION.md` | ✅ Completo |
| `STATUS.md` (este archivo) | ✅ Activo |

---

## ⚠️ Pendientes / Mejoras Identificadas

### Alta prioridad
- [ ] **Fase 5: Deploy Railway + Vercel** — Bloqueado por git push. Kevin debe ejecutar comandos de `GIT_PUSH.md`

### Media prioridad
- [ ] **`nixpacks.toml` / `railway.json`** — Verificar build command y start command para Railway

### Baja prioridad / Futuro
- [ ] Dashboard con gráficas (recharts) en AdminDashboard
- [ ] Filtros avanzados en catálogo (categoría, precio, tienda)
- [ ] Notificaciones email: cotización aprobada, orden confirmada, factura enviada

---

> *Implementado: código escrito, no validado por compilación (node_modules ausentes en dev)

---

## 📐 Arquitectura Rápida

```
Stack:
  Backend:  Fastify 5 + TypeScript + Prisma + PostgreSQL + pgvector + Redis + BullMQ
  Frontend: Next.js 15 + TypeScript + Clerk Auth + Tailwind CSS + Framer Motion
  Scraping: Playwright + Cheerio + BullMQ queues
  IA:       Gemini API + pgvector para búsqueda semántica
  PDF:      pdf-lib

Puertos dev:
  Backend:  http://localhost:4000
  Frontend: http://localhost:3000

Lógica de precios:
  Precio tienda (EPA/Novex) = P
  Costo Aritth = P × 1.13      (Aritth paga 13% IVA al comprar)
  Con margen   = costo × 1.10  (10% ganancia Aritth)
  Cliente Zona Franca: precio final = con margen
  Cliente regular:     precio final = con margen × 1.13

Numeración documentos:
  Cotizaciones: AMT-COT-2025-000001
  Órdenes:      AMT-ORD-2025-000001
  Facturas:     AMT-FAC-2025-000001
```

---

## 🗂️ Reglas para próximas sesiones

1. **Leer solo este archivo** al iniciar — no explorar todo el proyecto
2. **Elegir UN pendiente** de la lista de arriba y trabajar solo en eso
3. **Actualizar este archivo** al terminar (mover de Pendientes a Completado)
4. **No leer archivos completos** innecesariamente — usar `head`, `wc -l` para verificar
5. Si un archivo tiene más de 200 líneas, **usar subagente** para generarlo

---

## 📅 Historial de sesiones

| Fecha | Tarea completada |
|-------|-----------------|
| 2026-04-09 | Setup inicial: creados todos los módulos backend + frontend completos |
| 2026-04-09 | Creado STATUS.md para gestión eficiente de sesiones |
| 2026-04-09 | Completado orders/routes.ts (501 líneas), creado invoices/routes.ts (629 líneas), types/index.ts, hooks/index.ts, .env.example x4, next.config.ts actualizado, app.ts con invoice+cart/count registrados, lib/api.ts extendido con invoicesApi+ordersApi completo |
| 2026-04-09 | Fase 3: AdminLayout.tsx (dark sidebar, 5 nav, mobile drawer), (admin)/layout.tsx (auth guard). Copilot review OK, fix IIFE. |
| 2026-04-09 | Fase 4: modules/invoices/cron.ts (BullMQ CRON SENT→OVERDUE cada hora) + wiring en server.ts con graceful shutdown. |
