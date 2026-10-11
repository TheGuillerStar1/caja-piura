// Centro de mando: formatos y escala de color del mapa (secuencial, un solo tono: el azul de la app).
import type { DistritoGestion, ResumenGestionRes } from "@cp/shared";

export const pct = (x: number) => `${Math.round(x * 100)} %`;
export const entero = (n: number) => Math.round(n).toLocaleString("es-PE");
/** Montos chicos con céntimos (S/ 3.70); los grandes, redondeados (S/ 10,760). */
export const soles = (n: number) => {
  const dec = Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0;
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};

export const OCUPACIONES = { COMERCIANTE: "Comerciantes", AGRICULTOR: "Agricultores", TRANSPORTISTA: "Transportistas", OTRO: "Otros" } as const;
export const GAMAS = { BAJA: "Gama baja", MEDIA: "Gama media", ALTA: "Gama alta" } as const;
export const ZONAS = { URBANA: "Urbana", RURAL: "Rural" } as const;

export const ahorroPorOp = (s: ResumenGestionRes["supuestos"]) => s.costoOpVentanilla - s.costoOpDigital;

export type Metrica = "adopcion" | "opsVentanillaMes" | "oportunidad" | "porVencer" | "asistida";

export const METRICAS: Record<Metrica, { nombre: string; ayuda: string; formato: (n: number) => string; esPct?: boolean }> = {
  adopcion: { nombre: "Adopción digital", ayuda: "Clientes que usan la app al menos 1 vez al mes", formato: pct, esPct: true },
  opsVentanillaMes: { nombre: "Ventanilla al mes", ayuda: "Operaciones que hoy se hacen en agencia", formato: entero },
  oportunidad: {
    nombre: "Oportunidad",
    ayuda: "Operaciones en ventanilla de clientes con celular apto (gama media o alta): las más fáciles de pasar a la app",
    formato: entero,
  },
  porVencer: { nombre: "Cuotas por vencer", ayuda: "Cuotas que vencen en los próximos 7 días", formato: entero },
  asistida: { nombre: "Vista asistida", ayuda: "Clientes a los que el motor recomienda la vista asistida", formato: pct, esPct: true },
};

export const valor = (d: DistritoGestion, m: Metrica) => d[m];

/** 5 tramos de igual ancho entre 0 y el máximo (o 100 % para porcentajes). */
export const TRAMOS = 5;
export function tramos(max: number, esPct?: boolean) {
  const tope = esPct ? 1 : Math.max(1, max);
  return Array.from({ length: TRAMOS }, (_, i) => ((i + 1) * tope) / TRAMOS);
}
export function tramoDe(v: number, cortes: number[]) {
  const i = cortes.findIndex((c) => v <= c);
  return i < 0 ? cortes.length - 1 : i;
}
/** Paso i (0..4) de la escala: el azul de la app mezclado con la superficie, de claro a intenso. */
const MEZCLA = [16, 34, 52, 72, 92];
export const colorTramo = (i: number) => `color-mix(in srgb, var(--color-marca) ${MEZCLA[i]}%, var(--color-superficie))`;
/** Texto legible sobre ese paso. */
export const tintaTramo = (i: number) => (i >= 3 ? "#fff" : "var(--color-tinta)");
