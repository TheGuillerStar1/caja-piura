// Tipo de cambio dólar ↔ sol en el chat ("¿a cuánto está el dólar?", "¿cuántos soles son 100 dólares?").
// Reglas fijas, sin LLM: las cifras salen de aquí, nunca del modelo. Solo informa; no cambia dinero.
import { normalizar } from "./texto.js";

/** Tipo de cambio referencial de Caja Piura (el mismo que se ve en el inicio de la app). */
export const TIPO_CAMBIO = { compra: 3.3, venta: 3.6 };

/**
 * DOLARES_A_SOLES: el cliente tiene dólares y quiere soles (Caja Piura le COMPRA los dólares → se usa «compra»).
 * COMPRAR_DOLARES: quiere X dólares; cuánto le cuestan en soles (Caja Piura le VENDE → «venta»).
 * SOLES_A_DOLARES: tiene X soles; cuántos dólares le alcanzan (también «venta»).
 */
export type Conversion = { tipo: "DOLARES_A_SOLES" | "COMPRAR_DOLARES" | "SOLES_A_DOLARES"; monto: number };
export type PedidoCambio = { conversion: Conversion | null };

const DOLAR = /\b(dolar\w*|usd|\$)/;

/** ¿Pregunta por el tipo de cambio? Devuelve la conversión si dio un monto. */
export function pedidoCambio(mensaje: string): PedidoCambio | null {
  const crudo = mensaje.toLowerCase().replace(/(\d),(\d{1,2})\b/g, "$1.$2");
  const t = normalizar(mensaje);
  const hablaDolar = DOLAR.test(t) || /\$|us\$/.test(crudo);
  if (!hablaDolar && !/\btipo de cambio\b/.test(t)) return null;

  // Monto con su moneda: "100 dólares", "$ 100", "350 soles", "S/ 350".
  const usd = crudo.match(/(?:us\$|\$)\s*(\d+(?:\.\d{1,2})?)/) ?? crudo.match(/(\d+(?:\.\d{1,2})?)\s*(?:d[oó]lar\w*|usd)/);
  const pen = crudo.match(/s\/\.?\s*(\d+(?:\.\d{1,2})?)/) ?? crudo.match(/(\d+(?:\.\d{1,2})?)\s*(?:soles?|lucas?)\b/);
  if (usd) {
    const monto = Number(usd[1]);
    // "quiero comprar 100 dólares", "cuánto me cuestan 100 dólares": le vendemos dólares.
    const compra = /\b(compr\w*|cuest\w*|necesito|quiero tener)\b/.test(t) && !/\b(vend\w*|cambi\w*)\b/.test(t);
    return monto > 0 ? { conversion: { tipo: compra ? "COMPRAR_DOLARES" : "DOLARES_A_SOLES", monto } } : { conversion: null };
  }
  if (pen) {
    const monto = Number(pen[1]);
    return monto > 0 ? { conversion: { tipo: "SOLES_A_DOLARES", monto } } : { conversion: null };
  }
  return { conversion: null };
}

const s = (n: number) => `S/ ${n.toFixed(2)}`;
const usd = (n: number) => `US$ ${n.toFixed(2)}`;

/** Texto de Pía con el tipo de cambio y, si hay monto, la cuenta hecha. */
export function textoCambio(p: PedidoCambio, nombre: string, calido: boolean): string {
  const { compra, venta } = TIPO_CAMBIO;
  const base = `${calido ? `${nombre}, hoy` : "Hoy"} el dólar está así (referencial):\n• Compra: S/ ${compra.toFixed(2)} (si nos vendes dólares)\n• Venta: S/ ${venta.toFixed(2)} (si nos compras dólares)`;
  const c = p.conversion;
  if (!c) return base;
  const cuenta =
    c.tipo === "DOLARES_A_SOLES"
      ? `${usd(c.monto)} son ${s(c.monto * compra)} si los cambias a soles.`
      : c.tipo === "COMPRAR_DOLARES"
        ? `Para comprar ${usd(c.monto)} necesitas ${s(c.monto * venta)}.`
        : `Con ${s(c.monto)} compras ${usd(Math.floor((c.monto / venta) * 100) / 100)}.`;
  return `${base}\n${cuenta}`;
}
