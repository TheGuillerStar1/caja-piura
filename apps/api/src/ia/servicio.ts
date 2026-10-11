// Pago de servicios pedido en el chat ("pagar servicios", "paga Enosa 31264587", "pagar el agua").
// Reglas fijas, sin LLM: solo se extrae el rubro, la empresa y el código si los dijo. Nada de esto paga.
import { normalizar } from "./texto.js";

export type RubroServicio = "LUZ" | "AGUA" | "TELEFONIA" | "INTERNET";
export type PedidoServicio = { rubro: RubroServicio | null; empresa: string | null; codigo: string | null };

/** Empresas de la app: palabra que se reconoce → nombre en la base y rubro. */
const EMPRESAS: [RegExp, string, RubroServicio][] = [
  [/\benosa\b/, "Enosa", "LUZ"],
  [/\b(eps grau|grau)\b/, "EPS Grau", "AGUA"],
  [/\bmovistar\b/, "Movistar", "TELEFONIA"],
  // "claro" también es una palabra común ("claro, págame la luz"): solo cuenta como empresa con contexto.
  [/\b(claro internet|claro hogar|(de|a|al|con) claro)\b/, "Claro", "INTERNET"],
];
const RUBRO: [RegExp, RubroServicio][] = [
  [/\b(luz|electricidad|energia)\b/, "LUZ"],
  [/\b(agua|desague)\b/, "AGUA"],
  [/\b(celular|telefono|movil|linea)\b/, "TELEFONIA"],
  [/\b(internet|wifi)\b/, "INTERNET"],
];
const PAGAR = /\b(pag\w*|cancel\w*|abon\w*)\b/;

/**
 * ¿Pide pagar un servicio por empresa o código? Sí con "pagar servicios" a secas, o con una empresa/rubro y un código
 * ("paga Enosa 31264587"). "Pagar la luz" sin código lo decide palabrasClave (primero mira los pagos frecuentes).
 */
export function pedidoServicio(mensaje: string): PedidoServicio | null {
  const t = normalizar(mensaje);
  if (!PAGAR.test(t) && !/\bservicios?\b/.test(t)) return null;
  const e = EMPRESAS.find(([re]) => re.test(t));
  const rubro = e?.[2] ?? RUBRO.find(([re]) => re.test(t))?.[1] ?? null;
  const codigo = (mensaje.match(/\d{6,12}/g) ?? [])[0] ?? null;
  if (codigo && (e || rubro)) return { rubro, empresa: e?.[1] ?? null, codigo };
  if (/\b(servicio|servicios)\b/.test(t) && PAGAR.test(t)) return { rubro, empresa: e?.[1] ?? null, codigo: null };
  if (e && PAGAR.test(t)) return { rubro, empresa: e[1], codigo: null };
  return null;
}
