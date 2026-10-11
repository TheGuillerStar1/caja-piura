<div align="center">

# 🔵 Caja Piura · Modo Acompaña

### *La IA prepara, tú confirmas, Caja Piura procesa.*

**Reto 13 · Piura Innova** — Propuesta para que nuestros clientes emprendedores **se queden en la app** y dejen de volver a la ventanilla.

**Caja Piura Contigo** · Demo en vivo: <https://caja-piura-blue.vercel.app/>

</div>

---

## 1. Identidad visual aplicada

La solución no es "otra app": es **la app oficial de Caja Piura** con la misma barra inferior y un botón nuevo, **Pía**. Respeta el *Manual visual «Caja Piura Contigo»*.

| Rol | Color | Hex | Dónde se usa |
|---|---|---|---|
| Azul institucional | 🟦 | `#00549F` | Logo |
| Azul app (marca) | 🔷 | `#0B4ED4` | Barra superior y botones principales (no cambia entre modo claro y oscuro) |
| Naranja de acción | 🟧 | `#D97706` | "👇 Toca aquí", foco y llamadas a la acción |
| Éxito | 🟩 | `#4CC77F` / `#157347` | "Te ahorraste una visita a la agencia" |
| Aviso | 🟨 | `#F5B84A` / `#8A5300` | Cuotas por vencer |

- **Tipografía:** Roboto (la de la app oficial); en vista asistida todo el texto crece un 12,5 % (16 → 18 px).
- **Modo claro y oscuro** en *Ajustes › Colores de la pantalla*, con contraste AA.
- **Tono:** español peruano, trato de "tú", sin tecnicismos. Ejemplo real de la app: *"No se realizó el pago. No se cobró nada."*
- **Mascota Pía:** la cara cercana de Caja Piura dentro de la app. Guía, prepara y explica. **Nunca paga ni pide la clave.**

---

## 2. El problema

Nuestros clientes emprendedores (comerciantes, agricultores, transportistas) **activan la app pero regresan a la agencia**. No es falta de interés; son tres barreras:

| Barrera | Qué siente el cliente | Cómo la resuelve Modo Acompaña |
|---|---|---|
| 🛡️ **Desconfianza** | "¿Y si pago mal? ¿Y si me cobran dos veces?" | Titular enmascarado, "Confirmar pago" obligatorio, pagos que nunca se cobran dos veces, Pía nunca pide claves |
| 🧱 **Fricción** | "Son muchos pasos, no sé el código del recibo" | Pago en 2 toques desde el aviso, pagos frecuentes guardados, **foto del recibo** en lugar de digitar |
| 🧭 **Desorientación** | "No sé dónde tocar" | Vista asistida, "👇 Toca aquí", "Enséñame paso a paso", monto leído en voz alta |

Y una restricción que lo cruza todo: **celulares de gama baja** y conexiones lentas.

---

## 3. La solución en una mirada

```
 ┌────────────────┐    ┌────────────────────┐    ┌───────────────────┐    ┌──────────────────┐
 │ 1. Te conoce   │ ─► │ 2. Te avisa        │ ─► │ 3. Te acompaña    │ ─► │ 4. Te premia     │
 │ Motor elige    │    │ "Tu cuota vence en │    │ Pía, foto del     │    │ Puntos, progreso │
 │ vista asistida │    │  3 días" → Pagar   │    │ recibo, voz,      │    │ y paso a vista   │
 │ o estándar     │    │  S/ 350 (2 toques) │    │ confirmar seguro  │    │ estándar         │
 └────────────────┘    └────────────────────┘    └───────────────────┘    └──────────────────┘
```

### 3.1 Motor de personalización (explicable, sin IA)
- **Reglas deterministas**, no un modelo de lenguaje: cada decisión se puede explicar y auditar.
- Mide **cómo usa el cliente sus canales**, no quién es:
  `puntaje = 15 + tasa digital·60 + volumen digital·10 + ajuste por gama del celular + pagos sin ayuda·1,5`
