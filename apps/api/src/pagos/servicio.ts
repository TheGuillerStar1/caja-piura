// Dueño: Agente B. Acceso a datos compartido por las rutas de cuotas, frecuentes y pagos.
import type { Cuenta, CuotaRes, FrecuenteRes, TipoPago } from "@cp/shared";
import type { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errores.js";
import { aNumero, diasEntre, ocultarCuenta, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";

export async function obtenerCliente(clienteId: number) {
  const c = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!c) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  return c;
}

/** Cuenta principal = la primera cuenta del cliente. */
export async function cuentaPrincipal(clienteId: number) {
  const c = await prisma.cuenta.findFirst({ where: { clienteId }, orderBy: { id: "asc" } });
  if (!c) throw new HttpError(422, "SIN_CUENTA", "No encontramos una cuenta para pagar");
  return c;
}

export const aCuentaRes = (c: { id: number; numero: string; tipo: string; saldo: Prisma.Decimal }): Cuenta => ({
  id: c.id,
  numero: c.numero,
  numeroOculto: ocultarCuenta(c.numero),
  tipo: c.tipo,
  saldo: aNumero(c.saldo),
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
};

const yaPagado = () => new HttpError(409, "YA_PAGADO", "Este pago ya fue realizado. No se volverá a cobrar.");

export async function resolverObjetivo(clienteId: number, tipo: TipoPago, referenciaId: number): Promise<Objetivo> {
  if (tipo === "CUOTA") {
    const q = await prisma.cuota.findFirst({ where: { id: referenciaId, clienteId } });
    if (!q) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos esa cuota");
    if (q.estado === "PAGADA") throw yaPagado();
    return {
      tipo,
      referenciaId,
      monto: aNumero(q.monto),
      descripcion: `Cuota ${q.numero} de ${q.totalCuotas} · Crédito ${q.credito}`,
      destinatario: "Caja Piura",
      cuotaId: q.id,
      vencimiento: q.vencimiento,
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
