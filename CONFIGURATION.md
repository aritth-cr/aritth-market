# Guía de Configuración - Aritth Market

Esta guía explica cómo configurar correctamente el proyecto Aritth Market para desarrollo y producción.

## Estructura de Configuración

```
aritth-app/
├── backend/
│   ├── .env                    # Archivo real (NO commitar)
│   ├── .env.example            # Variables de desarrollo
│   └── .env.production.example # Variables de producción
├── frontend/
│   ├── .env.local              # Archivo real (NO commitar)
│   ├── .env.local.example      # Variables de desarrollo
│   └── .env.production.example # Variables de producción
└── CONFIGURATION.md            # Este archivo
```

---

## Configuración del Backend

### 1. Variables de Desarrollo

Copia `.env.example` a `.env`:

```bash
cd backend
cp .env.example .env
```

Luego, edita `.env` con tus valores locales:

```bash
DATABASE_URL=postgresql://tu_usuario:tu_contraseña@localhost:5432/aritth_market
REDIS_URL=redis://localhost:6379
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
GEMINI_API_KEY=AIzaSyxxx
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_app_gmail
EXCHANGE_RATE_API_KEY=tu_api_key
```

### 2. Servicios Locales Requeridos

Instala PostgreSQL 16 y Redis:

```bash
# macOS
brew install postgresql@16 redis

# Ubuntu/Debian
sudo apt-get install postgresql-16 redis-server

# Iniciar servicios
brew services start postgresql@16
brew services start redis
```

### 3. Configuración de la Base de Datos

```bash
# Crear base de datos
createdb -U postgres aritth_market

# Ejecutar migraciones
npm run migrate
```

---

## Configuración del Frontend

### 1. Variables de Desarrollo

Copia `.env.local.example` a `.env.local`:

```bash
cd frontend
cp .env.local.example .env.local
```

Edita `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. Instalar Dependencias

```bash
npm install
# o
yarn install
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
# Acceso: http://localhost:3000
```

---

## Servicios Externos Requeridos

### Clerk (Autenticación)

1. Crear cuenta: https://dashboard.clerk.com
2. Crear proyecto
3. Copiar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
4. Configurar URLs de redirección:
   - Desarrollo: `http://localhost:3000`
   - Producción: `https://tu-dominio.vercel.app`

### Google Gemini (IA)

1. Obtener API key: https://ai.google.dev/
2. Copiar a `GEMINI_API_KEY`

### ExchangeRate API (Tasas de Cambio)

1. Registrarse: https://www.exchangerate-api.com
2. Copiar API key a `EXCHANGE_RATE_API_KEY`
3. Plan gratuito: 1,500 requests/mes

### Gmail SMTP (Correo)

1. Habilitar 2FA en tu cuenta Gmail
2. Generar "Contraseña de aplicación": https://myaccount.google.com/apppasswords
3. Copiar a `SMTP_PASS`

---

## Despliegue en Producción

### Backend en Railway

1. Conectar repositorio a Railway
2. Crear servicio PostgreSQL y Redis en Railway
3. Variables de entorno: usar `.env.production.example` como referencia
4. Copiar URL de Railway a `FRONTEND_URL` en frontend

### Frontend en Vercel

1. Conectar repositorio a Vercel
2. Variables de entorno: usar `.env.production.example` como referencia
3. Desplegar

---

## Variables de Entorno Explicadas

### Backend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Ambiente (development/production) | `production` |
| `PORT` | Puerto del servidor | `4000` |
| `FRONTEND_URL` | URL del frontend | `https://tudominio.vercel.app` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://...` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `CLERK_PUBLISHABLE_KEY` | Clerk API pública | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Clerk API privada | `sk_live_xxx` |
| `GEMINI_API_KEY` | Google Gemini API | `AIzaSyxxx` |
| `SMTP_USER` | Usuario Gmail | `ventas@aritth.com` |
| `SMTP_PASS` | Contraseña app Gmail | `xxxx xxxx xxxx xxxx` |
| `EXCHANGE_RATE_API_KEY` | API tasas de cambio | `xxxxxxxx` |
| `FALLBACK_USD_RATE` | Tasa USD fallback (CRC) | `510` |
| `FALLBACK_EUR_RATE` | Tasa EUR fallback (CRC) | `560` |
| `SCRAPING_DELAY_MS` | Delay entre requests (ms) | `1200` |
| `MAX_PAGES_PER_CATEGORY` | Páginas máx. por categoría | `10` |
| `DEFAULT_MARGIN` | Margen ganancia (10%) | `0.10` |
| `IVA_RATE` | Impuesto (13% Costa Rica) | `0.13` |

### Frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk pública | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Clerk privada (SSR) | `sk_live_xxx` |
| `NEXT_PUBLIC_API_URL` | URL del backend | `https://backend.railway.app` |

---

## Troubleshooting

### "DATABASE_URL is invalid"

Verifica que PostgreSQL esté corriendo:

```bash
# macOS
brew services list | grep postgres

# Ubuntu
sudo service postgresql status
```

### "Redis connection failed"

Verifica que Redis esté corriendo:

```bash
redis-cli ping
```

### "Clerk keys invalid"

Asegúrate que los prefijos sean correctos:
- Desarrollo: `pk_test_` y `sk_test_`
- Producción: `pk_live_` y `sk_live_`

### "Images not loading from EPA/Novex"

Verifica que los dominios están en `frontend/next.config.ts`:

```typescript
remotePatterns: [
  { hostname: 'www.epa.cr' },
  { hostname: 'www.novex.cr' },
]
```

---

## Checklist de Configuración Inicial

- [ ] Crear cuenta en Clerk
- [ ] Crear API keys de Google Gemini
- [ ] Registrarse en ExchangeRate API
- [ ] Configurar 2FA y App Password en Gmail
- [ ] Instalar PostgreSQL 16 y Redis localmente
- [ ] Copiar `.env.example` a `.env` en backend
- [ ] Copiar `.env.local.example` a `.env.local` en frontend
- [ ] Editar variables con tus valores
- [ ] Ejecutar migraciones de base de datos
- [ ] Iniciar servidor backend: `npm run dev`
- [ ] Iniciar servidor frontend: `npm run dev`
- [ ] Verificar que ambos servidores están activos

---

## Seguridad

- **NUNCA** commitear archivos `.env` o `.env.local`
- **NUNCA** compartir claves API o secretos
- **NUNCA** usar credenciales de producción en desarrollo
- Los archivos `.example` NO deben contener valores reales
- Las claves de desarrollo y producción deben ser diferentes

---

## Soporte

Para ayuda adicional:
1. Revisar logs del servido