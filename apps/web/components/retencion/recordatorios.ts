// Recordatorios elegidos por el cliente en Ajustes: cuántos días antes avisar y de qué pagos.
// Se guardan en el celular (localStorage) y filtran los avisos de /inicio para que no se vean saturados.
import type { Aviso } from "@cp/shared";

export type Recordatorios = { dias: number; cuota: boolean; servicios: boolean };
export const OPCIONES_DIAS = [
  { dias: 5, texto: "5 días antes" },
  { dias: 3, texto: "3 días antes" },
  { dias: 1, texto: "1 día antes" },
  { dias: 0, texto: "El mismo día" },
] as const;

const CLAVE = "cp_recordatorios";
export const RECORDATORIOS_INICIALES: Recordatorios = { dias: 3, cuota: true, servicios: true };

export function leerRecordatorios(): Recordatorios {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    if (r && typeof r.dias === "number") return { ...RECORDATORIOS_INICIALES, ...r };
  } catch {}
  return RECORDATORIOS_INICIALES;
}

export function guardarRecordatorios(r: Recordatorios) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {}
}

/** Los vencidos siempre se muestran (si ese tipo está activo); los demás, solo dentro de los días elegidos. */
export function filtrarAvisos(avisos: Aviso[], r: Recordatorios) {
  return avisos.filter((a) => (a.tipo === "CUOTA" ? r.cuota : r.servicios) && (a.diasRestantes < 0 || a.diasRestantes <= r.dias));
}
