// Dueño: Agente B. Ejecución idempotente de un pago (POST /pagos/confirmar).
import type { ConfirmarPagoReq, ConfirmarPagoRes } from "@cp/shared";
import { Prisma, type Pago } from "@prisma/client";
import { HttpError } from "../lib/errores.js";
import { aNumero, diasEntre, nuevaOperacion } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { MENSAJE_EXITO, MENSAJE_FALLO, calcularPuntos, decidirIdempotencia, fechaOperacion, sumarPuntos } from "./logica.js";
import { cuentaPrincipal, debeOfrecerGuardar, obtenerCliente, resolverObjetivo } from "./servicio.js";

/** Otra petición con la misma key ganó la carrera. */
class Carrera extends Error {}

const saldoInsuficiente = () =>
  new HttpError(422, "SALDO_INSUFICIENTE", "Tu cuenta no tiene saldo suficiente. No se cobró nada.");
const yaPagado = () => new HttpError(409, "YA_PAGADO", "Este pago ya fue realizado. No se volverá a cobrar.");

const esDuplicado = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function desdePago(p: Pago, repetido: boolean): Promise<ConfirmarPagoRes> {
  const exitoso = p.estado === "EXITOSO";
  return {
    estado: p.estado,
    operacion: exitoso ? p.operacion : null,
    monto: aNumero(p.monto),
    descripcion: p.descripcion,
    fecha: p.creadoEn.toISOString(),
    puntosGanados: p.puntosGanados,
    mensaje: exitoso ? MENSAJE_EXITO : MENSAJE_FALLO,
    repetido,
    ofrecerGuardar: exitoso ? await debeOfrecerGuardar(p.clienteId, p.tipo, p.referenciaId) : false,
  };
}

async function devolverExistente(key: string) {
  const p = await prisma.pago.findUnique({ where: { idempotencyKey: key } });
  if (!p) throw new HttpError(409, "EN_PROCESO", "Tu pago se está procesando. Inténtalo en unos segundos.");
  return desdePago(p, true);
}

export async function confirmarPago(clienteId: number, b: ConfirmarPagoReq): Promise<ConfirmarPagoRes> {
  const key = b.idempotencyKey.trim();
  if (key.length < 8 || key.length > 64) throw new HttpError(400, "VALIDACION", "Clave de operación inválida");

  const previo = await prisma.pago.findUnique({ where: { idempotencyKey: key } });
  if (previo && (previo.clienteId !== clienteId || previo.tipo !== b.tipo || previo.referenciaId !== b.referenciaId))
    throw new HttpError(409, "KEY_REUTILIZADA", "Esta operación no corresponde a este pago. Vuelve a empezar.");

  const decision = decidirIdempotencia(previo, Boolean(b.simularFallo));
  if (decision === "DEVOLVER") return desdePago(previo!, true);

  const cliente = await obtenerCliente(clienteId);
  const obj = await resolverObjetivo(clienteId, b.tipo, b.referenciaId);
  const cuenta = await cuentaPrincipal(clienteId);
  const fecha = fechaOperacion(cliente.fechaSimulada);

  // Fallo simulado (demo): se registra, no se toca el saldo. Un reintento con la misma key podrá cobrar.
  if (b.simularFallo) {
    try {
      const p = await prisma.pago.create({
        data: {
          idempotencyKey: key,
          clienteId,
          cuentaId: cuenta.id,
          tipo: b.tipo,
          referenciaId: b.referenciaId,
          descripcion: obj.descripcion,
          monto: obj.monto,
          estado: "FALLIDO",
          conAyuda: b.conAyuda,
          puntosGanados: 0,
          operacion: "",
          creadoEn: fecha,
        },
      });
      return desdePago(p, false);
    } catch (e) {
      if (esDuplicado(e)) return devolverExistente(key);
      throw e;
    }
  }

  if (aNumero(cuenta.saldo) < obj.monto) throw saldoInsuficiente();

  const puntos = calcularPuntos({
    tipo: b.tipo,
    conAyuda: b.conAyuda,
    diasAlVencimiento: diasEntre(cliente.fechaSimulada, obj.vencimiento),
  });
  const datos = {
    cuentaId: cuenta.id,
    descripcion: obj.descripcion,
    monto: obj.monto,
    estado: "EXITOSO" as const,
    conAyuda: b.conAyuda,
    puntosGanados: sumarPuntos(puntos),
    operacion: nuevaOperacion(),
    creadoEn: fecha,
  };

  try {
    const pago = await prisma.$transaction(
      async (tx) => {
        // 1) Reservar la key primero: si otra petición igual llega a la vez, el índice único la frena (P2002).
        let id: number;
        if (decision === "REPROCESAR") {
          const n = await tx.pago.updateMany({ where: { id: previo!.id, estado: "FALLIDO" }, data: datos });
          if (n.count === 0) throw new Carrera();
          id = previo!.id;
        } else {
          id = (await tx.pago.create({ data: { idempotencyKey: key, clienteId, tipo: b.tipo, referenciaId: b.referenciaId, ...datos } })).id;
        }
        // 2) Descontar verificando el saldo otra vez (condición atómica).
        const d = await tx.cuenta.updateMany({
          where: { id: cuenta.id, saldo: { gte: obj.monto } },
          data: { saldo: { decrement: obj.monto } },
        });
        if (d.count === 0) throw saldoInsuficiente();
        // 3) Marcar la deuda como pagada (solo si seguía pendiente).
        if (obj.cuotaId) {
          const n = await tx.cuota.updateMany({ where: { id: obj.cuotaId, estado: "PENDIENTE" }, data: { estado: "PAGADA" } });
          if (n.count === 0) throw yaPagado();
        }
        if (obj.reciboId) {
          const n = await tx.recibo.updateMany({ where: { id: obj.reciboId, pagado: false }, data: { pagado: true } });
          if (n.count === 0) throw yaPagado();
        }
        // 4) Puntos y contadores del cliente.
        await tx.punto.createMany({ data: puntos.map((p) => ({ clienteId, motivo: p.motivo, puntos: p.puntos, creadoEn: fecha })) });
        await tx.cliente.update({
          where: { id: clienteId },
          data: { opsDigitalesMes: { increment: 1 }, ...(b.conAyuda ? {} : { pagosSinAyuda: { increment: 1 } }) },
        });
        return tx.pago.findUniqueOrThrow({ where: { id } });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    return desdePago(pago, false);
  } catch (e) {
    if (e instanceof Carrera || esDuplicado(e)) return devolverExistente(key);
    throw e;
  }
}
