// Dueño: Agente B. Acceso a datos compartido por las rutas de cuotas, frecuentes y pagos.
import type { Cuenta, CuotaRes, FrecuenteRes, OperacionCredito, TipoPago } from "@cp/shared";
import type { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errores.js";
import { aNumero, diasEntre, ocultarCuenta, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { ADELANTO_MAXIMO, AMORTIZACION_MINIMA, PORCENTAJE_INTERES, planCredito, type PlanCredito } from "./logica.js";

export async function obtenerCliente(clienteId: number) {
  const c = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!c) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  return c;
}

/** CTS y depósitos a plazo fijo no se usan para pagar (como en la app oficial); las cuentas de ahorro sí. */
export const sePuedePagarDesde = (tipo: string) => !/cts|plazo/i.test(tipo);

/** Cuenta de origen: la elegida (si es del cliente y sirve para pagar) o, si no viene, la primera cuenta de ahorro. */
export async function cuentaPrincipal(clienteId: number, cuentaId?: number) {
  if (cuentaId !== undefined) {
    const c = await prisma.cuenta.findFirst({ where: { clienteId, id: cuentaId } });
    if (!c) throw new HttpError(422, "SIN_CUENTA", "No encontramos esa cuenta");
    if (!sePuedePagarDesde(c.tipo)) throw new HttpError(422, "CUENTA_NO_PERMITIDA", `Desde tu ${c.tipo} no se puede pagar. Elige una cuenta de ahorro.`);
    return c;
  }
  const todas = await prisma.cuenta.findMany({ where: { clienteId }, orderBy: { id: "asc" } });
  const c = todas.find((k) => sePuedePagarDesde(k.tipo));
  if (!c) throw new HttpError(422, "SIN_CUENTA", "No encontramos una cuenta para pagar");
  return c;
}

export const aCuentaRes = (c: { id: number; numero: string; tipo: string; saldo: Prisma.Decimal }): Cuenta => ({
  id: c.id,
  numero: c.numero,
  numeroOculto: ocultarCuenta(c.numero),
  tipo: c.tipo,
  saldo: aNumero(c.saldo),
  paraPagar: sePuedePagarDesde(c.tipo),
});

type CuotaDb = { id: number; credito: string; numero: number; totalCuotas: number; monto: Prisma.Decimal; vencimiento: Date };
export const aCuotaRes = (q: CuotaDb, hoy: Date): CuotaRes => ({
  id: q.id,
  credito: q.credito,
  numero: q.numero,
  totalCuotas: q.totalCuotas,
  monto: aNumero(q.monto),
  vencimiento: q.vencimiento.toISOString(),
  diasRestantes: diasEntre(hoy, q.vencimiento),
});

/** Recibo no pagado más próximo para un servicio y código. */
export const reciboPendiente = (servicioId: number, codigo: string) =>
  prisma.recibo.findFirst({ where: { servicioId, codigo, pagado: false }, orderBy: { vencimiento: "asc" } });

type FrecuenteDb = Prisma.FrecuenteGetPayload<{ include: { servicio: true } }>;
export async function aFrecuenteRes(f: FrecuenteDb): Promise<FrecuenteRes> {
  const r = await reciboPendiente(f.servicioId, f.codigo);
  return {
    id: f.id,
    alias: f.alias,
    empresa: f.servicio.empresa,
    rubro: f.servicio.rubro,
    codigo: f.codigo,
    esPropio: f.esPropio,
    deuda: r ? { reciboId: r.id, monto: aNumero(r.monto), vencimiento: r.vencimiento.toISOString() } : null,
  };
}

/** Lo que se va a pagar, resuelto y validado (pertenencia y que no esté pagado). */
export type Objetivo = {
  tipo: TipoPago;
  referenciaId: number;
  monto: number;
  descripcion: string;
  destinatario: string;
  cuotaId?: number;
  reciboId?: number;
  /** Para recibos: servicio y código (ofrecer "¿Lo guardo?") */
  servicioId?: number;
  codigo?: string;
  vencimiento: Date;
  /** Solo créditos: cómo quedan las cuotas al pagar (ver planCredito) y datos para elegir la operación. */
  plan?: PlanCredito;
  credito?: { interes: number; maxAdelanto: number; deuda: number; amortizacionMinima: number; montoCuota: number };
};

const yaPagado = () => new HttpError(409, "YA_PAGADO", "Este pago ya fue realizado. No se volverá a cobrar.");

export async function resolverObjetivo(
  clienteId: number,
  tipo: TipoPago,
  referenciaId: number,
  op?: { operacion?: OperacionCredito; cantidad?: number },
): Promise<Objetivo> {
  if (tipo === "CUOTA") {
    const q = await prisma.cuota.findFirst({ where: { id: referenciaId, clienteId } });
    if (!q) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos esa cuota");
    if (q.estado === "PAGADA") throw yaPagado();
    // La cuota elegida va primero; después, las siguientes pendientes del mismo crédito.
    const siguientes = await prisma.cuota.findMany({
      where: { clienteId, credito: q.credito, estado: "PENDIENTE", id: { not: q.id }, vencimiento: { gte: q.vencimiento } },
      orderBy: { vencimiento: "asc" },
    });
    const pendientes = [q, ...siguientes].map((c) => ({ id: c.id, monto: aNumero(c.monto) }));
    let plan: PlanCredito;
    try {
      plan = planCredito(pendientes, op?.operacion ?? "CUOTA", op?.cantidad);
    } catch (e) {
      throw new HttpError(422, "OPERACION_INVALIDA", (e as Error).message);
    }
    return {
      tipo,
      referenciaId,
      monto: plan.monto,
      descripcion: `${plan.etiqueta} · Cuota ${q.numero} de ${q.totalCuotas} · Crédito ${q.credito}`.slice(0, 120),
      destinatario: "Caja Piura",
      vencimiento: q.vencimiento,
      plan,
      credito: {
        interes: Math.round(aNumero(q.monto) * PORCENTAJE_INTERES * 100) / 100,
        maxAdelanto: Math.min(ADELANTO_MAXIMO, pendientes.length),
        deuda: Math.round(pendientes.reduce((s, c) => s + c.monto, 0) * 100) / 100,
        amortizacionMinima: AMORTIZACION_MINIMA,
        montoCuota: aNumero(q.monto),
      },
    };
  }
  if (tipo === "FRECUENTE") {
    const f = await prisma.frecuente.findFirst({ where: { id: referenciaId, clienteId }, include: { servicio: true } });
    if (!f) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese pago frecuente");
    const r = await reciboPendiente(f.servicioId, f.codigo);
    if (!r) throw new HttpError(409, "SIN_DEUDA", `${f.alias} no tiene deuda pendiente`);
    return {
      tipo,
      referenciaId,
      monto: aNumero(r.monto),
      descripcion: `${f.alias} · ${f.servicio.empresa}`,
      destinatario: `${f.servicio.empresa} · ${ocultarNombre(r.titular)}`,
      reciboId: r.id,
      servicioId: f.servicioId,
      codigo: f.codigo,
      vencimiento: r.vencimiento,
    };
  }
  const r = await prisma.recibo.findUnique({ where: { id: referenciaId }, include: { servicio: true } });
  if (!r) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese recibo");
  if (r.pagado) throw yaPagado();
  return {
    tipo,
    referenciaId,
    monto: aNumero(r.monto),
    descripcion: `Recibo ${r.servicio.empresa} · ${r.codigo}`,
    destinatario: `${r.servicio.empresa} · ${ocultarNombre(r.titular)}`,
    reciboId: r.id,
    servicioId: r.servicioId,
    codigo: r.codigo,
    vencimiento: r.vencimiento,
  };
}

/** true si es un pago de recibo (ruta C) que aún no está en sus frecuentes. */
export async function debeOfrecerGuardar(clienteId: number, tipo: string, referenciaId: number) {
  if (tipo !== "RECIBO") return false;
  const r = await prisma.recibo.findUnique({ where: { id: referenciaId } });
  if (!r) return false;
  const f = await prisma.frecuente.findFirst({ where: { clienteId, servicioId: r.servicioId, codigo: r.codigo } });
  return !f;
}
