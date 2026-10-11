# Plan de desarrollo · Reto 13 Caja Piura · "Modo Acompaña"

> **La IA prepara, tú confirmas, Caja Piura procesa.**
> Fuente: ficha del Reto 13 (Piura Innova) + `Flujo Modo Acompaña.html`.
> Restricción: **12 horas restantes, 1 programador + agentes de Claude, 2 compañeros no programadores.**

---

## 1. Análisis del problema

Clientes emprendedores con poca experiencia digital y celulares de gama baja **activan la app pero vuelven a la ventanilla** por desconfianza, fricción y falta de orientación.

| Tipo | Variable | Respuesta en el flujo |
|---|---|---|
| Barrera | Desconfianza | Práctica guiada en agencia (o sola desde su celular), titular enmascarado, "Confirmar pago" obligatorio, la IA nunca pide claves |
| Barrera | Fricción | 2 toques por pago, frecuentes guardados, foto del recibo en vez de digitar |
| Barrera | Desorientación | Mascota "toca aquí", vista asistida, "Enséñame paso a paso" |
| Perfil | Edad, ocupación, zona, ops presenciales vs. digitales, día de pago, gama del celular | Entradas del motor de reglas y de los avisos |
| Restricción | Gama baja | Poco JS, Server Components, sin librerías de UI |
| Restricción | Sin saldo / efectivo | Límite reconocido: indica cómo depositar |
| Métrica | Éxito sin ayuda · tiempo por operación · pantalla de abandono | Telemetría de eventos y panel |

| Criterio del jurado | Dónde se cubre |
|---|---|
| Motor de personalización | Reglas → vista, tono, sugerencias y razones; graduación a vista estándar |
| Transacción funcional | Rutas A/B/C → saldo → confirmación → éxito o error idempotente |
| Retención comprobable | Cashback a la cuenta, progreso, "Adelantar 30 días" → aviso → pagar en 2 toques |
| Gama baja | Presupuesto de peso y revisión final |

### Decisiones tomadas sobre el flujograma
1. MySQL guarda datos, R2 guarda archivos, Groq solo hace IA y solo desde el backend.
2. Motor de personalización con **reglas deterministas** (explicables), no con LLM.
3. Pagos con **`Idempotency-Key`** para "reintentar sin cobrar dos veces".
4. Texto neutro: "Te damos la bienvenida al nuevo Caja Piura".
5. La autenticación al confirmar reutiliza la biometría simulada.
6. "Adelantar 30 días" mueve `fechaSimulada` del cliente; no se toca el reloj real.
7. Datos ficticios propios con el esquema del Excel de Caja Piura; se reemplazan si llega.
8. (Obs. F3) Se entra con el usuario y la clave reales de la app de Caja Piura (DNI + PIN de 6 dígitos); no hay usuario alterno. En la agencia se practica con esas credenciales.
9. (Obs. F3) Adopción progresiva: el cliente puede activarlo en agencia o solo desde su celular, sin hacer cola. La app es la misma de siempre (misma barra inferior) con un botón nuevo, Pía.
10. (Obs. F3) Solo dos vistas, asistida y estándar. El motor recomienda por uso (canales, pagos sin ayuda, gama del celular), nunca por edad, zona u ocupación; el cliente elige. La pregunta aparece solo en el primer ingreso.
11. (Obs. F3) Recordatorios configurables en Ajustes (días antes y tipo de pago). Al cancelar un pago se muestra que el saldo no cambió. Pía resuelve consultas de pago duplicado, no procesado y errado con los pagos reales del cliente. Sin folleto impreso.

---

## 2. Arquitectura

```
Celular ──► Vercel · apps/web (Next.js App Router + Tailwind)
              │  rewrite /api/* ──► mismo origen, sin problemas de cookies
              ▼
            Railway · apps/api (Node 20 + Express + TS + Prisma)
              ├─ Railway MySQL 8
              ├─ Cloudflare R2 (S3 API): fotos de recibos, recibos de demo
              └─ Groq: tool calling (asistente) + visión (recibo)
```

