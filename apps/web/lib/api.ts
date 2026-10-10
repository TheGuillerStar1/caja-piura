// F0. Cliente HTTP único hacia el backend (vía rewrite /api → Railway). Usar desde componentes "use client".
// Tipos de request/response: importar de "@cp/shared".

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

type Opciones = { metodo?: "GET" | "POST" | "PUT" | "DELETE"; cuerpo?: unknown; formData?: FormData; signal?: AbortSignal };

export async function api<T>(ruta: string, { metodo, cuerpo, formData, signal }: Opciones = {}): Promise<T> {
  const res = await fetch(`/api${ruta}`, {
    method: metodo ?? (cuerpo || formData ? "POST" : "GET"),
    credentials: "same-origin",
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: formData ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
    signal,
  }).catch(() => {
    throw new ApiFallo(0, "SIN_CONEXION", "No hay conexión. Revisa tu internet e inténtalo de nuevo.");
  });
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    const e = datos?.error ?? {};
    throw new ApiFallo(res.status, e.codigo ?? "INTERNO", e.mensaje ?? "Ocurrió un error. Inténtalo de nuevo.", e);
  }
  return datos as T;
}

/** Si la API responde 401, llevar al inicio de sesión. */
export function esSinSesion(e: unknown) {
  return e instanceof ApiFallo && e.status === 401;
}
