// Dueño: Agente C. Asistente "Pía": Groq con herramientas CERRADAS + respaldo por palabras clave.
// La IA prepara, tú confirmas, Caja Piura procesa: no existe ninguna herramienta que pague.
// Al LLM solo va: nombre de pila, tono, alias de frecuentes con id, cuota pendiente (id, monto, vencimiento).
// Nunca DNI, clave ni números de cuenta.
import type { AccionUI, AsistenteRes, Tono } from "@cp/shared";
import type Groq from "groq-sdk";
import { groq, hayGroq, MODELO_TEXTO } from "../lib/groq.js";
import { aNumero, cuandoVence, soles } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { perfilDeCliente, recomendar } from "../motor/index.js";
import { interpretar, type FrecuenteCtx, type Intencion, type Pantalla, type ProblemaPago, type Rubro } from "./palabrasClave.js";
import { herramientaAceptable, textoLibreAceptable } from "./guardas.js";
import { quitarThink } from "./texto.js";

/** Límite de espera al LLM: pasado este tiempo responde el respaldo por palabras clave (la demo no se queda colgada). */
export const LIMITE_LLM_MS = 6_000;

// ── Contexto ─────────────────────────────────────────
type Ctx = {
  clienteId: number;
  nombre: string;
  tono: Tono;
  hoy: Date;
  frecuentes: (FrecuenteCtx & { servicioId: number; codigo: string })[];
  cuota: { id: number; monto: number; vencimiento: Date } | null;
};

async function cargarContexto(clienteId: number): Promise<Ctx> {
  const c = await prisma.cliente.findUniqueOrThrow({
    where: { id: clienteId },
    include: {
      frecuentes: { include: { servicio: true }, orderBy: { creadoEn: "asc" } },
      cuotas: { where: { estado: "PENDIENTE" }, orderBy: { vencimiento: "asc" }, take: 1 },
    },
  });
  const tono = recomendar(perfilDeCliente(c, c.frecuentes.length > 0)).tono;
  const q = c.cuotas[0];
  return {
    clienteId,
    nombre: c.nombre.split(" ")[0],
    tono,
    hoy: c.fechaSimulada,
    frecuentes: c.frecuentes.map((f) => ({ id: f.id, alias: f.alias, rubro: f.servicio.rubro, servicioId: f.servicioId, codigo: f.codigo })),
    cuota: q ? { id: q.id, monto: aNumero(q.monto), vencimiento: q.vencimiento } : null,
  };
}

// ── Frases según el tono del motor ───────────────────
type Variantes = { calido: string; corto: string; directo: string };
const t = (ctx: Ctx, v: Variantes) => (ctx.tono === "CALIDO" ? v.calido : ctx.tono === "CORTO" ? v.corto : v.directo);

const RUTAS: Record<Pantalla, string> = {
  inicio: "/inicio",
  pagar_cuota: "/pagar/cuota",
  frecuentes: "/pagar/frecuentes",
  pagar_recibo: "/pagar/recibo",
  progreso: "/progreso",
  ajustes: "/ajustes",
};
const NOMBRE_PANTALLA: Record<Pantalla, string> = {
  inicio: "el inicio",
  pagar_cuota: "tu cuota",
  frecuentes: "tus pagos frecuentes",
  pagar_recibo: "pagar un recibo",
  progreso: "tus puntos",
  ajustes: "Ajustes",
};
const RUBRO_TXT: Record<Rubro, string> = { LUZ: "la luz", AGUA: "el agua", TELEFONIA: "el celular", INTERNET: "el internet" };

const rutaCuota = (id: number) => `/pagar/confirmar?tipo=CUOTA&ref=${id}`;
const rutaFrecuente = (id: number) => `/pagar/confirmar?tipo=FRECUENTE&ref=${id}`;

export const RESPUESTA_CLAVE = "Nunca te pediré tu clave. Caja Piura no la pide por teléfono ni por mensaje.";
const OPCIONES_BASE: { texto: string; ruta: string }[] = [
  { texto: "Pagar mi cuota", ruta: "/pagar/cuota" },
  { texto: "Mis pagos frecuentes", ruta: "/pagar/frecuentes" },
  { texto: "Pagar un recibo", ruta: "/pagar/recibo" },
  { texto: "Ver mi saldo", ruta: "/inicio" },
];

type Resultado = { respuesta: string; accion: AccionUI };
const ninguna: AccionUI = { tipo: "NINGUNA" };

