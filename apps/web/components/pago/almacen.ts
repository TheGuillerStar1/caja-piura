"use client";
// Dueño: Agente B. sessionStorage para la key de idempotencia (reintentos) y el resultado del pago (pantalla de éxito).
import type { ConfirmarPagoRes, TipoPago } from "@cp/shared";

const claveKey = (tipo: string, ref: number | string) => `cp_pago_key:${tipo}:${ref}`;

export function leerKey(tipo: string, ref: number | string) {
  try {
    return sessionStorage.getItem(claveKey(tipo, ref));
  } catch {
    return null;
  }
}
export function guardarKey(tipo: string, ref: number | string, key: string) {
  try {
    sessionStorage.setItem(claveKey(tipo, ref), key);
  } catch {}
}
export function borrarKey(tipo: string, ref: number | string) {
  try {
    sessionStorage.removeItem(claveKey(tipo, ref));
  } catch {}
}

export type ResultadoPago = ConfirmarPagoRes & {
  tipo: TipoPago;
  referenciaId: number;
  destinatario: string;
  /** true cuando la pantalla de éxito ya registró "completar" (evita contarlo dos veces al recargar). */
  registrado?: boolean;
};
const RESULTADO = "cp_pago_resultado";

export function guardarResultado(r: ResultadoPago) {
  try {
    sessionStorage.setItem(RESULTADO, JSON.stringify(r));
  } catch {}
}
export function leerResultado(): ResultadoPago | null {
  try {
    const v = sessionStorage.getItem(RESULTADO);
    return v ? (JSON.parse(v) as ResultadoPago) : null;
  } catch {
    return null;
  }
}

/** Ruta de la confirmación común. */
export const rutaConfirmar = (tipo: TipoPago, ref: number) => `/pagar/confirmar?tipo=${tipo}&ref=${ref}`;
