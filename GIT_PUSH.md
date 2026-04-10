# 🚀 GIT — Instrucciones para sincronizar con GitHub (ACTUALIZADO 2026-04-10)

> Ejecutar UNA VEZ desde la terminal de tu computadora en la carpeta del proyecto.

## Contexto
El código local está completo (~85%) pero NO está en GitHub.
El filesystem del entorno Cowork no soporta `git init` directamente.
**Kevin debe ejecutar estos comandos desde su PC.**

## Comandos (copiar y pegar en terminal)

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
Verificar que las variables de entorno en Railway coincidan con `.env.example`.

---

*Creado automáticamente por Claude — Aritth Market Team*
