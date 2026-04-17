# Aritth Market - Archivos de Configuración

Este proyecto tiene todo lo necesario para configurarse rápidamente.

## Empieza Aquí

```bash
# Opción 1: Configuración rápida (5 minutos)
# Lee: SETUP.md

# Opción 2: Configuración completa (15 minutos)
# Lee: CONFIGURATION.md
```

## Archivos Disponibles

| Archivo | Propósito | Audiencia |
|---------|-----------|-----------|
| **SETUP.md** | Configuración rápida | Nuevos desarrolladores |
| **CONFIGURATION.md** | Guía completa | DevOps, configuración avanzada |
| **FILES_CREATED.md** | Qué se creó | Gestores de proyecto |
| **.env-variables.json** | Referencia técnica | Integración con herramientas |

## Estructura de Configuración

```
Backend:
  .env.example            ← Plantilla para desarrollo
  .env.production.example ← Plantilla para producción
  .env                    ← Archivo real (no commitear)

Frontend:
  .env.local.example       ← Plantilla para desarrollo
  .env.production.example  ← Plantilla para producción
  .env.local               ← Archivo real (no commitear)
  next.config.ts          ← Dominios de imágenes configurados
```

## Checklist Rápido

- [ ] Backend: copiar `.env.example` → `.env`
- [ ] Frontend: copiar `.env.local.example` → `.env.local`
- [ ] Configurar credenciales en `.env`
- [ ] Instalar dependencias: `npm install`
- [ ] Ejecutar: `npm run dev`

## Servicios Necesarios

Obtén claves en:

1. **Clerk** → https://dashboard.clerk.com
2. **Gemini API** → https://ai.google.dev/
3. **ExchangeRate API** → https://www.exchangerate-api.com
4. **Gmail App Password** → https://myaccount.google.com/apppasswords

## Dominios de Imágenes Configurados

El frontend está configurado para cargar imágenes de:
- EPA (epa.cr)
- Novex (novex.cr)
- El Lagar (ellagar.cr)
- Colono (colono.cr)

## Problemas?

Ver la sección de **Troubleshooting** en:
- SETUP.md (rápido)
- CONFIGURATION.md (detallado)

## Despliegue

- **Backend**: Railway
- **Frontend**: Vercel

Usa los archivos `.env.production.example` como guía.

---

**No hay secretos reales en estos archivos.** Todos usan valores de ejemplo.
