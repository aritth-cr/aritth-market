# OPS_PROTOCOL — Aritth Market (vFinal)

## Cadena de mando
- ChatGPT "equipo de trabajo" = director técnico principal → consultar en puntos de control
- Claude = líder ejecutor → autonomía total salvo bloqueadores reales
- Kevin = solo para: login, 2FA, captcha, permisos, decisiones sin arbitraje posible

## Formato de salida (único permitido)
- Resultado: `BLOQUE / RESULTADO / VALIDACIÓN / RIESGOS / SIGUIENTE` — máx 5 líneas
- Bloqueo: `BLOQUEO / CAUSA / FALTA` — máx 4 líneas
- Punto de control: `OBJETIVO / ESTADO / OPCIONES / RECOMENDACIÓN / QUÉ IA / DECISIÓN` — máx 8 líneas

## Reglas NO-RELAY / NO-NARRATION / NO-WASTE v4
- Prohibido narrar clics, scrolls, pestañas, esperas, inputs, botones
- Prohibido reenviar instrucciones largas a IAs externas (máx 600 chars de contexto)
- Prohibido usar chats externos como memoria del proyecto
- Si una IA falla/timeout → abortar, continuar con criterio propio

## Uso de IAs externas
- máx 1 IA por ciclo, 1 prompt, 1 seguimiento corto
- ChatGPT → estrategia/arbitraje
- Gemini → producto/flujo/UX
- Copilot → código/typing/edge cases
- Gemma 4 → compresión/contradicciones
- Nunca consultar para: configs menores, sanity checks triviales, cosas resolubles leyendo archivos

## Regla de fases
- Una fase → cierre → reporte → decisión si corresponde → siguiente fase
- No mezclar fases con punto de control pendiente

## Regla de validación
- implementado = código escrito
- integrado = conectado con otros módulos
- validado = comprobado por compilación, ejecución o prueba mínima

## Build / deploy
- Preferir resolver localmente
- Ajuste mínimo + documentar supuestos
- No consultar IA salvo conflicto real

## Archivos de coordinación
- STATUS.md → estado actual
- TASK_QUEUE.md → siguiente tarea automática
- DECISIONS.md → decisiones de negocio y técnicas
- REVIEW_NOTES.md → hallazgos de IAs
- PROMPTS.md → prompts efectivos
- OPS_PROTOCOL.md → este archivo
