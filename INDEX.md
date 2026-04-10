# Índice de Configuración - Aritth Market

Todos los archivos de configuración en un solo lugar.

## Punto de Entrada Rápido

| Necesidad | Archivo | Tiempo |
|-----------|---------|--------|
| Empezar rápido | [README_CONFIG.md](README_CONFIG.md) | 2 min |
| Configuración paso a paso | [SETUP.md](SETUP.md) | 5 min |
| Guía completa | [CONFIGURATION.md](CONFIGURATION.md) | 15 min |
| Resumen visual | [CONFIG_SUMMARY.txt](CONFIG_SUMMARY.txt) | 3 min |
| Qué se cambió | [FILES_CREATED.md](FILES_CREATED.md) | 5 min |

## Archivos de Variables de Entorno

### Backend

```
backend/
├── .env                        Archivo real (no commitear)
├── .env.example               Plantilla para desarrollo
└── .env.production.example    Plantilla para producción
```

**Copiar en desarrollo:**
```bash
cp backend/.env.example backend/.env
```

**Variables principales:** 24 variables documentadas

### Frontend

```
frontend/
├── .env.local                   Archivo real (no commitear)
├── .env.local.example          Plantilla para desarrollo
└── .env.production.example     Plantilla para producción
```

**Copiar en desarrollo:**
```bash
cp frontend/.env.local.example frontend/.env.local
```

**Variables principales:** 9 variables documentadas

## Configuración Especial

### Next.js (frontend/next.config.ts)
- Dominios de imágenes para EPA, Novex, El Lagar, Colono
- Proxy para API routes
- Optimización de imágenes habilitada

### Servicios Externos
Todos documentados en CONFIGURATION.md:
- Clerk (Autenticación)
- Google Gemini (IA)
- ExchangeRate API (Tasas)
- Gmail SMTP (Correo)
- PostgreSQL 16 + pgvector (BD)
- Redis (Caché)

## Referencia Técnica

**Para DevOps/Automatización:**
- [.env-variables.json](.env-variables.json) - Estructura JSON de todas las variables

**Formato:**
```json
{
  "backend": {
    "variables": {
      "VARIABLE_NAME": {
        "required": boolean,
        "type": "string|number|enum",
        "default": "value",
        "description": "Description",
        "source": "https://..."
      }
    }
  }
}
```

## Flujos de Configuración

### Nuevo Desarrollador

1. Leer: [README_CONFIG.md](README_CONFIG.md) (2 min)
2. Leer: [SETUP.md](SETUP.md) (5 min)
3. Copiar `.example` → archivos reales
4. Editar variables en `.env`
5. Ejecutar: `npm run dev`
6. Referencia: [CONFIGURATION.md](CONFIGURATION.md) si hay dudas

### DevOps / Deployment

1. Leer: [CONFIGURATION.md](CONFIGURATION.md) sección "Despliegue"
2. Consultar: [.env-variables.json](.env-variables.json)
3. Usar: `.env.production.example` como guía
4. Configurar en Railway/Vercel
5. Validar: checklist en CONFIGURATION.md

### Integración CI/CD

1. Parsear: [.env-variables.json](.env-variables.json)
2. Extraer: lista de variables requeridas
3. Validar: contra archivos reales
4. Deploy: automático con variables validadas

## Checklist de Implementación

- [x] Backend .env.example creado/mejorado
- [x] Backend .env.production.example creado
- [x] Frontend .env.local.example mejorado
- [x] Frontend .env.production.example creado
- [x] Frontend next.config.ts mejorado (dominios de imágenes)
- [x] Documentación SETUP.md creada
- [x] Documentación CONFIGURATION.md creada
- [x] Referencia JSON .env-variables.json creada
- [x] Sin secretos reales en archivos .example
- [x] Sin TODOs pendientes

## Seguridad

- Sin secretos reales en archivos `.example`
- Prefijos correctos:
  - Desarrollo: `pk_test_`, `sk_test_`
  - Producción: `pk_live_`, `sk_live_`
- Instrucciones claras de NO commitear `.env` y `.env.local`
- Documentación de cómo obtener cada clave

## Contacto y Soporte

Consultar las secciones de Troubleshooting en:
- SETUP.md (troubleshooting rápido)
- CONFIGURATION.md (troubleshooting detallado)

## Estructura Completa

```
aritth-app/
├── INDEX.md                          ← TÚ ESTÁS AQUÍ
├── README_CONFIG.md                  ← Empieza aquí
├── SETUP.md                          ← Guía rápida
├── CONFIGURATION.md                  ← Guía completa
├── CONFIG_SUMMARY.txt               ← Resumen visual
├── FILES_CREATED.md                 ← Detalles técnicos
├── .env-variables.json              ← Referencia JSON
│
├── backend/
│   ├── .env                         ← Real (no commitear)
│   ├── .env.example                 ← Plantilla dev
│   ├── .env.production.example      ← Plantilla prod
│   └── src/
│       └── config/
│           └── env.ts              ← Validación de variables
│
└── frontend/
    ├── .env.local                   ← Real (no commitear)
    ├── .env.local.example           ← Plantilla dev
    ├── .env.production.example      ← Plantilla prod
    ├── next.config.ts              ← Dominios de imágenes
    └── src/
        └── lib/
            └── api.ts              ← 