- **Mismo origen:** `next.config` reescribe `/api/:path*` → `https://<api>.railway.app/:path*`. El navegador solo habla con Vercel y la cookie de sesión funciona sin CORS.
- **Desarrollo:** se usa directamente la base MySQL de Railway (sin Docker).
- **Despliegue:** Vercel con *root directory* `apps/web`; Railway con *root* `apps/api`, comando de inicio `prisma migrate deploy && node dist/index.js`.

### Estructura y dueños de archivos (clave para trabajar con agentes)

```
caja-piura/
├─ package.json                 # workspaces · F0
├─ packages/shared/src/         # tipos + zod (CONTRATO) · F0, solo lectura después
├─ apps/api/
│  ├─ prisma/schema.prisma      # CONTRATO · F0, solo lectura después
│  ├─ prisma/seed.ts            # Agente A
│  ├─ src/index.ts              # registra todos los routers · F0
│  ├─ src/lib/                  # prisma, sesión, r2, groq, errores · F0
│  ├─ src/motor/                # Agente A
│  ├─ src/routes/auth.ts, me.ts, inicio.ts        # Agente A
│  ├─ src/routes/pagos.ts, cuotas.ts, frecuentes.ts  # Agente B
│  ├─ src/routes/recibos.ts, asistente.ts, src/ia/   # Agente C
│  └─ src/routes/progreso.ts, demo.ts, eventos.ts, panel.ts  # Agente D
└─ apps/web/
   ├─ app/layout.tsx, globals.css, tailwind tokens   # F0
   ├─ components/ui/            # Boton, Tarjeta, Mascota, Pantalla · F0
   ├─ lib/api.ts, lib/track.ts  # cliente HTTP y telemetría · F0
   ├─ app/(entrada)/            # bienvenida, login, vista · Agente A
   ├─ app/inicio/, app/pagar/   # inicio, rutas A/B, confirmar, éxito · Agente B
   ├─ app/pagar/recibo/, app/ayuda/   # ruta C y asistente · Agente C
   └─ app/progreso/, app/panel/, components/DemoBar.tsx  # Agente D
```

**Regla para los agentes:** cada uno edita **solo** sus archivos. Si necesita cambiar un contrato (`schema.prisma`, `packages/shared`, `src/lib`, `components/ui`), lo reporta en lugar de editarlo. Todas las dependencias se instalan en F0 para que nadie toque `package.json`.

### Modelo de datos (Prisma / MySQL)
| Modelo | Campos clave |
|---|---|
| `Cliente` | id, nombre, edad, ocupacion, zona, opsPresencialesMes, opsDigitalesMes, gamaDispositivo, diaPagoHabitual, vistaPreferida?, primerIngreso, fechaSimulada, pagosSinAyuda |
| `Cuenta` | id, clienteId, tipo, saldo (Decimal) |
| `Cuota` | id, clienteId, numero, totalCuotas, monto, vencimiento, estado |
| `Servicio` | id, empresa, rubro (luz/agua/telefonía), formatoCodigo (regex) |
| `Recibo` | codigo (único), servicioId, titular, monto, vencimiento, pagado |
| `Frecuente` | id, clienteId, alias, servicioId, codigo, esPropio |
| `Pago` | id, idempotencyKey (único), clienteId, tipo (CUOTA/FRECUENTE/RECIBO), referencia, monto, estado, creadoEn |
| `Cashback` | id, clienteId, cuentaId, pagoId, motivo, monto, creadoEn |
| `Evento` | id, clienteId, sesionId, pantalla, accion, msDesdeInicio, ayudaUsada, creadoEn |

