import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";

/** Lanza esto desde cualquier ruta: el manejador lo convierte en { error: { codigo, mensaje } }. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensaje: string,
    public extra?: Record<string, unknown>,
  ) {
    super(mensaje);
  }
}

/** Valida req.body con un esquema de @cp/shared. Lanza 400 VALIDACION si no cumple. */
export function validar<T>(esquema: ZodType<T>, datos: unknown): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new HttpError(400, "VALIDACION", r.error.issues.map((i) => i.message).join("; "));
  return r.data;
}

export const noImplementado: RequestHandler = (_req, _res) => {
  throw new HttpError(501, "NO_IMPLEMENTADO", "Esta ruta aún no está implementada");
};

export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, ...err.extra } });
    return;
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({ error: { codigo: "VALIDACION", mensaje: "JSON inválido" } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { codigo: "VALIDACION", mensaje: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { codigo: "INTERNO", mensaje: "Ocurrió un error. Inténtalo de nuevo." } });
};
