// Dueño: Agente D. Lógica pura de retención y medición (sin base de datos) para poder probarla con vitest.
import { diasEntre, soles } from "../lib/formato.js";

const DIA = 24 * 60 * 60 * 1000;

/** Suma días a una fecha (UTC). */
export const sumarDias = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA);

/** Suma meses conservando el día; si el mes no tiene ese día, usa el último (31 ene → 28/29 feb). */
export function sumarMes(d: Date, meses = 1): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + meses;
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), ultimo), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

// ── Siguiente recibo de un frecuente ─────────────────
export type ReciboBase = { servicioId: number; codigo: string; titular: string; monto: number; vencimiento: Date };

/** Recibo del mes siguiente: mismo servicio, código y titular; monto ±10 %; vencimiento +1 mes. rnd ∈ [0,1). */
export function siguienteRecibo(ultimo: ReciboBase, rnd: () => number = Math.random): ReciboBase {
  const factor = 0.9 + rnd() * 0.2;
  return {
    servicioId: ultimo.servicioId,
    codigo: ultimo.codigo,
    titular: ultimo.titular,
    monto: Math.max(1, Math.round(ultimo.monto * factor * 100) / 100),
    vencimiento: sumarMes(ultimo.vencimiento, 1),
  };
}

// ── Notificaciones simuladas tras "Adelantar 30 días" ─
export type Pendiente =
  | { tipo: "CUOTA"; monto: number; vencimiento: Date }
  | { tipo: "FRECUENTE"; alias: string; monto: number; vencimiento: Date };

/** "vence hoy" | "vence mañana" | "vence en 3 días" | "venció hace 2 días" */
function venceEnDias(d: number) {
  if (d < 0) return d === -1 ? "venció ayer" : `venció hace ${-d} días`;
  if (d === 0) return "vence hoy";
  if (d === 1) return "vence mañana";
  return `vence en ${d} días`;
}

/** "vence hoy" | "vence mañana" | "vence el 15" */
function venceElDia(hoy: Date, v: Date) {
  const d = diasEntre(hoy, v);
  if (d < 0) return venceEnDias(d);
  if (d === 0) return "vence hoy";
  if (d === 1) return "vence mañana";
  return `vence el ${v.getUTCDate()}`;
}

export function redactarNotificacion(hoy: Date, p: Pendiente): string {
  if (p.tipo === "CUOTA") return `Tu cuota de ${soles(p.monto)} ${venceEnDias(diasEntre(hoy, p.vencimiento))}`;
  return `${p.alias} · ${soles(p.monto)} · ${venceElDia(hoy, p.vencimiento)}`;
}

/** Días que faltan para el próximo día de pago habitual del cliente (0 = hoy). */
export function diasHastaDiaHabitual(hoy: Date, diaPagoHabitual: number) {
  const dia = hoy.getUTCDate();
  if (dia <= diaPagoHabitual) return diaPagoHabitual - dia;
  const ultimo = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0)).getUTCDate();
  return ultimo - dia + diaPagoHabitual;
}

/**
 * Qué avisos vería el cliente en su celular con la nueva fecha:
 * - todo lo que vence en ≤ 3 días (o ya venció);
 * - si su día de pago habitual llega en ≤ 7 días, también lo que vence en el próximo mes (suele pagar todo junto ese día);
 * - si no queda ninguno, el más próximo (para que la demo siempre muestre algo).
 * Ordenados por vencimiento; la cuota primero en empate.
 */
/** Con cuántos días de anticipación al día de pago habitual se avisa todo lo del mes. */
export const DIAS_ANTES_DEL_HABITUAL = 7;

export function calcularNotificaciones(hoy: Date, diaPagoHabitual: number, pendientes: Pendiente[]): string[] {
  const orden = [...pendientes].sort(
    (a, b) => a.vencimiento.getTime() - b.vencimiento.getTime() || (a.tipo === "CUOTA" ? -1 : b.tipo === "CUOTA" ? 1 : 0),
  );
  const cercaDelHabitual = diasHastaDiaHabitual(hoy, diaPagoHabitual) <= DIAS_ANTES_DEL_HABITUAL;
  const elegidos = orden.filter((p) => {
    const d = diasEntre(hoy, p.vencimiento);
    return d <= 3 || (cercaDelHabitual && d <= 31);
  });
  const lista = elegidos.length ? elegidos : orden.slice(0, 1);
  return lista.map((p) => redactarNotificacion(hoy, p));
}

// ── Indicadores del panel ────────────────────────────
/**
 * Tasa de éxito sin ayuda =
 *   pagos EXITOSOS con conAyuda = false
 *   ÷ intentos de pago (todos los pagos registrados, exitosos o fallidos, + abandonos en la pantalla "confirmar").
 * Un abandono en "confirmar" es alguien que llegó a pagar y no terminó: cuenta como intento sin éxito.
 */
export function tasaExitoSinAyuda(exitososSinAyuda: number, pagosRegistrados: number, abandonosConfirmar: number) {
  const intentos = pagosRegistrados + abandonosConfirmar;
  if (intentos <= 0) return 0;
  return Math.round((exitososSinAyuda / intentos) * 1000) / 1000;
}

/** Orden del embudo según el flujo de pago. */
export const ORDEN_EMBUDO = ["inicio", "pagar-cuota", "pagar-frecuentes", "pagar-recibo", "confirmar", "exito"];

export type FilaEmbudo = { pantalla: string; vistas: number; abandonos: number };

/** Arma el embudo: pantallas del flujo de pago en orden (aunque tengan 0) y luego otras con abandonos. */
export function armarEmbudo(conteos: { pantalla: string; accion: string; n: number }[]): FilaEmbudo[] {
  const mapa = new Map<string, FilaEmbudo>();
  for (const p of ORDEN_EMBUDO) mapa.set(p, { pantalla: p, vistas: 0, abandonos: 0 });
  for (const c of conteos) {
    const f = mapa.get(c.pantalla) ?? { pantalla: c.pantalla, vistas: 0, abandonos: 0 };
    if (c.accion === "ver") f.vistas += c.n;
    else if (c.accion === "abandonar") f.abandonos += c.n;
    mapa.set(c.pantalla, f);
  }
  const flujo = ORDEN_EMBUDO.map((p) => mapa.get(p)!);
  const otras = [...mapa.values()]
    .filter((f) => !ORDEN_EMBUDO.includes(f.pantalla) && f.abandonos > 0)
    .sort((a, b) => b.abandonos - a.abandonos);
  return [...flujo, ...otras];
}

/** ms promedio → segundos con 1 decimal (null si no hay datos). */
export const msASeg = (ms: number | null | undefined) => (ms == null ? null : Math.round(ms / 100) / 10);

/** Inicio de la ventana "este mes" (30 días). Tolera pagos guardados con hora real o con fecha simulada. */
export function inicioVentanaMes(fechaSimulada: Date, ahora: Date = new Date()) {
  const base = fechaSimulada.getTime() < ahora.getTime() ? fechaSimulada : ahora;
  return sumarDias(base, -30);
}

/** Fase 7: solo se sugiere (el cliente decide) si usa la asistida y ya hizo 3 pagos sin ayuda. */
export const debeSugerirEstandar = (vista: string | null, pagosSinAyuda: number) => vista === "ASISTIDA" && pagosSinAyuda >= 3;