### Endpoints (contrato en `packages/shared`)
| Ruta | Dueño | Uso |
|---|---|---|
| `POST /auth/login` · `POST /auth/logout` | A | Rostro/huella/clave simulados → cookie de sesión |
| `GET /me` · `PUT /me/vista` | A | Perfil + recomendación del motor; guardar vista |
| `GET /inicio` | A | Avisos (≤ 3 días o día habitual) + accesos según vista |
| `GET /cuotas/proxima` · `GET /frecuentes` · `POST /frecuentes` | B | Rutas A y B; guardar frecuente |
| `POST /pagos/preparar` · `POST /pagos/confirmar` | B | Resumen + saldo; ejecución idempotente en transacción |
| `POST /recibos/leer` · `GET /recibos/:codigo` | C | Foto → R2 → Groq visión → código; consulta con titular enmascarado |
| `POST /asistente` | C | Groq con herramientas → acción para la UI (nunca paga) |
| `GET /progreso` · `POST /demo/adelantar` · `POST /demo/reset` | D | Cashback, progreso, reloj simulado, reinicio de demo |
| `POST /eventos` · `GET /panel/kpis` | D | Telemetría y los 3 indicadores |

---

## 3. Plan de 12 horas en fases

```
h0 ──── h1.5 ─────────────── h5 ──── h6.5 ──────── h8.5 ──── h10.5 ── h12
 F0 Base y contratos │ F1 Construcción paralela │ F2 Integración │ F3 Pulido paralelo │ F4 Demo │ colchón
 (secuencial)        │ 4 agentes                │ (secuencial)   │ 3 agentes          │
```

### F0 · Base y contratos · secuencial · ~1.5 h
Lo hago yo (agente principal) contigo. Todo lo demás depende de esto.
1. Monorepo con npm workspaces, TypeScript, `git init` (puntos de restauración entre fases).
2. `apps/api`: Express, Prisma conectado a Railway MySQL, `schema.prisma` completo, primera migración, `src/lib` (prisma, sesión con cookie firmada, cliente R2, cliente Groq, manejo de errores), **todos los routers registrados como stubs** que devuelven `501`.
3. `packages/shared`: tipos y esquemas zod de cada request/response de la tabla de endpoints.
4. `apps/web`: Next.js + Tailwind, tokens de diseño (colores Caja Piura, Atkinson Hyperlegible, escalas `data-vista="asistida|estandar"`), componentes base (`Boton`, `Tarjeta`, `Pantalla`, `Mascota` en SVG), `lib/api.ts`, `lib/track.ts`, rewrite `/api`.
5. Todas las dependencias instaladas (`groq-sdk`, `@aws-sdk/client-s3`, `zod`, `@faker-js/faker`, `multer`, etc.).
6. `.env` con tus llaves (tú las pegas; yo no las escribo en el chat) y primer despliegue de prueba en Vercel + Railway.

**Listo cuando:** la URL de Vercel abre en el celular y muestra `/api/health` respondido desde Railway con conexión a MySQL.

### F1 · Construcción paralela · 4 agentes · ~3.5 h
Cada agente recibe: este plan, los contratos de F0 y su lista de archivos. Trabajan a la vez en carpetas distintas.

| Agente | Alcance (fases del flujograma) | Listo cuando |
|---|---|---|
| **A · Datos, motor y entrada** | `seed.ts` (500 perfiles + Rosa 63, Elena 47, Carlos 35 fijos, cuotas, recibos, frecuentes, servicios); motor de reglas con razones + pruebas; `auth`, `me`, `inicio`; pantallas: principal con mascota, login guiado (rostro/huella/clave con 2 intentos), bienvenida y elección de vista | Rosa y Elena → asistida, Carlos → estándar con razones; se entra y la vista persiste |
| **B · Pagos (camino crítico)** | `cuotas`, `frecuentes`, `pagos` (preparar, confirmar idempotente, saldo insuficiente, error simulado con `?fallar=1`); pantallas: inicio con aviso proactivo y botones por vista, rutas A y B, confirmación grande con monto en voz alta (`speechSynthesis`), "Enséñame paso a paso", éxito con Compartir y puntos, error "no se cobró nada" | Cuota de Rosa pagada en 2 toques desde el aviso; reintento no duplica |
| **C · IA** | `recibos/leer` (compresión en cliente → R2 → Groq visión que devuelve solo el código en JSON → validación con regex), `recibos/:codigo` con titular enmascarado y monto real; `asistente` con herramientas cerradas (`ver_saldo`, `ver_deuda`, `ir_a_pantalla`, `preparar_pago_*`) y respaldo por palabras clave; pantallas: ruta C (recibos de demo precargados, reintento o digitar código), "¿Lo guardo?", Ayuda con sugerencias | Foto → código → pago listo; "pagar la luz de mi mamá" deja listo el pago B |
| **D · Retención y medición** | `progreso`, `demo/adelantar`, `demo/reset`, `eventos` (lote), `panel/kpis`; pantallas: progreso (puntos, "3 pagos este mes", cuotas que faltan), sugerencia de pasar a vista estándar, barra de demo flotante, aviso dentro de la app tras adelantar, panel del jurado | Adelantar 30 días → aviso → pagar → indicadores actualizados |