async function deudaDeFrecuente(f: { servicioId: number; codigo: string }) {
  return prisma.recibo.findFirst({
    where: { servicioId: f.servicioId, codigo: f.codigo, pagado: false },
    orderBy: { vencimiento: "asc" },
  });
}

// ── Ejecutores (comunes a herramientas del LLM y a palabras clave) ──
async function verSaldo(ctx: Ctx): Promise<Resultado> {
  const cuentas = await prisma.cuenta.findMany({ where: { clienteId: ctx.clienteId }, orderBy: { id: "asc" } });
  const total = cuentas.reduce((s, k) => s + aNumero(k.saldo), 0);
  return {
    respuesta: t(ctx, {
      calido: `${ctx.nombre}, en tu cuenta tienes ${soles(total)}. Todo está en orden.`,
      corto: `Tienes ${soles(total)} en tu cuenta.`,
      directo: `Saldo disponible: ${soles(total)}.`,
    }),
    accion: ninguna,
  };
}

async function verDeuda(ctx: Ctx): Promise<Resultado> {
  const partes: string[] = [];
  const opciones: { texto: string; ruta: string }[] = [];
  if (ctx.cuota) {
    partes.push(`tu cuota de ${soles(ctx.cuota.monto)} vence ${cuandoVence(ctx.hoy, ctx.cuota.vencimiento)}`);
    opciones.push({ texto: "Pagar mi cuota", ruta: rutaCuota(ctx.cuota.id) });
  }
  for (const f of ctx.frecuentes) {
    const r = await deudaDeFrecuente(f);
    if (r) {
      partes.push(`${f.alias}: ${soles(aNumero(r.monto))}`);
      opciones.push({ texto: `Pagar ${f.alias}`, ruta: rutaFrecuente(f.id) });
    }
  }
  if (!partes.length) {
    return {
      respuesta: t(ctx, {
        calido: `¡Buenas noticias, ${ctx.nombre}! No tienes pagos pendientes.`,
        corto: "No tienes pagos pendientes.",
        directo: "Sin pagos pendientes.",
      }),
      accion: ninguna,
    };
  }
  const lista = partes.join(" · ");
  return {
    respuesta: t(ctx, {
      calido: `${ctx.nombre}, esto tienes pendiente: ${lista}. ¿Cuál quieres pagar?`,
      corto: `Tienes pendiente: ${lista}.`,
      directo: `Pendiente: ${lista}.`,
    }),
    accion: opciones.length === 1 ? { tipo: "NAVEGAR", ruta: opciones[0].ruta } : { tipo: "OPCIONES", opciones },
  };
}

function prepararCuota(ctx: Ctx): Resultado {
  if (!ctx.cuota) {
    return { respuesta: t(ctx, { calido: `${ctx.nombre}, no tienes cuotas pendientes. ¡Estás al día!`, corto: "No tienes cuotas pendientes.", directo: "Sin cuotas pendientes." }), accion: ninguna };
  }
  const m = soles(ctx.cuota.monto);
  return {
    respuesta: t(ctx, {
      calido: `Listo, ${ctx.nombre}. Te dejé preparada tu cuota de ${m}. Solo revisa y confirma.`,
      corto: `Tu cuota de ${m} está lista. Revisa y confirma.`,
      directo: `Cuota de ${m} preparada. Confirma el pago.`,
    }),
    accion: { tipo: "NAVEGAR", ruta: rutaCuota(ctx.cuota.id) },
  };
}

async function prepararFrecuente(ctx: Ctx, ids: number[]): Promise<Resultado> {
  const elegidos = ids.map((id) => ctx.frecuentes.find((f) => f.id === id)).filter((f): f is Ctx["frecuentes"][number] => Boolean(f));
  if (!elegidos.length) return opcionesNoEntendi(ctx);
  if (elegidos.length > 1) {
    return {
      respuesta: t(ctx, { calido: `${ctx.nombre}, ¿cuál de estos quieres pagar?`, corto: "¿Cuál quieres pagar?", directo: "Elige cuál pagar:" }),
      accion: { tipo: "OPCIONES", opciones: elegidos.map((f) => ({ texto: f.alias, ruta: rutaFrecuente(f.id) })) },
    };
  }
  const f = elegidos[0];
  const r = await deudaDeFrecuente(f);
  if (!r) {
    return {
      respuesta: t(ctx, { calido: `${ctx.nombre}, "${f.alias}" no tiene deuda pendiente. ¡Está al día!`, corto: `"${f.alias}" no tiene deuda.`, directo: `"${f.alias}": sin deuda pendiente.` }),
      accion: ninguna,
    };
  }
  const m = soles(aNumero(r.monto));
  return {
    respuesta: t(ctx, {
      calido: `Listo, ${ctx.nombre}. Preparé el pago de "${f.alias}" por ${m}. Solo revisa y confirma.`,
      corto: `"${f.alias}": ${m}. Revisa y confirma.`,
      directo: `Pago de "${f.alias}" por ${m} preparado. Confirma.`,
    }),
    accion: { tipo: "NAVEGAR", ruta: rutaFrecuente(f.id) },
  };
}

