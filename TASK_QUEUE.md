# TASK_QUEUE — Cola de tareas Aritth Market
> Gestión de prioridades entre sesiones. Actualizar siempre al terminar o al recibir dirección del equipo.

---

## 🔴 BLOQUEADORES (requieren Kevin desde Windows)

1. **npm install + build**: `cd backend && npm install && npm run build` → `cd frontend && npm install && npm run build`
   - Motivo: sandbox bloquea npm registry (403). Debe correr en PC de Kevin.
   - Los errores TypeScript estáticos detectados YA FUERON CORREGIDOS (audit 2026-04-10)
   - Commit los cambios del audit antes de hacer `npm run build`
2. ~~**git push**~~ ✅ **COMPLETADO** — Kevin ejecutó push a origin/main

## 🟡 SIGUIENTE (después de git push)

- Fase 5: Deploy Railway (conectar repo, configurar env vars)
- Fase 5: Deploy Vercel (frontend, configurar env vars Clerk)
- Fase 7: Portal cliente corporativo (nueva capa)

---

## 🟡 COLA PRIORIZADA

### P1 — Alta prioridad
| # | Tarea | Módulo | Estimado | Asignado a |
|---|-------|--------|----------|------------|
| 1 | Webhook Clerk → sync usuarios a BD | Backend | M | Claude |
| 2 | AdminLayout compartido para panel admin | Frontend | S | Claude |
| 3 | Script seed-admin.ts (primer AritthUser) | Backend | S | Claude |

### P2 — Media prioridad
| # | Tarea | Módulo | Estimado | Asignado a |
|---|-------|--------|----------|------------|
| 4 | Job CRON facturas vencidas (BullMQ) | Backend | M | Claude |
| 5 | Verificar nixpacks.toml / railway.json deploy | DevOps | S | Claude |
| 6 | Email notifications (quote, order, invoice) | Backend | M | Claude |

### P3 — Baja prioridad / Futuro
| # | Tarea | Módulo | Estimado | Asignado a |
|---|-------|--------|----------|------------|
| 7 | Gráficas en AdminDashboard (recharts) | Frontend | M | Claude |
| 8 | Filtros avanzados catálogo | Frontend | M | Claude |

**Tamaños:** S = <2h, M = 2-4h, L = >4h

---

## ✅ COMPLETADAS (historial)

| Fecha | Tarea |
|-------|-------|
| 2026-04-10 | Audit estático TypeScript backend: corregidos exactOptionalPropertyTypes en cron.ts, back-office/routes.ts, engine.ts, quotes/routes.ts, parsers/epa.ts, parsers/novex.ts, app.ts |
| 2026-04-10 | Frontend: middleware movido a src/middleware.ts (estaba en src/app/middleware.ts — no funcionaba), tsconfig.json creado |
| 2026-04-09 | orders/routes.ts completo (501L) |
| 2026-04-09 | invoices/routes.ts creado (629L) |
| 2026-04-09 | frontend/src/types/index.ts |
| 2026-04-09 | frontend/src/hooks/index.ts |
| 2026-04-09 | .env.example x4 (backend+frontend dev+prod) |
| 2026-04-09 | next.config.ts con dominios imágenes |
| 2026-04-09 | app.ts: invoicesRoutes + cart/count endpoint |
| 202