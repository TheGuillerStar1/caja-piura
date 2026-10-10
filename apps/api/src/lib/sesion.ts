import type { RequestHandler, Response } from "express";
import { esProduccion } from "./env.js";
import { HttpError } from "./errores.js";

// Sesión mínima: cookie firmada con el id del cliente. Suficiente para un prototipo con datos ficticios.
const COOKIE = "cp_sid";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clienteId?: number;
    }
  }
}

export function iniciarSesion(res: Response, clienteId: number) {
  res.cookie(COOKIE, String(clienteId), {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: esProduccion,
    maxAge: 1000 * 60 * 60 * 12,
  });
}

export function cerrarSesion(res: Response) {
  res.clearCookie(COOKIE);
}

/** Lee la cookie si existe (no obliga). */
export const leerSesion: RequestHandler = (req, _res, next) => {
  const v = req.signedCookies?.[COOKIE];
  if (v && /^\d+$/.test(v)) req.clienteId = Number(v);
  next();
};

/** Obliga a tener sesión. Después de esto, req.clienteId! es seguro. */
export const requiereSesion: RequestHandler = (req, _res, next) => {
  if (!req.clienteId) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  next();
};
