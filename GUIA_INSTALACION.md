# 🚀 Aritth Market (AMT) — Guía de Instalación

## Prerequisitos

1. **Node.js 22+** — descargar en nodejs.org
2. **PostgreSQL 16** con extensión **pgvector**
3. **Redis** (para colas de scraping)
4. **Cuenta en Railway** (para deploy — usa tu cuenta Google)
5. **Cuenta en Vercel** (para el frontend — usa tu cuenta Google)

---

## Paso 1: Configurar Variables de Entorno

### Backend
```bash
cd aritth-app/backend
cp .env.example .env
```

Editar `.env` y completar:
- `DATABASE_URL` — URL de PostgreSQL
- `REDIS_URL` — URL de Redis
- `GEMINI_API_KEY` — Obtener en: https://makersuite.google.com/app/apikey
- `SMTP_PASS` — App Password de Gmail (ventas@aritth.com):
  - Gmail → Cuenta → Seguridad → Contraseñas de aplicación
- `EXCHANGE_RATE_API_KEY` — Registrarse gratis en https://www.exchangerate-api.com

### Frontend
```bash
cd aritth-app/frontend
cp .env.local.example .env.local
```

---

## Paso 2: Base de Datos

```bash
cd aritth-app/backend

# Instalar dependencias
npm install

# Instalar extensión pgvector en PostgreSQL
# (solo la primera vez, como superusuario)
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Crear tablas
npx prisma db push

# Crear sequences para numeración de documentos
psql -U postgres -d aritth_market -c "
  CREATE SEQUENCE IF NOT EXISTS quote_seq START 1;
  CREATE SEQUENCE IF NOT EXISTS order_seq START 1;
  CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
"

# Seed: crear tiendas fuente
npx tsx src/modules/scraping/seed.ts
```

---

## Paso 3: Instalar y Correr

### Backend (desarrollo)
```bash
cd aritth-app/backend
npm install
npm run dev
# Corre en http://localhost:4000
```

### Frontend (desarrollo)
```bash
cd aritth-app/frontend
npm install
npm run dev
# Corre en http://localhost:3000
```

---

## Paso 4: Primer Scraping

```bash
cd aritth-app/backend

# Scrapear EPA
npm run scrape:epa

# Scrapear Novex
npm run scrape:novex
```

---

## Paso 5: Deploy en Railway (Backend + BD)

1. Ir a railway.app → Nuevo proyecto
2. Conectar repositorio GitHub
3. Agregar PostgreSQL → copiar `DATABASE_URL`
4. Agregar Redis → copiar `REDIS_URL`
5. En variables de entorno: pegar todo el contenido de `.env`
6. Railway detecta `package.json` y despliega automáticamente

---

## Paso 6: Deploy en Vercel (Frontend)

1. Ir a vercel.com → Import Project
2. Seleccionar la carpeta `aritth-app/frontend`
3. En Environment Variables: pegar `.env.local`
4. Deploy → Vercel genera URL automáticamente
5. Actualizar `FRONTEND_URL` en el `.env` del backend con esa URL

---

## Claves que ya tenemos ✅

| Servicio | Estado |
|---------|--------|
| Clerk (Auth) | ✅ Ya configurado (ver .env) |
| Google OAuth | ✅ Client ID configurado |
| PostgreSQL | ⏳ Configurar en Railway |
| Redis | ⏳ Configurar en Railway |
| Gemini API | ⏳ Registrar en makersuite.google.com |
| Gmail SMTP | ⏳ App Password de ventas@aritth.com |
| ExchangeRate-API | ⏳ Registrar gratis |

---

## Estructura del Proyecto

```
aritth-app/
├── backend/          ← Fastify + Node.js API
│   ├── src/
│   │   ├── config/           # Variables de entorno
│   │   ├── shared/
│   │   │   ├── prisma/       # Schema de BD
│   │   │   ├── errors/       # Manejo de errores
│   │   │   └── utils/        # Email, PDF, storage
│   │   ├── plugins/          # Auth (Clerk)
│   │   └── modules/
│   │       ├── companies/    # Registro de empresas
│   │       ├── products/     # Catálogo
│   │       ├── search/       # Búsqueda IA (Gemini)
│   │       ├── quotes/       # Cotizaciones + PDF
│   │       ├── orders/       # Órdenes
│   │       ├── invoices/     # Facturas (manual)
│   │       ├── scraping/     # EPA + Novex scrapers
│   │       ├── pricing/      # Motor de precios
│   │       ├── exchange-rates/ # Tipos de cambio
│   │       └── back-office/  # Panel Aritth
│   └── storage/              # PDFs generados
│       ├── quotes/
│       ├── invoices/
│       └── temp/
└── frontend/         ← Next.js 15 App
    └── src/
        ├── app/
        │   ├── (auth)/       # Sign in/up
        │   ├── (client)/     # Portal cliente
        │   │   ├── catalog/  # Catálogo productos
        │   │   ├── cart/     # Carrito
        │   │   ├── quotes/   # Mis cotizaciones
        │   │   └── orders/   # Mis órdenes
        │   └── (admin)/      # Portal Aritth
        │       ├── dashboard/
        │       ├── companies/
        │       ├── invoices/
        │       ├── finance/
        │       └── scraping/
        ├── components/
        └── lib/
```

---

## Numeración de Documentos AMT

- **Cotizaciones**: AMT-COT-2025-000001
- **Órdenes**: AMT-ORD-2025-000001
- **Facturas**: AMT-FAC-2025-000001

---

## Lógica de Precios IVA

```
Precio tienda (EPA/Novex) = P
Costo Aritth = P × 1.13      ← Aritth paga 13% IVA
Con margen   = costo × 1.10  ← 10% ganancia Aritth

Cliente Zona Franca: precio final = con margen
Cliente regular:     precio final = con margen × 1.13
```

---

## Contacto

ventas@aritth.com | aritth.com
