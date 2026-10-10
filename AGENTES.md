# Reglas para agentes (F1 y F3)

Lee primero `PLAN.md` (tu alcance y tus archivos) y `packages/shared/src/index.ts` (contratos).

## Reglas
1. **Edita solo los archivos de tu agente** (tabla "Estructura y dueños" en `PLAN.md`). Puedes crear archivos nuevos dentro de tus carpetas.
2. **No edites contratos:** `apps/api/prisma/schema.prisma`, `packages/shared/**`, `apps/api/src/lib/**`, `apps/api/src/index.ts`, `apps/web/components/ui/**`, `apps/web/lib/**`, `apps/web/app/layout.tsx`, `globals.css`, `next.config.ts`, cualquier `package.json`. Si necesitas un cambio, escríbelo en tu informe final.
3. **No instales dependencias.** Todo lo necesario ya está instalado.
4. No ejecutes migraciones ni `db:seed` salvo el Agente A. No borres datos de la base compartida.
5. Al terminar: `npm run typecheck` (desde la raíz) sin errores en tus archivos.

## Backend (`apps/api`)
- Express 5: las rutas `async` pueden lanzar errores; usa `throw new HttpError(status, "CODIGO", "Mensaje para el cliente")`.
- Valida el body con `validar(EsquemaDeShared, req.body)` de `src/lib/errores.ts`.
- Sesión: `requiereSesion` ya está puesto en los stubs; usa `req.clienteId!`.
- **Fecha "hoy" = `cliente.fechaSimulada`**, nunca `new Date()` (por "Adelantar 30 días").
- Montos: `aNumero(decimal)` de `src/lib/formato.ts`. También: `ocultarNombre`, `ocultarCuenta`, `diasEntre`, `cuandoVence`, `soles`, `nuevaOperacion`.
- Importa con extensión `.js` (`../lib/prisma.js`): el proyecto es ESM.
- Groq: `groq`, `hayGroq`, `MODELO_TEXTO`, `MODELO_VISION` de `src/lib/groq.ts`. Ambos usan `qwen/qwen3.8-27b` (acepta imágenes y herramientas). **Quita bloques `<think>…</think>`** de las respuestas. Nunca envíes claves, DNI ni cuentas completas.
- R2 es **privado**: fotos de clientes en `subidas/` (nunca se exponen), recibos de demo en `demo/` (se ven en `/api/archivos/demo/...` con sesión). Usa `subirArchivo`, `leerArchivo`, `urlDemo`.
- Probar: la API corre en `http://localhost:4317` (`npm run dev:api`).

## Frontend (`apps/web`) · Next.js 16 + Tailwind 4
- **Next 16 tiene cambios:** antes de usar una API poco común, revisa `node_modules/next/dist/docs/`. `params` y `searchParams` en páginas son **Promise**. `useSearchParams()` en un componente cliente requiere envolverlo en `<Suspense>`.
- Pantallas interactivas = componentes `"use client"` que llaman `api<T>("/ruta")` de `@/lib/api` (pasa por `/api` → backend). Tipos de `@cp/shared`.
- Usa `Pantalla`, `Boton`, `Tarjeta`, `Mascota`, `Cargando`, `MensajeError` de `@/components/ui`. Colores: `bg-marca`, `text-tinta`, `text-tenue`, `bg-fondo`, `border-linea`, `bg-exito-claro`, `bg-aviso-claro`, `bg-error-claro`…
- Vista: `useVista()` de `@/lib/vista` → `{ vista, asistida, setVista }`. En asistida: menos opciones, frases cortas y cálidas, `Boton guia` en la acción a tocar.
- Voz: `hablar(texto)` y `montoHablado(n)` de `@/lib/voz` (en asistida, leer el monto al confirmar).
- **Telemetría obligatoria en cada pantalla:** `track("nombre-pantalla", "ver")` al montar; `"tocar"` en acciones; `"completar"`, `"error"`, `"abandonar"` cuando aplique; `iniciarFlujo("CUOTA")` al empezar un pago; `marcarAyuda()` si usa asistente o "Enséñame paso a paso".
- Gama baja: nada de librerías nuevas, imágenes en SVG o comprimidas, solo animaciones CSS.
- Textos en español peruano, trato de "tú", sin tecnicismos.

## Rutas de la web y dueños
| Ruta | Dueño |
|---|---|
| `/` principal · `/entrar` login · `/bienvenida` · `/ajustes` | A |
| `/inicio` · `/pagar/cuota` · `/pagar/frecuentes` · `/pagar/confirmar?tipo=&ref=` · `/pagar/exito` | B |
| `/pagar/recibo` · `/pagar/guardar` · `/ayuda` | C |
| `/progreso` · `/panel` · `components/DemoBar.tsx` | D |

`/pagar/confirmar?tipo=CUOTA|FRECUENTE|RECIBO&ref=<id>` es el punto de entrada común a la confirmación: A, C y D solo **navegan** ahí.

## Usuarios de demo (los crea el Agente A)
| DNI | Nombre | Clave | Perfil |
|---|---|---|---|
| 40000001 | Rosa, 63 | 123456 | Comerciante, casi todo presencial, paga el día 12 → asistida |
| 40000002 | Elena, 47 | 123456 | Agricultora rural, pocos usos digitales → asistida |
| 40000003 | Carlos, 35 | 123456 | Transportista, usa apps a diario → estándar |
