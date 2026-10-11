// Dueño: Agente D. Catálogo de ejemplo de beneficios por puntos (cerrados dentro de Caja Piura).
export type Beneficio = { puntos: number; nombre: string; detalle: string };

export const BENEFICIOS: Beneficio[] = [
  // Sin sorteos: un sorteo necesita autorización previa del Ministerio del Interior (DS 006-2000-IN).
  { puntos: 50, nombre: "S/ 2 menos en tu cuota", detalle: "Se descuenta solo en tu próxima cuota" },
  { puntos: 120, nombre: "Descuento en comisión", detalle: "Una comisión con descuento en tu próximo trámite" },
  { puntos: 250, nombre: "Prioridad en agencia", detalle: "Te atienden primero cuando vayas a la agencia" },
];

/** Próximo beneficio por alcanzar y el progreso (0..1) desde el anterior. null si ya tiene todos. */
export function proximoBeneficio(puntos: number) {
  const i = BENEFICIOS.findIndex((b) => puntos < b.puntos);
  if (i === -1) return null;
  const desde = i === 0 ? 0 : BENEFICIOS[i - 1].puntos;
  const b = BENEFICIOS[i];
  return { beneficio: b, faltan: b.puntos - puntos, avance: (puntos - desde) / (b.puntos - desde) };
}
