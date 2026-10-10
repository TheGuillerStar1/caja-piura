// F0. Cliente HTTP único hacia el backend (vía rewrite /api → Railway). Usar desde componentes "use client".
// Tipos de request/response: importar de "@cp/shared".
// F3: detecta "sin conexión" antes de enviar (navigator.onLine), corta esperas eternas (red rural lenta) y
// da mensajes claros que dicen si se cobró o no.

export class ApiFallo extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensaje: string,
    public datos?: Record<string, unknown>,
  ) {
    super(mensaje);
  }
}

type Opciones = {
  metodo?: "GET" | "POST" | "PUT" | "DELETE";
  cuerpo?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  /** Tiempo máximo de espera en ms (por defecto 30 s, 60 s si se sube un archivo; 0 = sin límite). */
  espera?: number;
};

export const MENSAJE_SIN_CONEXION = "Sin conexión. No se cobró nada, vuelve a intentar.";
// Los pagos usan idempotencyKey: si la conexión se corta a mitad, reintentar no cobra dos veces.
const MENSAJE_CORTE_PAGO = "Se cortó la conexión. Vuelve a intentar: no se te cobrará dos veces.";
const MENSAJE_LENTO = "Tu internet está muy lento. No se cobró nada, vuelve a intentar.";
const MENSAJE_LENTO_PAGO = "Tu internet está muy lento. Vuelve a intentar: no se te cobrará dos veces.";

/** true si el navegador sabe que no hay red. (navigator.onLine = true no garantiza que haya internet.) */
export function sinRed() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

const MENSAJE_SIN_SERVICIO = "El servicio no responde. No se cobró nada, vuelve a intentar.";
/** Esperas entre reintentos automáticos (solo GET): la API se reinicia o el proxy responde 5xx un momento. */
const REINTENTOS_GET = [700, 1800];
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const method = opciones.metodo ?? (opciones.cuerpo || opciones.formData ? "POST" : "GET");
  // Solo GET se reintenta solo: nunca se repite un POST (los pagos ya tienen su idempotencyKey en Confirmar).
  for (let intento = 0; ; intento++) {
    try {
      return await llamar<T>(ruta, method, opciones);
    } catch (e) {
      const transitorio = e instanceof ApiFallo && (e.codigo === "SIN_SERVICIO" || (e.codigo === "SIN_CONEXION" && !sinRed()));
      if (method !== "GET" || !transitorio || intento >= REINTENTOS_GET.length || opciones.signal?.aborted) throw e;
      await pausa(REINTENTOS_GET[intento]);
    }
  }
}

async function llamar<T>(
  ruta: string,
  method: string,
  { cuerpo, formData, signal, espera = formData ? 60000 : 30000 }: Opciones,
): Promise<T> {
  const esPago = method !== "GET" && ruta.startsWith("/pagos/confirmar");

  // Sin red: no se envía nada, así que con seguridad no se cobró.
  if (sinRed()) throw new ApiFallo(0, "SIN_CONEXION", MENSAJE_SIN_CONEXION);

  // Límite de espera + señal del que llama (sin AbortSignal.any: no existe en Chrome viejos de gama baja).
  const ctrl = new AbortController();
  let vencido = false;
  const timer = espera > 0 ? setTimeout(() => ((vencido = true), ctrl.abort()), espera) : undefined;
  const alCancelar = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", alCancelar, { once: true });
  }

  try {
    const res = await fetch(`/api${ruta}`, {
      method,
      credentials: "same-origin",
      headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: formData ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
      signal: ctrl.signal,
    }).catch(() => {
      if (signal?.aborted) throw new ApiFallo(0, "CANCELADO", "Operación cancelada.");
      if (vencido) throw new ApiFallo(0, "LENTO", esPago ? MENSAJE_LENTO_PAGO : MENSAJE_LENTO);
      throw new ApiFallo(0, "SIN_CONEXION", esPago ? MENSAJE_CORTE_PAGO : MENSAJE_SIN_CONEXION);
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) {
      // Respuesta sin JSON (texto plano o HTML del proxy, p. ej. 500/502 mientras la API se reinicia): mensaje amable.
      if (!datos?.error) {
        if (res.status >= 500) throw new ApiFallo(res.status, "SIN_SERVICIO", esPago ? MENSAJE_CORTE_PAGO : MENSAJE_SIN_SERVICIO);
        throw new ApiFallo(res.status, "INTERNO", "Ocurrió un error. Inténtalo de nuevo.");
      }
      const e = datos.error;
      throw new ApiFallo(res.status, e.codigo ?? "INTERNO", e.mensaje ?? "Ocurrió un error. Inténtalo de nuevo.", e);
    }
    if (datos === null && res.headers.get("content-type")?.includes("text/html")) {
      // 200 con una página HTML: algo intermedio respondió en lugar de la API.
      throw new ApiFallo(res.status, "SIN_SERVICIO", esPago ? MENSAJE_CORTE_PAGO : MENSAJE_SIN_SERVICIO);
    }
    return datos as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", alCancelar);
  }
}

/** Si la API responde 401, llevar al inicio de sesión. */
export function esSinSesion(e: unknown) {
  return e instanceof ApiFallo && e.status === 401;
}
