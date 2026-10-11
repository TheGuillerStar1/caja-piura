// Dueño: Agente B. Lógica pura de pagos (sin base de datos) para poder probarla con vitest.
import type { TipoPago } from "@cp/shared";

export const MENSAJE_EXITO = "Te ahorraste una visita a la agencia";
export const MENSAJE_FALLO = "No se realizó el pago. No se cobró nada.";

export type PuntoGanado = { motivo: string; puntos: number };

/** 10 por pago digital, +5 si lo hizo sin ayuda, +10 si paga una cuota antes de su vencimiento. */
export function calcularPuntos(p: { tipo: TipoPago; conAyuda: boolean; diasAlVencimiento: number | null }): PuntoGanado[] {
  const lista: PuntoGanado[] = [{ motivo: "Pago digital", puntos: 10 }];
  if (!p.conAyuda) lista.push({ motivo: "Pagaste sin ayuda", puntos: 5 });
  if (p.tipo === "CUOTA" && p.diasAlVencimiento !== null && p.diasAlVencimiento > 0)
    lista.push({ motivo: "Cuota pagada antes de su vencimiento", puntos: 10 });
  return lista;
}

export const sumarPuntos = (l: PuntoGanado[]) => l.reduce((s, p) => s + p.puntos, 0);

/**
 * Qué hacer con una idempotencyKey según el pago que ya existe con ella.
 * - NUEVO: no hay pago previo → procesar.
 * - DEVOLVER: ya hubo un pago exitoso (o se vuelve a simular el fallo) → devolver el resultado anterior sin cobrar.
 * - REPROCESAR: el pago previo falló → se intenta de nuevo actualizando ese mismo registro.
 */
export function decidirIdempotencia(previo: { estado: "EXITOSO" | "FALLIDO" } | null, simularFallo: boolean) {
  if (!previo) return "NUEVO" as const;
  if (previo.estado === "EXITOSO") return "DEVOLVER" as const;
  return simularFallo ? ("DEVOLVER" as const) : ("REPROCESAR" as const);
}

/** Fecha de la operación: el día simulado del cliente con la hora real. */
export function fechaOperacion(fechaSimulada: Date, ahora = new Date()) {
  return new Date(
    Date.UTC(
      fechaSimulada.getUTCFullYear(),
      fechaSimulada.getUTCMonth(),
      fechaSimulada.getUTCDate(),
      ahora.getUTCHours(),
      ahora.getUTCMinutes(),
      ahora.getUTCSeconds(),
    ),
  );
}

// ── Operaciones del crédito (como en «Pago de créditos propios» de la app oficial) ──
export type OperacionCredito = "CUOTA" | "INTERES" | "ADELANTO" | "AMORTIZACION";
export type CuotaPendiente = { id: number; monto: number };
/** Qué se cobra y cómo quedan las cuotas. pagar = cuotas que se cancelan; restar = cuotas a las que se les baja el monto. */
export type PlanCredito = { monto: number; etiqueta: string; pagar: number[]; restar: { id: number; de: number; a: number }[] };

/** Parte de interés estimada de una cuota (demo: no hay cronograma con capital e interés por separado). */
export const PORCENTAJE_INTERES = 0.28;
export const AMORTIZACION_MINIMA = 50;
export const ADELANTO_MAXIMO = 3;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Arma el pago de un crédito según la operación. `pendientes` va en orden de vencimiento: la primera es la cuota del mes.
 * - CUOTA: paga la cuota del mes.
 * - INTERES: paga solo el interés estimado; la cuota sigue pendiente por el resto.
 * - ADELANTO (cantidad = n.º de cuotas, 1 a 3): paga la del mes y las siguientes.
 * - AMORTIZACION (cantidad = monto): baja la deuda desde las últimas cuotas (se acorta el crédito).
 * Lanza Error con un mensaje para el cliente si la operación no se puede hacer.
 */
export function planCredito(pendientes: CuotaPendiente[], operacion: OperacionCredito, cantidad?: number): PlanCredito {
  const actual = pendientes[0];
  if (!actual) throw new Error("No tienes cuotas pendientes.");
  if (operacion === "CUOTA") return { monto: r2(actual.monto), etiqueta: "Pago de cuota", pagar: [actual.id], restar: [] };
  if (operacion === "INTERES") {
    const interes = r2(actual.monto * PORCENTAJE_INTERES);
    if (interes <= 0 || interes >= actual.monto) throw new Error("Esta cuota ya no tiene interés por pagar.");
    return { monto: interes, etiqueta: "Pago interés", pagar: [], restar: [{ id: actual.id, de: actual.monto, a: r2(actual.monto - interes) }] };
  }
  if (operacion === "ADELANTO") {
    const n = Math.trunc(cantidad ?? 0);
    const max = Math.min(ADELANTO_MAXIMO, pendientes.length);
    if (n < 1 || n > max) throw new Error(`Puedes adelantar de 1 a ${max} cuota${max === 1 ? "" : "s"}.`);
    const elegidas = pendientes.slice(0, n);
    return { monto: r2(elegidas.reduce((s, q) => s + q.monto, 0)), etiqueta: `Adelanto de ${n} cuota${n === 1 ? "" : "s"}`, pagar: elegidas.map((q) => q.id), restar: [] };
  }
  // AMORTIZACION
  const monto = r2(cantidad ?? 0);
  const deuda = r2(pendientes.reduce((s, q) => s + q.monto, 0));
  if (!(monto >= AMORTIZACION_MINIMA)) throw new Error(`El monto mínimo para amortizar es S/ ${AMORTIZACION_MINIMA}.`);
  if (monto > deuda) throw new Error(`Tu deuda pendiente es S/ ${deuda.toFixed(2)}. Para pagarla toda, usa «Cancelación» en la agencia.`);
  const pagar: number[] = [];
  const restar: PlanCredito["restar"] = [];
  let resto = monto;
  for (const q of [...pendientes].reverse()) {
    if (resto <= 0) break;
    if (resto >= q.monto) {
      pagar.push(q.id);
      resto = r2(resto - q.monto);
    } else {
      restar.push({ id: q.id, de: q.monto, a: r2(q.monto - resto) });
      resto = 0;
    }
  }
  return { monto, etiqueta: "Amortización", pagar, restar };
}
