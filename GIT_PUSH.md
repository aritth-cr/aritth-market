# 🚀 GIT — Instrucciones para sincronizar con GitHub (ACTUALIZADO 2026-04-10)

> Git push ya ejecutado ✅ — Este archivo ahora aplica solo para el commit de TypeScript fixes.

## Estado actual (2026-04-10)
- El repo está en GitHub: origin/main ✅
- Claude hizo un audit estático y corrigió errores TypeScript en 7 archivos backend + frontend middleware
- **Kevin debe commitear estos cambios y correr el build**

## ⚡ Commit rápido (ejecutar desde "App Market/aritth-app")

```bash
# Desde la carpeta "App Market/aritth-app":
git add -A
git commit -m "fix: TypeScript audit — exactOptionalPropertyTypes fixes + middleware location + tsconfig"
git push origin master:main

# Luego instalar dependencias y build:
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
```

---

## Comandos originales (para referencia)

```bash
# 1. Ir a la carpeta del proyecto
cd "App Market/aritth-app"

# 2. Inicializar git (si no está inicializado)
git init

# 3. Conectar al repo remoto
git remote add origin https://github.com/aritth-cr/aritth-market.git

# 4. Traer el historial remoto (para no perder los 5 commits previos)
git fetch origin

# 5. Verificar que .env NO está incluido (debe aparecer en output)
git check-ignore backend/.env frontend/.env.local

# 6. Agregar todo el código (el .gitignore protege secrets)
git add -A

# 7. Ver qué se va a commitear (verificar que no hay .env ni node_modules)
git status

# 8. Instalar dependencias (REQUERIDO antes del build)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 9. Build backend
cd backend && npm run build && cd ..

# 10. Build frontend (opcional para validar, puede hacerlo Railway/Vercel)
cd frontend && npm run build && cd ..

# 11. Crear el commit
git add -A
git commit -m "feat: Fases 3-5prep — AdminLayout, CRON BullMQ, deploy configs Railway/Vercel"

# 12. Push (force porque el historial local puede diferir del remoto)
git push --force-with-lease origin master:main
# Si el repo usa master local → main en GitHub. Si falla:
# git push --force origin master:main
```

## ⚠️ Verificaciones antes del push

✅ El `.gitignore` ya está en la raíz del proyecto (protege .env, node_modules, dist, .next)
✅ Los `.env` y `.env.local` con credenciales reales NO deben subirse
✅ Los `.env.example` SÍ deben subirse (no tienen secrets)

## Qué quedará en GitHub tras el push

```
aritth-market/
├── .gitignore
├── GUIA_INSTALACION.md
├── STATUS.md
├── TASK_QUEUE.md
├── DECISIONS.md
├── GIT_PUSH.md (este archivo)
├── backend/
│   ├── nixpacks.toml
│   ├── package.json
│   ├── railway.json
│   ├── tsconfig.json
│   ├── .env.example          ← sin secrets, solo estructura
│   └── src/                  ← todo el código fuente
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── .env.local.example    ← sin secrets
    └── src/                  ← todo el código fuente
```

## Post-push: configurar Railway

Después del push, Railway debería detectar el repositorio automáticamente.
Verificar que las variables de entorno en Railway coincidan 