function prepararRecibo(ctx: Ctx, rubro?: Rubro): Resultado {
  const que = rubro ? `${RUBRO_TXT[rubro]} ` : "";
  return {
    respuesta: t(ctx, {
      calido: `Vamos a pagar ${que ? que + "con " : "con "}una foto del recibo, ${ctx.nombre}. Solo necesito leer el código.`,
      corto: `Toma una foto del recibo${que ? " de " + que.trim() : ""}.`,
      directo: "Toma una foto del recibo para leer el código.",
    }),
    accion: { tipo: "NAVEGAR", ruta: "/pagar/recibo" },
  };
}

function irA(ctx: Ctx, p: Pantalla): Resultado {
  return {
    respuesta: t(ctx, { calido: `Te llevo a ${NOMBRE_PANTALLA[p]}, ${ctx.nombre}.`, corto: `Vamos a ${NOMBRE_PANTALLA[p]}.`, directo: `Abriendo ${NOMBRE_PANTALLA[p]}.` }),
    accion: { tipo: "NAVEGAR", ruta: RUTAS[p] },
  };
}

function cambiarClave(): Resultado {
  return {
    respuesta: "Por tu seguridad, tu clave se cambia en Ajustes o en una agencia. Yo nunca te pediré tu clave.",
    accion: { tipo: "OPCIONES", opciones: [{ texto: "Ir a Ajustes", ruta: "/ajustes" }] },
  };
}

const respuestaSegura = (): Resultado => ({ respuesta: RESPUESTA_CLAVE, accion: ninguna });

function fueraDeAlcance(ctx: Ctx): Resultado {
  return {
    respuesta: t(ctx, {
      calido: `${ctx.nombre}, eso todavía no lo puedo hacer. Puedo ayudarte con tu cuota, tus pagos frecuentes y recibos.`,
      corto: "Eso no lo puedo hacer. Te ayudo con tu cuota, frecuentes o recibos.",
      directo: "Eso no lo hago desde aquí. Te ayudo con cuota, frecuentes y recibos.",
    }),
    accion: { tipo: "OPCIONES", opciones: OPCIONES_BASE.slice(0, 3) },
  };
}

function opcionesNoEntendi(ctx: Ctx): Resultado {
  return {
    respuesta: t(ctx, { calido: `Perdona, ${ctx.nombre}, no te entendí bien. ¿Quisiste decir…?`, corto: "No te entendí. ¿Quisiste decir…?", directo: "¿Quisiste decir…?" }),
    accion: { tipo: "OPCIONES", opciones: OPCIONES_BASE },
  };
}

// ── Problemas con un pago: se responde con los pagos reales del cliente (nunca con lo que diga el LLM) ──
const fechaCorta = (d: Date) => d.toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "America/Lima" });

