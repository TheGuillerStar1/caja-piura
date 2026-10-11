// Reglas puras de las transferencias (sin base de datos), para poder probarlas.
import type { TipoTransferencia } from "@cp/shared";

/** Código de Caja Piura en el CCI (los 3 primeros dígitos son la entidad). */
export const CODIGO_CAJA_PIURA = "802";
const BANCOS: Record<string, string> = {
  "002": "BCP",
  "003": "Interbank",
  "009": "Scotiabank",
  "011": "BBVA",
  "018": "Banco de la Nación",
  "038": "BanBif",
  "035": "Pichincha",
  "801": "Caja Sullana",
  "803": "Caja Trujillo",
  "805": "Caja Arequipa",
};
export const bancoDeCci = (cci: string) => BANCOS[cci.slice(0, 3)] ?? "otra entidad";

export type DestinoValido = { ok: true; valor: string } | { ok: false; codigo: string; mensaje: string };

/** Limpia y valida lo que escribió el cliente según el tipo de transferencia. */
export function validarDestino(tipo: TipoTransferencia, destino: string): DestinoValido {
  const d = destino.replace(/[\s-]/g, "");
  if (tipo === "PROPIAS") return /^\d+$/.test(d) ? { ok: true, valor: d } : { ok: false, codigo: "DESTINO_INVALIDO", mensaje: "Elige la cuenta de destino." };
  if (!/^\d+$/.test(d)) return { ok: false, codigo: "DESTINO_INVALIDO", mensaje: "Escribe solo números." };
  if (tipo === "TERCEROS")
    return d.length >= 10 && d.length <= 18 ? { ok: true, valor: d } : { ok: false, codigo: "DESTINO_INVALIDO", mensaje: "El número de cuenta no está completo. Revísalo." };
  if (tipo === "INTERBANCARIA") {
    if (d.length !== 20) return { ok: false, codigo: "DESTINO_INVALIDO", mensaje: "El CCI tiene 20 números. Revísalo." };
    if (d.startsWith(CODIGO_CAJA_PIURA)) return { ok: false, codigo: "ES_CAJA_PIURA", mensaje: "Ese CCI es de una cuenta de Caja Piura: usa «A terceros», es inmediata." };
    return { ok: true, valor: d };
  }
  // CONTACTO
  return /^9\d{8}$/.test(d) ? { ok: true, valor: d } : { ok: false, codigo: "DESTINO_INVALIDO", mensaje: "El celular tiene 9 números y empieza con 9." };
}

/** "987654321" → "987 *** 321" */
export const ocultarCelular = (c: string) => `${c.slice(0, 3)} *** ${c.slice(-3)}`;

export const NOMBRE_TIPO: Record<TipoTransferencia, string> = {
  PROPIAS: "Transferencia entre cuentas propias",
  TERCEROS: "Transferencia a terceros",
  INTERBANCARIA: "Transferencia interbancaria",
  CONTACTO: "Envío a contacto",
};
