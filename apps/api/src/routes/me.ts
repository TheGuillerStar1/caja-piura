// Dueño: Agente A. Contratos de request/response en @cp/shared.
import { PutVistaReq, type MeRes } from "@cp/shared";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { aNumero, ocultarCuenta } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { perfilDeCliente, recomendar } from "../motor/index.js";

export const router = Router();

router.get("/me", requiereSesion, async (req, res) => {
  const c = await prisma.cliente.findUnique({
    where: { id: req.clienteId! },
    include: { cuentas: { orderBy: { id: "asc" } }, _count: { select: { frecuentes: true } } },
  });
  if (!c) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  const r: MeRes = {
    id: c.id,
    nombre: c.nombre,
    edad: c.edad,
    ocupacion: c.ocupacion,
    zona: c.zona,
    vistaPreferida: c.vistaPreferida,
    primerIngreso: c.primerIngreso,
    fechaSimulada: c.fechaSimulada.toISOString(),
    recomendacion: recomendar(perfilDeCliente(c, c._count.frecuentes > 0)),
    cuentas: c.cuentas.map((k) => ({ id: k.id, numero: k.numero, numeroOculto: ocultarCuenta(k.numero), tipo: k.tipo, saldo: aNumero(k.saldo) })),
  };
  res.json(r);
});

router.put("/me/vista", requiereSesion, async (req, res) => {
  const { vista } = validar(PutVistaReq, req.body);
  await prisma.cliente.update({ where: { id: req.clienteId! }, data: { vistaPreferida: vista, primerIngreso: false } });
  res.json({ ok: true, vista });
});
