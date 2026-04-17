# Configuración Rápida - Aritth Market

Guía paso a paso para tener la aplicación corriendo en 5 minutos.

## Requisitos Previos

- Node.js 18+ y npm/yarn
- Git
- PostgreSQL 16
- Redis

## Paso 1: Clonar y Entrar en el Proyecto

```bash
git clone <tu-repo>
cd aritth-app
```

## Paso 2: Configurar Backend

```bash
cd backend

# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env  # o tu editor favorito
```

Mínimo requerido en `.env`:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/aritth_market
REDIS_URL=redis://localhost:6379
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
GEMINI_API_KEY=AIzaSyxxx
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
EXCHANGE_RATE_API_KEY=tu_key
```

## Paso 3: Instalar Dependencias Backend

```bash
npm install

# Crear base de datos
createdb -U postgres aritth_market

# Ejecutar migraciones (si existen)
npm run migrate

# Iniciar servidor
npm run dev
```

Backend corriendo en: **http://localhost:4000**

## Paso 4: Configurar Frontend (otra terminal)

```bash
cd frontend

# Copiar archivo de ejemplo
cp .env.local.example .env.local

# Editar si es necesario (normalmente no)
nano .env.local
```

Valores típicos:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Paso 5: Instalar Dependencias Frontend

```bash
npm install

# Iniciar servidor
npm run dev
```

Frontend corriendo en: **http://localhost:3000**

## Paso 6: Verificar

- [ ] Backend responde: `curl http://localhost:4000/health`
- [ ] Frontend abre: http://localhost:3000
- [ ] Puedes loguearte con Clerk
- [ ] Las imágenes de productos se cargan

## Variables Necesarias Antes de Empezar

1. **Clerk** (Autenticación)
   - Ir a: https://dashboard.clerk.com
   - Crear proyecto
   - Copiar `pk_test_xxx` y `sk_test_xxx`

2. **Google Gemini** (IA)
   - Ir a: https://ai.google.dev/
   - Generar API key
   - Copiar a `GEMINI_API_KEY`

3. **Gmail SMTP** (Correo)
   - Habilitar 2FA en Google
   - Generar App Password: https://myaccount.google.com/apppasswords
   - Usar email y app password en `SMTP_USER` y `SMTP_PASS`

4. **ExchangeRate API** (Tasas de cambio)
   - Registrarse: https://www.exchangerate-api.com
   - Copiar API key

## Troubleshooting Rápido

| Error | Solución |
|-------|----------|
| `ECONNREFUSED 5432` | PostgreSQL no está corriendo (`brew services start postgresql@16`) |
| `ECONNREFUSED 6379` | Redis no está corriendo (`brew services start redis`) |
| `DATABASE_URL is invalid` | Verifica usuario/contraseña de PostgreSQL |
| `Clerk keys invalid` | Copia exactamente desde dashboard.clerk.com |
| `Module not found` | Ejecuta `npm install` en el directorio correcto |
| `Port 4000/3000 in use` | Cambia PORT en `.env` o cierra la otra aplicación |

## Siguiente Paso

Una vez que todo funcione:

1. Lee [CONFIGURATION.md](./CONFIGURATION.md) para entender cada variable
2. Lee la documentación del [Backend](./backend/README.md)
3. Lee la documentación del [Frontend](./frontend/README.md)

## Documentación Completa

Para configuración avanzada, producción y troubleshooting detallado, ver [CONFIGURATION.md](./CONFIGURATION.md).