Integración entre agentes sin pisarse: B expone la pantalla de confirmación en `app/pagar/confirmar?tipo=&ref=`; C y el asistente solo **navegan** ahí. A expone el motor como función `recomendar(cliente)` en `src/motor/index.ts` que C usa para las sugerencias.

### F2 · Integración y despliegue · secuencial · ~1.5 h
1. Revisar lo que entregó cada agente, unir, correr `tsc` y las pruebas del motor.
2. Recorrido completo del flujograma en local con los 3 perfiles.
3. Desplegar en Vercel + Railway, sembrar la base de producción, probar en un celular real.
4. Lista de fallos priorizada para F3. Commit "demo-1" (versión que ya se puede presentar).

### F3 · Pulido paralelo · 3 agentes · ~2 h
| Agente | Alcance |
|---|---|
| **E · Correcciones** | Fallos encontrados en F2, en orden de prioridad |
| **F · Gama baja y accesibilidad** | `@next/bundle-analyzer`, < 200 KB JS por ruta, Lighthouse móvil con CPU lenta, objetivos ≥ 48 px, contraste AA, estados de carga y sin conexión |
| **G · Robustez de la demo** | Respuestas de Groq de respaldo si falla en vivo, `demo/reset` en un toque, recibos de demo que siempre funcionan, textos finales con tono por perfil |

Commit "demo-2". Después de esto **no se agregan funciones**.

### F4 · Demo · ~2 h + colchón 1.5 h
- Ensayo del guion con los 3 personajes en el celular real.
- Grabar el video comparativo (app actual vs. Modo Acompaña: toques y tiempo).
- Grabar un video de respaldo de la demo por si falla internet.

### Mientras tanto: compañeros no programadores (desde ahora)
| Tarea | Para cuándo |
|---|---|
| Pedir a Caja Piura el Excel, el video y los datos de abandono | Ya |
| Grabar el flujo actual de la app de Caja Piura contando toques y tiempo | h5 |
| Fotos de 3–4 recibos reales de luz/agua (con datos tapados) para la demo de visión | h3 |
| Presentación: problema, solución, demo, límites de la IA, indicadores, siguiente paso | h9 |
| Guion de demo con Rosa, Elena y Carlos | h9 |

---

## 4. Recortes decididos por tiempo
**Fuera:** voz de entrada (Whisper), Web Push, cron (se reemplaza por "Adelantar 30 días"), importador del Excel (solo si llega y sobra tiempo), constancia en PDF (se usa la pantalla de éxito + Compartir).

**Si una fase se atrasa, se recorta en este orden:** asistente con LLM (queda solo por palabras clave) → panel del jurado (quedan números simples) → ruta C con visión (queda digitar el código).

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|
| Groq lento o caído en la demo | Palabras clave + respuestas de respaldo (agente G) |
| La visión lee mal el código | Regex + digitar con guía + recibos de demo probados |
| Agentes que editan el mismo archivo | Dueños de archivos fijos, contratos cerrados en F0, git entre fases |
| Cookies entre Vercel y Railway | Rewrite `/api` en Next.js (mismo origen) |
| Peso de Next.js en gama baja | Server Components por defecto, revisión del agente F |
