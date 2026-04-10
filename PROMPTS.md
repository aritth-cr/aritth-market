# PROMPTS — Prompts efectivos ya probados para el equipo de IAs
> Guardar aquí los prompts que funcionaron bien. Reutilizar en lugar de reinventar.

---

## Gemini — Revisión de arquitectura
```
Soy el líder técnico de un marketplace B2B llamado Aritth Market (Costa Rica).
Stack: Fastify 5 + TypeScript + Prisma + PostgreSQL 16 + pgvector + Redis + BullMQ (backend), Next.js 15 + Clerk + Tailwind (frontend).
[DESCRIPCIÓN DEL PROBLEMA O MÓDULO]
Por favor evalúa: 1) Si el enfoque es correcto, 2) Riesgos que no estoy viendo, 3) Simplificaciones posibles, 4) Qué falta.
Responde con criterio de arquitecto senior, no con código detallado.
```

## Copilot — Revisión de código
```
Revisa este archivo TypeScript de un backend Fastify 5.
[PEGAR CÓDIGO]
Busca: 1) Errores de tipos, 2) Problemas de async/await, 3) Inconsistencias con el resto del patrón del proyecto, 4) Casos edge no manejados, 5) Oportunidades de refactor.
Responde con comentarios específicos por línea o sección.
```

## ChatGPT secundario — Segunda opinión de UX/flujo
```
Somos un marketplace B2B de insumos industriales en Costa Rica llamado Aritth Market.
Los clientes son empresas (Zona Franca o regulares) que compran a través de un portal.
El flujo actual es: catálogo → carrito → cotización → orden con PO → factura.
[PREGUNTA O DESCRIPCIÓN DE DECISIÓN DE UX]
¿Qué mejorarías? ¿Hay algo que confundiría al usuario empresarial?
```

## Para generar módulos grandes (subagente Claude)
```
Escribe el archivo COMPLETO para [RUTA].
[CONTEXTO DEL SCHEMA RELEVANTE]
[PATRÓN DE IMPORTS]
[RUTAS A IMPLEMENTAR con descripción de cada una]
[VALIDACIONES IMPORTANTES]
Escribe TypeScript completo. Production-ready, sin TODOs.
```

---

*Agregar más pro