- Puntaje < 55 → **vista asistida**, si no → **estándar**.
- **Edad, zona y ocupación no entran en el cálculo.** No se discrimina por perfil.
- El cliente ve **por qué** se le recomienda (p. ej. *"Haces casi todas tus operaciones en agencia"*) y **siempre elige** con un interruptor y vista previa en vivo.
- **Graduación:** a medida que paga sin ayuda, el motor le sugiere pasar a la vista estándar.

### 3.2 Pagos que dan confianza
Tres caminos al mismo punto de confirmación:

| Ruta | Para qué | Toques |
|---|---|---|
| **A · Cuota** | Desde el aviso "Tu cuota vence…" | 2 |
| **B · Frecuentes** | "La luz de mi mamá", guardada | 2 |
| **C · Recibo con foto** | Foto → la IA lee **solo el código** → Caja Piura trae el monto real | 3 |

- **Nunca se cobra dos veces:** cada pago lleva una `Idempotency-Key`; reintentar devuelve el mismo resultado.
- Errores que dicen qué pasó: *"Tu cuenta no tiene saldo suficiente. No se cobró nada."*
- En vista asistida, **el monto se lee en voz alta** antes de confirmar.
- Botones con el monto: **"Pagar S/ 350"**, no "Continuar".

### 3.3 Pía, la asistente de Caja Piura
- Chat simple con 3 accesos grandes y preguntas rápidas.
- Entiende frases como *"quiero pagar la luz de mi mamá"* y **deja el pago listo** en la pantalla de confirmación. **El cliente confirma; Pía nunca ejecuta.**
- Resuelve consultas de **pago duplicado, no procesado o errado** con los pagos reales del cliente.
- 🔒 *"Pía nunca te pide tu clave."*

### 3.4 Retención comprobable
- **Puntos:** 10 por pago digital, +5 si fue sin ayuda, +10 si la cuota se pagó antes de vencer.
- **Beneficios dentro de Caja Piura:** S/ 2 menos en la cuota (50 pts) · descuento en comisión (120 pts) · prioridad en agencia (250 pts). *Sin sorteos: requieren autorización del Ministerio del Interior.*
- **Recordatorios configurables:** 5, 3, 1 día antes o el mismo día; de cuota y/o servicios.
- **Mensaje de éxito:** *"Te ahorraste una visita a la agencia."*

---

## 4. Nuestros clientes en la demo

| Cliente | Perfil | Uso real | Recomendación |
|---|---|---|---|
| 👵 **Rosa, 63** | Comerciante, paga el día 12 | 9 operaciones en agencia, 0 digitales, celular gama baja | **Asistida** · tono cálido |
| 👩‍🌾 **Elena, 47** | Agricultora en zona rural | 6 en agencia, 1 digital, gama baja | **Asistida** · sin frecuentes aún |
| 🚚 **Carlos, 35** | Transportista | 1 en agencia, 14 digitales, gama media | **Estándar** · tono directo |

Además, la base tiene **500 perfiles sintéticos** con el esquema de datos de Caja Piura, usados para mostrar en el panel cómo se distribuirían las vistas.

**Guion sugerido (≈ 3 min):** Rosa entra con su DNI y PIN → el motor le explica por qué la vista asistida → aviso "tu cuota vence" → paga en 2 toques y escucha el monto → gana puntos → **"Adelantar 30 días"** → llega el nuevo aviso → paga otra vez → el panel del jurado se actualiza.

---

## 5. Cómo lo medimos (panel del jurado)

| Indicador | Fórmula |
|---|---|
| ✅ **Éxito sin ayuda** | pagos exitosos sin ayuda ÷ (pagos registrados + abandonos en "Confirmar") |
| ⏱️ **Tiempo por operación** | Promedio por ruta (cuota, frecuente, recibo) vs. app actual |
| 📉 **Pantalla de abandono** | Embudo de pantallas vistas vs. abandonadas |
| 👥 **Distribución de vistas** | Asistida / estándar sobre los 500 perfiles |

