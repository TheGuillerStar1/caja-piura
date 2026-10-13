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
/** Días antes del vencimiento en que se avisa (igual que /inicio). */
export const DIAS_AVISO = 5;

/** Con cuántos días de anticipación al día de pago habitual se avisa todo lo del mes. */
export const DIAS_ANTES_DEL_HABITUAL = 7;

export function calcularNotificaciones(hoy: Date, diaPagoHabitual: number, pendientes: Pendiente[]): string[] {
  const orden = [...pendientes].sort(
    (a, b) => a.vencimiento.getTime() - b.vencimiento.getTime() || (a.tipo === "CUOTA" ? -1 : b.tipo === "CUOTA" ? 1 : 0),
  );
  const cercaDelHabitual = diasHastaDiaHabitual(hoy, diaPagoHabitual) <= DIAS_ANTES_DEL_HABITUAL;
  const elegidos = orden.filter((p) => {
    const d = diasEntre(hoy, p.vencimiento);
    return d <= DIAS_AVISO || (cercaDelHabitual && d <= 31);
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
export const ORDEN_EMBUDO = ["inicio", "pagar-creditos", "pagar-servicios", "pagar-frecuentes", "confirmar", "exito"];

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

// ── Recorrido por trámite (pedido del jurado: «medir finalización sin asistencia y abandonos») ──
// Cada sesión del navegador que empieza un trámite se sigue paso a paso: hasta dónde llegó, si pagó, si pidió ayuda
// y si tuvo un error y aun así terminó. Así se ve en qué paso se queda la gente, no solo en qué pantalla.
export type TramiteId = "CUOTA" | "RECIBO" | "FRECUENTE";
export type EventoRecorrido = { sesionId: string; flujo: string | null; pantalla: string; accion: string; ayudaUsada: boolean };
export type Recorrido = {
  tramite: TramiteId;
  empezaron: number;
  llegaronAConfirmar: number;
  pagaron: number;
  pagaronSinAyuda: number;
  conError: number;
  seRecuperaron: number; // tuvieron un error y aun así pagaron
  seQuedaron: { paso: string; n: number }[]; // último paso de quienes no pagaron, de más a menos
};

const TRAMITES: TramiteId[] = ["CUOTA", "RECIBO", "FRECUENTE"];
const PANTALLAS_CONFIRMAR = new Set(["confirmar", "pago-chat"]);

/** Nombre del paso para quien no terminó (la pantalla técnica → algo que se entiende). */
export function pasoDe(pantalla: string): string {
  if (PANTALLAS_CONFIRMAR.has(pantalla) || pantalla === "pago-fallido") return "Confirmar el pago";
  if (/servicios|recibo|frecuentes/.test(pantalla)) return "Buscar el recibo";
  if (/creditos|cuota/.test(pantalla)) return "Elegir qué pagar";
  if (pantalla === "inicio" || pantalla.startsWith("pagos")) return "Entrar al trámite";
  return "Otro";
}

export function armarRecorridos(eventos: EventoRecorrido[]): Recorrido[] {
  type S = { confirmar: boolean; pago: boolean; ayuda: boolean; error: boolean; ultimo: string };
  const porTramite = new Map<TramiteId, Map<string, S>>(TRAMITES.map((t) => [t, new Map()]));
  for (const e of eventos) {
    const t = e.flujo as TramiteId;
    const sesiones = porTramite.get(t);
    if (!sesiones) continue;
    const s = sesiones.get(e.sesionId) ?? { confirmar: false, pago: false, ayuda: false, error: false, ultimo: e.pantalla };
    if (PANTALLAS_CONFIRMAR.has(e.pantalla) || e.pantalla === "exito") s.confirmar = true;
    if (e.accion === "completar" && (e.pantalla === "exito" || e.pantalla === "pago-chat")) s.pago = true;
    if (e.ayudaUsada || e.accion === "ayuda") s.ayuda = true;
    if (e.accion === "error") s.error = true;
    if (!s.pago) s.ultimo = e.pantalla;
    sesiones.set(e.sesionId, s);
  }
  return TRAMITES.map((tramite) => {
    const ss = [...porTramite.get(tramite)!.values()];
    const quedaron = new Map<string, number>();
    for (const s of ss.filter((x) => !x.pago)) {
      const paso = pasoDe(s.ultimo);
      quedaron.set(paso, (quedaron.get(paso) ?? 0) + 1);
    }
    return {
      tramite,
      empezaron: ss.length,
      llegaronAConfirmar: ss.filter((s) => s.confirmar).length,
      pagaron: ss.filter((s) => s.pago).length,
      pagaronSinAyuda: ss.filter((s) => s.pago && !s.ayuda).length,
      conError: ss.filter((s) => s.error).length,
      seRecuperaron: ss.filter((s) => s.error && s.pago).length,
      seQuedaron: [...quedaron].map(([paso, n]) => ({ paso, n })).sort((a, b) => b.n - a.n),
    };
  });
}
