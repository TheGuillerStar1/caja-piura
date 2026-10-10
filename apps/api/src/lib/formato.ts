import type { Prisma } from "@prisma/client";

/** Decimal de Prisma → number con 2 decimales. */
export const aNumero = (d: Prisma.Decimal | number) => Math.round(Number(d) * 100) / 100;

/** "S/ 350.00" */
export const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/** "MARÍA PÉREZ" → "MAR*** PÉR***" */
export function ocultarNombre(nombre: string) {
  return nombre
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.slice(0, 3) + "***")
    .join(" ");
}

/** "00120034567890" → "****7890" */
export const ocultarCuenta = (numero: string) => "****" + numero.slice(-4);

const DIA = 24 * 60 * 60 * 1000;
const inicioDia = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Días entre la fecha simulada del cliente (hoy) y el vencimiento. Negativo = vencido. */
export const diasEntre = (hoy: Date, vencimiento: Date) => Math.round((inicioDia(vencimiento) - inicioDia(hoy)) / DIA);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** "hoy" | "mañana" | "el viernes" | "el 15" según la distancia. */
export function cuandoVence(hoy: Date, vencimiento: Date) {
  const d = diasEntre(hoy, vencimiento);
  if (d < 0) return "ya venció";
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d < 7) return `el ${DIAS[vencimiento.getUTCDay()]}`;
  return `el ${vencimiento.getUTCDate()}`;
}

/** Número de operación para la constancia. */
export const nuevaOperacion = () => String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 90 + 10));