Cada pantalla registra eventos (`ver`, `tocar`, `completar`, `error`, `abandonar`) y si se usó ayuda.

> ⚠️ **Por completar antes de presentar:** el tiempo de referencia de la app actual está fijado en **180 s como valor provisional** (`apps/api/src/routes/panel.ts`). Reemplazarlo por lo medido en el video del flujo actual.

---

## 6. IA responsable

| Principio | Cómo se cumple en el código |
|---|---|
| La IA **no decide** la vista | Motor por reglas, con pruebas automáticas |
| La IA **no paga** | Herramientas cerradas: ver saldo, ver deuda, ir a pantalla, preparar pago. La confirmación siempre es del cliente |
| La IA **no inventa montos** | De la foto solo se lee el código; el monto lo da Caja Piura. Si el texto libre del modelo trae cifras, se descarta |
| La IA **no ve datos sensibles** | Nunca se envían claves, DNI ni cuentas completas. Se bloquean respuestas con "clave", "PIN", "tarjeta", etc. |
| **Siempre hay respaldo** | Si la IA falla o se contradice con las palabras clave, manda la regla. Nunca un error crudo en pantalla |
| **Fotos privadas** | Las fotos de los clientes se guardan en almacenamiento privado y nunca se exponen |

---

## 7. Pensado para gama baja

- Next.js con componentes de servidor y **sin librerías de interfaz** (solo React + Tailwind).
- Íconos y mascota en **SVG**; animaciones solo con CSS.
- La foto del recibo se **comprime en el celular** antes de enviarse.
- Botones de **48 px o más**, aviso de "sin conexión" y estados de carga.

---

## 8. Arquitectura

```
Celular ──► Vercel · Next.js 16 + Tailwind 4 (la app)
              │  /api/* en el mismo dominio (sesión segura, sin CORS)
              ▼
            Railway · Node 20 + Express + Prisma
              ├─ MySQL 8 ··········· clientes, cuotas, pagos, puntos, eventos
              ├─ Cloudflare R2 ····· fotos de recibos (privadas)
              └─ Groq ·············· asistente y lectura de recibos (solo desde el servidor)
```

**Calidad:** 51 pruebas automáticas (motor, pagos e idempotencia, palabras clave, respaldo de IA, retención), contratos tipados compartidos entre web y API.

---

## 9. Por qué conviene a Caja Piura

| Para el cliente | Para Caja Piura |
|---|---|
| Paga su cuota sin hacer cola | Menos carga en ventanilla |
| Entiende y confía en lo que hace | Más operaciones digitales por cliente |
| Recibe ayuda cuando la necesita | Datos para ver **dónde** abandonan y mejorar |
| Gana beneficios reales | Clientes que pagan antes del vencimiento |
| Va ganando autonomía | Adopción progresiva, sin capacitación costosa: se activa en agencia **o solo desde el celular** |

---

## 10. Límites y siguientes pasos

**Límites reconocidos**
- Si el cliente no tiene saldo o maneja efectivo, la app le indica cómo depositar; no lo resuelve.
- Login biométrico simulado en la demo.
- Datos ficticios con el esquema de Caja Piura (se reemplazan con datos reales cuando estén disponibles).

**Siguientes pasos**
1. Piloto en una agencia de Piura con clientes reales en vista asistida.
2. Integración con el core bancario y la biometría real de la app.
3. Notificaciones push reales (hoy simuladas con "Adelantar 30 días").
4. Entrada por voz para Pía.
5. Medir 30 días: éxito sin ayuda, tiempo por pago y visitas a agencia evitadas.

---

<div align="center">

**Caja Piura · Modo Acompaña**

*La IA prepara, tú confirmas, Caja Piura procesa.*

</div>
