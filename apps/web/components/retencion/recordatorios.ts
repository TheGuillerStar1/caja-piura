// Recordatorios elegidos por el cliente en Ajustes: cuántos días antes avisar y de qué pagos.
// Se guardan en el celular (localStorage) y filtran los avisos de /inicio para que no se vean saturados.
// Manual visual: opt-in (nada se activa sin que el cliente diga que sí), fecha elegible y control para pausar.
import type { Aviso } from "@cp/shared";

/** activos: null = todavía no lo decidió (se le pregunta una vez en el inicio). */
export type Recordatorios = { dias: number; cuota: boolean; servicios: boolean; activos: boolean | null; pausados: boolean };
export const OPCIONES_DIAS = [
  { dias: 5, texto: "5 días antes" },
  { dias: 3, texto: "3 días antes" },
  { dias: 1, texto: "1 día antes" },
  { dias: 0, texto: "El mismo día" },
] as const;

const CLAVE = "cp_recordatorios";
export const RECORDATORIOS_INICIALES: Recordatorios = { dias: 3, cuota: true, servicios: true, activos: null, pausados: false };

/** ¿Se le puede avisar? Solo si dijo que sí y no los pausó. */
export const avisosEncendidos = (r: Recordatorios) => r.activos === true && !r.pausados;

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

/** Los vencidos siempre se muestran; los demás, solo si aceptó los avisos, no los pausó y caen dentro de los días elegidos. */
export function filtrarAvisos(avisos: Aviso[], r: Recordatorios) {
  return avisos.filter(
    (a) => a.diasRestantes < 0 || (avisosEncendidos(r) && (a.tipo === "CUOTA" ? r.cuota : r.servicios) && a.diasRestantes <= r.dias),
  );
}
