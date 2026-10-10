// Dueño: Agente C. Tipos locales de endpoints de C que no están en @cp/shared.

/** GET /recibos/servicios */
export type ServicioOpcion = { id: number; empresa: string; rubro: string; formatoCodigo: string; ayudaCodigo: string };

/** Largo esperado del código a partir del regex ("^\\d{8}$" → 8). */
export function largoCodigo(formato: string): number {
  const m = formato.match(/\{(\d+)(?:,(\d+))?\}/);
  return m ? Number(m[2] ?? m[1]) : 12;
}

export const ICONO_RUBRO: Record<string, string> = { LUZ: "💡", AGUA: "💧", TELEFONIA: "📱", INTERNET: "🌐" };
