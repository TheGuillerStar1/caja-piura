// Dueño: Agente G (F3). Guardas deterministas sobre lo que devuelve el LLM del asistente (lógica pura, con pruebas).
// Si el LLM contradice a las palabras clave, devuelve texto raro o inventa cifras, manda la regla: nunca "basura" en pantalla.
import type { Intencion } from "./palabrasClave.js";

/** Intenciones de palabras clave con las que es coherente cada herramienta del LLM. */
const COMPATIBLES: Record<string, Intencion["tipo"][]> = {
  ver_saldo: ["SALDO"],
  ver_deuda: ["DEUDA"],
  ir_a_pantalla: ["PANTALLA"],
  preparar_pago_cuota: ["CUOTA"],
  preparar_pago_frecuente: ["FRECUENTE", "RUBRO_SIN_FRECUENTE"],
  preparar_pago_recibo: ["RECIBO", "RUBRO_SIN_FRECUENTE"],
  cambiar_clave: ["CLAVE_CAMBIAR"],
};

/**
 * ¿Se acepta la herramienta que eligió el LLM? Si las palabras clave no reconocieron nada (NADA), se confía en el LLM.
 * Si sí reconocieron algo, el LLM debe coincidir; si no, se usa la regla (más predecible en la demo).
 */
export function herramientaAceptable(nombre: string, args: Record<string, unknown>, intencion: Intencion): boolean {
  const compatibles = COMPATIBLES[nombre];
  if (!compatibles) return false; // herramienta inventada
  if (intencion.tipo === "NADA") return true;
  if (!compatibles.includes(intencion.tipo)) return false;
  if (nombre === "ir_a_pantalla" && intencion.tipo === "PANTALLA") return args.pantalla === intencion.pantalla;
  return true;
}

/**
 * Texto libre del LLM (sin herramienta). Solo se acepta cuando las palabras clave no reconocieron nada,
 * y si parece una frase normal: sin código, sin JSON, sin cifras (podrían ser montos inventados) ni datos sensibles.
 * Devuelve el texto limpio y acotado, o null para usar el respaldo.
 */
export function textoLibreAceptable(texto: string, intencion: Intencion): string | null {
  if (intencion.tipo !== "NADA") return null;
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length < 3) return null;
  if (/[{}<>[\]`|\\]|https?:|function|tool_call|json/i.test(t)) return null;
  if (/\d/.test(t)) return null;
  if (/\b(clave|contrase[nñ]a|pin|dni|tarjeta|cvv|token)\b/i.test(t)) return null;
  const letras = (t.match(/[a-záéíóúñü]/gi) ?? []).length;
  if (letras / t.length < 0.6) return null;
  return t.length > 220 ? t.slice(0, 217).replace(/\s\S*$/, "") + "…" : t;
}