async function problemaPago(ctx: Ctx, problema: ProblemaPago): Promise<Resultado> {
  const pagos = await prisma.pago.findMany({ where: { clienteId: ctx.clienteId }, orderBy: { creadoEn: "desc" }, take: 20 });
  const cuentas = await prisma.cuenta.findMany({ where: { clienteId: ctx.clienteId } });
  const saldo = soles(cuentas.reduce((s, k) => s + aNumero(k.saldo), 0));
  const ultimo = pagos[0];
  const detalle = (p: (typeof pagos)[number]) => `${p.descripcion}, ${soles(aNumero(p.monto))}, el ${fechaCorta(p.creadoEn)}`;

  if (!ultimo) {
    return {
      respuesta: t(ctx, {
        calido: `${ctx.nombre}, revisé y todavía no tienes pagos desde la app. No se cobró nada de tu cuenta: tienes ${saldo}.`,
        corto: `No tienes pagos desde la app. Tu saldo: ${saldo}.`,
        directo: `Sin pagos registrados en la app. Saldo: ${saldo}.`,
      }),
      accion: ninguna,
    };
  }

  if (problema === "DUPLICADO") {
    const exitosos = pagos.filter((p) => p.estado === "EXITOSO");
    const repetido = exitosos.find((p, i) => exitosos.findIndex((q) => q.tipo === p.tipo && q.referenciaId === p.referenciaId) !== i);
    if (repetido) {
      return {
        respuesta: `Veo dos pagos de ${repetido.descripcion}. Acércate a una agencia o llama a Caja Piura con tu n.º de operación ${repetido.operacion} y te devuelven lo cobrado de más.`,
        accion: ninguna,
      };
    }
    return {
      respuesta: t(ctx, {
        calido: `${ctx.nombre}, revisé tus pagos y cada uno se cobró una sola vez. Aunque toques dos veces, la app no cobra doble. Tu último pago: ${detalle(exitosos[0] ?? ultimo)}.`,
        corto: `Cada pago se cobró una sola vez. La app no cobra doble. Último: ${detalle(exitosos[0] ?? ultimo)}.`,
        directo: `Sin cobros duplicados. Cada pago tiene un código único. Último: ${detalle(exitosos[0] ?? ultimo)}.`,
      }),
      accion: ninguna,
    };
  }

  if (problema === "NO_PROCESADO") {
    if (ultimo.estado === "FALLIDO") {
      return {
        respuesta: t(ctx, {
          calido: `${ctx.nombre}, tu pago de ${ultimo.descripcion} no se realizó y no se cobró nada: tu saldo sigue en ${saldo}. ¿Lo intentamos de nuevo?`,
          corto: `Ese pago no se hizo y no se cobró nada. Tu saldo sigue en ${saldo}. ¿Lo intentamos de nuevo?`,
          directo: `Pago no realizado, sin cobro. Saldo: ${saldo}. Puedes reintentarlo.`,
        }),
        accion: { tipo: "OPCIONES", opciones: [{ texto: "Intentar de nuevo", ruta: `/pagar/confirmar?tipo=${ultimo.tipo}&ref=${ultimo.referenciaId}` }] },
      };
    }
    return {
      respuesta: t(ctx, {
        calido: `${ctx.nombre}, tu último pago sí se realizó: ${detalle(ultimo)}. Tu n.º de operación es ${ultimo.operacion}.`,
        corto: `Tu último pago sí se hizo: ${detalle(ultimo)}. Operación ${ultimo.operacion}.`,
        directo: `Último pago realizado: ${detalle(ultimo)}. Operación ${ultimo.operacion}.`,
      }),
      accion: ninguna,
    };
  }

  // ERRADO: la app no revierte pagos; se orienta con el n.º de operación.
  const ref = pagos.find((p) => p.estado === "EXITOSO") ?? ultimo;
  return {
    respuesta: t(ctx, {
      calido: `No te preocupes, ${ctx.nombre}. Yo no puedo devolver un pago, pero en una agencia o llamando a Caja Piura lo revisan con tu n.º de operación ${ref.operacion} (${detalle(ref)}).`,
      corto: `Yo no puedo devolverlo. En la agencia o por teléfono lo revisan con tu operación ${ref.operacion} (${detalle(ref)}).`,
      directo: `La app no revierte pagos. Reclama en agencia o por teléfono con la operación ${ref.operacion} (${detalle(ref)}).`,
    }),
    accion: ninguna,
  };
}

export async function ejecutarIntencion(ctx: Ctx, i: Intencion): Promise<Resultado> {
  switch (i.tipo) {
    case "CUOTA":
      return prepararCuota(ctx);
    case "DEUDA":
      return verDeuda(ctx);
    case "SALDO":
      return verSaldo(ctx);
    case "FRECUENTE":
      return prepararFrecuente(ctx, i.ids);
    case "RUBRO_SIN_FRECUENTE":
      return prepararRecibo(ctx, i.rubro);
    case "RECIBO":
      return prepararRecibo(ctx);
    case "PANTALLA":
      return irA(ctx, i.pantalla);
    case "CLAVE_CAMBIAR":
      return cambiarClave();
    case "CLAVE_PEDIDA":
      return respuestaSegura();
    case "FUERA_DE_ALCANCE":
      return fueraDeAlcance(ctx);
    case "PROBLEMA_PAGO":
      return problemaPago(ctx, i.problema);
    default:
      return opcionesNoEntendi(ctx);
  }
}

