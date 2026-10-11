// Transferencias de la sección «Transferencias» (mismos 4 tipos y campos que la app oficial).
// Preparar no mueve dinero; confirmar se ejecuta una sola vez por idempotencyKey.
import { ConfirmarTransferenciaReq, PrepararTransferenciaReq, type ConfirmarTransferenciaRes, type PrepararTransferenciaRes } from "@cp/shared";
import { Prisma, type Transferencia } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { aNumero, nuevaOperacion, ocultarCuenta, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { fechaOperacion } from "../pagos/logica.js";
import { aCuentaRes, cuentaPrincipal, obtenerCliente, sePuedePagarDesde } from "../pagos/servicio.js";
import { bancoDeCci, ocultarCelular, validarDestino } from "../transferencias/logica.js";

export const router = Router();

const saldoInsuficiente = () => new HttpError(422, "SALDO_INSUFICIENTE", "Tu cuenta no tiene saldo suficiente. No se movió nada.");

/** Lo que se ve del destino: "****0101", "CCI ****1234" o "987 *** 321". */
const mostrarDestino = (tipo: Transferencia["tipo"], destino: string) =>
  tipo === "INTERBANCARIA" ? `CCI ****${destino.slice(-4)}` : tipo === "CONTACTO" ? ocultarCelular(destino) : ocultarCuenta(destino);

/** Valida origen y destino y arma lo que se muestra en la confirmación. */
async function resolver(clienteId: number, b: PrepararTransferenciaReq) {
  const v = validarDestino(b.tipo, b.destino);
  if (!v.ok) throw new HttpError(422, v.codigo, v.mensaje);
  const origen = await cuentaPrincipal(clienteId, b.cuentaOrigenId);
  const monto = Math.round(b.monto * 100) / 100;
  if (monto <= 0) throw new HttpError(422, "MONTO_INVALIDO", "Escribe el monto a transferir.");
  const base = { origen, monto, cuentaDestinoId: null as number | null, destinoClienteId: null as number | null };

  if (b.tipo === "PROPIAS") {
    const d = await prisma.cuenta.findFirst({ where: { id: Number(v.valor), clienteId } });
    if (!d) throw new HttpError(422, "DESTINO_INVALIDO", "Elige la cuenta de destino.");
    if (d.id === origen.id) throw new HttpError(422, "MISMA_CUENTA", "La cuenta de destino debe ser distinta a la de origen.");
    if (!sePuedePagarDesde(d.tipo)) throw new HttpError(422, "DESTINO_NO_PERMITIDO", `A tu ${d.tipo} no se puede transferir desde la app.`);
    return { ...base, cuentaDestinoId: d.id, destinoClienteId: clienteId, destino: d.numero, nombreDestino: `${d.tipo} ${ocultarCuenta(d.numero)}` };
  }
  if (b.tipo === "TERCEROS") {
    const d = await prisma.cuenta.findUnique({ where: { numero: v.valor }, include: { cliente: true } });
    if (!d) throw new HttpError(422, "CUENTA_NO_EXISTE", "No encontramos esa cuenta en Caja Piura. Revisa el número.");
    if (d.clienteId === clienteId) throw new HttpError(422, "ES_PROPIA", "Esa cuenta es tuya: usa «Entre cuentas propias».");
    if (!sePuedePagarDesde(d.tipo)) throw new HttpError(422, "DESTINO_NO_PERMITIDO", "A esa cuenta no se puede transferir desde la app.");
    return { ...base, cuentaDestinoId: d.id, destinoClienteId: d.clienteId, destino: d.numero, nombreDestino: ocultarNombre(`${d.cliente.nombre} ${d.cliente.apellido}`) };
  }
  if (b.tipo === "INTERBANCARIA") return { ...base, destino: v.valor, nombreDestino: `Cuenta en ${bancoDeCci(v.valor)}` };
  return { ...base, destino: v.valor, nombreDestino: `Celular ${ocultarCelular(v.valor)}` };
}

router.post("/transferencias/preparar", requiereSesion, async (req, res) => {
  const b = validar(PrepararTransferenciaReq, req.body);
  const r = await resolver(req.clienteId!, b);
  const out: PrepararTransferenciaRes = {
    tipo: b.tipo,
    origen: aCuentaRes(r.origen),
    destinoMostrado: mostrarDestino(b.tipo, r.destino),
    nombreDestino: r.nombreDestino,
    monto: r.monto,
    glosa: b.glosa || null,
    saldoSuficiente: aNumero(r.origen.saldo) >= r.monto,
    idempotencyKey: randomUUID(),
  };
  res.json(out);
});

async function respuesta(t: Transferencia, repetida: boolean): Promise<ConfirmarTransferenciaRes> {
  const origen = await prisma.cuenta.findUniqueOrThrow({ where: { id: t.cuentaOrigenId } });
  return {
    tipo: t.tipo,
    operacion: t.operacion,
    fecha: t.creadoEn.toISOString(),
    monto: aNumero(t.monto),
    nombreDestino: t.nombreDestino,
    destinoMostrado: mostrarDestino(t.tipo, t.destino),
    origen: aCuentaRes(origen),
    repetida,
  };
}

router.post("/transferencias/confirmar", requiereSesion, async (req, res) => {
  const b = validar(ConfirmarTransferenciaReq, req.body);
  const clienteId = req.clienteId!;
  const key = b.idempotencyKey.trim();
  if (key.length < 8 || key.length > 64) throw new HttpError(400, "VALIDACION", "Clave de operación inválida");

  const previa = await prisma.transferencia.findUnique({ where: { idempotencyKey: key } });
  if (previa) {
    if (previa.clienteId !== clienteId) throw new HttpError(409, "KEY_REUTILIZADA", "Esta operación no corresponde. Vuelve a empezar.");
    res.json(await respuesta(previa, true));
    return;
  }

  const r = await resolver(clienteId, b);
  if (aNumero(r.origen.saldo) < r.monto) throw saldoInsuficiente();
  const cliente = await obtenerCliente(clienteId);
  try {
    const t = await prisma.$transaction(async (tx) => {
      // 1) La key primero: dos toques a la vez chocan en el índice único y solo uno mueve dinero.
      const t = await tx.transferencia.create({
        data: {
          idempotencyKey: key,
          clienteId,
          tipo: b.tipo,
          cuentaOrigenId: r.origen.id,
          cuentaDestinoId: r.cuentaDestinoId,
          destinoClienteId: r.destinoClienteId,
          destino: r.destino,
          nombreDestino: r.nombreDestino,
          monto: r.monto,
          glosa: b.glosa || null,
          operacion: nuevaOperacion(),
          creadoEn: fechaOperacion(cliente.fechaSimulada),
        },
      });
      // 2) Descontar con el saldo verificado otra vez (condición atómica) y abonar si la cuenta es de Caja Piura.
      const d = await tx.cuenta.updateMany({ where: { id: r.origen.id, saldo: { gte: r.monto } }, data: { saldo: { decrement: r.monto } } });
      if (d.count === 0) throw saldoInsuficiente();
      if (r.cuentaDestinoId) await tx.cuenta.update({ where: { id: r.cuentaDestinoId }, data: { saldo: { increment: r.monto } } });
      return t;
    });
    res.json(await respuesta(t, false));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.json(await respuesta(await prisma.transferencia.findUniqueOrThrow({ where: { idempotencyKey: key } }), true));
      return;
    }
    throw e;
  }
});
