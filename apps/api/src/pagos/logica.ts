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