// ── LLM con herramientas cerradas ─────────────────────
const PANTALLAS = Object.keys(RUTAS) as Pantalla[];
const HERRAMIENTAS: Groq.Chat.ChatCompletionTool[] = [
  { type: "function", function: { name: "ver_saldo", description: "Muestra el saldo de la cuenta del cliente.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "ver_deuda", description: "Lista lo que el cliente debe: su cuota del crédito y los recibos pendientes de sus pagos frecuentes.", parameters: { type: "object", properties: {} } } },
  {
    type: "function",
    function: {
      name: "ir_a_pantalla",
      description: "Lleva al cliente a una pantalla de la app.",
      parameters: { type: "object", properties: { pantalla: { type: "string", enum: PANTALLAS } }, required: ["pantalla"] },
    },
  },
  { type: "function", function: { name: "preparar_pago_cuota", description: "Deja LISTO (sin pagar) el pago de la cuota pendiente del crédito. El cliente confirma después.", parameters: { type: "object", properties: {} } } },
  {
    type: "function",
    function: {
      name: "preparar_pago_frecuente",
      description: "Deja LISTO (sin pagar) el pago de un pago frecuente guardado. El cliente confirma después. Si el pedido puede referirse a varios frecuentes, pon los otros en otrosCandidatos.",
      parameters: {
        type: "object",
        properties: {
          frecuenteId: { type: "integer", description: "id del pago frecuente" },
          otrosCandidatos: { type: "array", items: { type: "integer" }, description: "ids de otros frecuentes que también podrían ser" },
        },
        required: ["frecuenteId"],
      },
    },
  },
  { type: "function", function: { name: "preparar_pago_recibo", description: "Para pagar un recibo nuevo (no guardado): lleva a tomar la foto del recibo.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "cambiar_clave", description: "El cliente quiere cambiar u olvidó su clave: explica dónde hacerlo. Nunca pidas la clave.", parameters: { type: "object", properties: {} } } },
];

const ESTILO: Record<Tono, string> = {
  CALIDO: "Habla cálido y pausado, con su nombre, frases simples.",
  CORTO: "Usa frases muy cortas y claras.",
  DIRECTO: "Sé directo y breve.",
};

function promptSistema(ctx: Ctx) {
  const frec = ctx.frecuentes.length ? ctx.frecuentes.map((f) => `- id ${f.id}: "${f.alias}" (${f.rubro})`).join("\n") : "- (no tiene)";
  const cuota = ctx.cuota ? `Sí: id ${ctx.cuota.id}, ${soles(ctx.cuota.monto)}, vence ${cuandoVence(ctx.hoy, ctx.cuota.vencimiento)}` : "No";
  return `Eres Pía, la asistente de la app de Caja Piura (Perú). Ayudas a clientes con poca experiencia digital.
Cliente: ${ctx.nombre}. ${ESTILO[ctx.tono]} Español peruano, trato de "tú", 1 o 2 líneas, sin tecnicismos.
Pagos frecuentes guardados:
${frec}
Cuota pendiente: ${cuota}

Reglas:
- Usa SIEMPRE una herramienta cuando el pedido encaje con alguna. Tú NO pagas nada: solo preparas y el cliente confirma.
- "pagar la luz/agua/celular/internet" o un alias → preparar_pago_frecuente con el id que corresponda. Si hay más de uno posible, usa otrosCandidatos. Si no tiene ese servicio guardado → preparar_pago_recibo.
- "cuánto debo" → ver_deuda. "mi crédito/cuota" → preparar_pago_cuota.
- Nunca pidas ni muestres claves, DNI ni números de cuenta. Si piden su clave: "Nunca te pediré tu clave. Caja Piura no la pide por teléfono ni por mensaje."
- Si piden transferir dinero o algo fuera de pagos de cuota/recibos/saldo/puntos, di amablemente que no puedes y ofrece lo que sí puedes.`;
}

async function conLLM(ctx: Ctx, mensaje: string, intencion: Intencion): Promise<Resultado | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIMITE_LLM_MS);
  try {
    const r = await groq.chat.completions.create(
      {
        model: MODELO_TEXTO,
        temperature: 0.2,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: promptSistema(ctx) },
          { role: "user", content: mensaje },
        ],
        tools: HERRAMIENTAS,
        tool_choice: "auto",
      },
      { signal: ctrl.signal, maxRetries: 0, timeout: LIMITE_LLM_MS },
    );
    const msg = r.choices[0]?.message;
    const tc = msg?.tool_calls?.[0];
    if (tc) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {}
      // Guarda: si las palabras clave reconocieron otra cosa, manda la regla (respuesta predecible en la demo).
      if (!herramientaAceptable(tc.function.name, args, intencion)) return null;
      switch (tc.function.name) {
        case "ver_saldo":
          return verSaldo(ctx);
        case "ver_deuda":
          return verDeuda(ctx);
        case "ir_a_pantalla": {
          const p = String(args.pantalla) as Pantalla;
          return PANTALLAS.includes(p) ? irA(ctx, p) : opcionesNoEntendi(ctx);
        }
        case "preparar_pago_cuota":
          return prepararCuota(ctx);
        case "preparar_pago_frecuente": {
          const ids = [Number(args.frecuenteId), ...(Array.isArray(args.otrosCandidatos) ? args.otrosCandidatos.map(Number) : [])];
          // Verificación determinista: si las palabras clave reconocen otro servicio (p. ej. "agua" sin frecuente de agua),
          // manda la regla. El LLM no puede preparar un pago que el cliente no pidió.
          if (intencion.tipo === "RUBRO_SIN_FRECUENTE") return prepararRecibo(ctx, intencion.rubro);
          if (intencion.tipo === "FRECUENTE" && !intencion.ids.includes(ids[0])) return prepararFrecuente(ctx, intencion.ids);
          if (intencion.tipo === "FRECUENTE" && intencion.ids.length > 1) return prepararFrecuente(ctx, intencion.ids);
          return prepararFrecuente(ctx, [...new Set(ids.filter((n) => Number.isInteger(n)))]);
        }
        case "preparar_pago_recibo":
          return prepararRecibo(ctx);
        case "cambiar_clave":
          return cambiarClave();
        default:
          return null;
      }
    }
    // Sin herramienta: solo se acepta una frase normal y si las palabras clave no reconocieron nada.
    // Texto raro, cifras (posibles montos inventados) o datos sensibles → respaldo por palabras clave.
    const texto = textoLibreAceptable(quitarThink(msg?.content), intencion);
    if (!texto) return null;
    return { respuesta: texto, accion: { tipo: "OPCIONES", opciones: OPCIONES_BASE } };
  } catch (e) {
    console.warn("[asistente] LLM:", (e as Error).message?.slice(0, 160));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Punto de entrada: mensaje del cliente → respuesta + acción para la UI. */
export async function responder(clienteId: number, mensaje: string): Promise<AsistenteRes> {
  try {
    return await responderSinRespaldo(clienteId, mensaje);
  } catch (e) {
    // Último respaldo: nunca un error crudo en pantalla. Se ofrecen los accesos principales.
    console.warn("[asistente] respaldo final:", (e as Error).message?.slice(0, 160));
    const i = interpretar(mensaje, []);
    if (i.tipo === "CLAVE_PEDIDA" || i.tipo === "CLAVE_CAMBIAR") return { respuesta: RESPUESTA_CLAVE, accion: ninguna, fuente: "PALABRAS_CLAVE" };
    return { respuesta: "Ahora no pude revisar tus datos. Elige qué quieres hacer:", accion: { tipo: "OPCIONES", opciones: OPCIONES_BASE }, fuente: "PALABRAS_CLAVE" };
  }
}

async function responderSinRespaldo(clienteId: number, mensaje: string): Promise<AsistenteRes> {
  const ctx = await cargarContexto(clienteId);
  const intencion = interpretar(mensaje, ctx.frecuentes);
  // Seguridad determinista: la clave, mover dinero y los reclamos de pagos nunca pasan por el LLM.
  if (intencion.tipo === "CLAVE_PEDIDA" || intencion.tipo === "CLAVE_CAMBIAR" || intencion.tipo === "FUERA_DE_ALCANCE" || intencion.tipo === "PROBLEMA_PAGO") {
    return { ...(await ejecutarIntencion(ctx, intencion)), fuente: "PALABRAS_CLAVE" };
  }
  if (hayGroq) {
    const r = await conLLM(ctx, mensaje, intencion);
    if (r) return { ...r, fuente: "LLM" };
  }
  return { ...(await ejecutarIntencion(ctx, intencion)), fuente: "PALABRAS_CLAVE" };
}
