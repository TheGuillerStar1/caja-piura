// Dueño: Agente B. Contratos de request/response en @cp/shared.
import { ConfirmarPagoReq, PrepararPagoReq, type PrepararPagoRes } from "@cp/shared";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { validar } from "../lib/errores.js";
import { aNumero } from "../lib/formato.js";
import { requiereSesion } from "../lib/sesion.js";
import { confirmarPago } from "../pagos/confirmar.js";
import { aCuentaRes, cuentaPrincipal, resolverObjetivo } from "../pagos/servicio.js";

export const router = Router();

/** Resumen del pago (monto, a quién, desde qué cuenta) + key de idempotencia. No mueve dinero. */
router.post("/pagos/preparar", requiereSesion, async (req, res) => {
  const { tipo, referenciaId, cuentaId } = validar(PrepararPagoReq, req.body);
  const clienteId = req.clienteId!;
  const obj = await resolverObjetivo(clienteId, tipo, referenciaId);
  const cuenta = await cuentaPrincipal(clienteId, cuentaId);
  const r: PrepararPagoRes = {
    tipo,
    referenciaId,
    descripcion: obj.descripcion,
    destinatario: obj.destinatario,
    monto: obj.monto,
    cuenta: aCuentaRes(cuenta),
    saldoSuficiente: aNumero(cuenta.saldo) >= obj.monto,
    idempotencyKey: randomUUID(),
  };
  res.json(r);
});

/** Ejecuta el pago una sola vez por idempotencyKey (ver pagos/confirmar.ts). */
router.post("/pagos/confirmar", requiereSesion, async (req, res) => {
  const b = validar(ConfirmarPagoReq, req.body);
  res.json(await confirmarPago(req.clienteId!, b));
});
