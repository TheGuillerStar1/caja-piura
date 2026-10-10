// Dueño: Agente D. Contratos de request/response en @cp/shared.
import type { ProgresoRes } from "@cp/shared";
import { Router } from "express";
import { HttpError } from "../lib/errores.js";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { debeSugerirEstandar, inicioVentanaMes } from "../retencion/logica.js";

export const router = Router();

router.get("/progreso", requiereSesion, async (req, res) => {
  const clienteId = req.clienteId!;
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { fechaSimulada: true, vistaPreferida: true, pagosSinAyuda: true },
  });
  if (!cliente) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");

  // Crédito de referencia: el de la próxima cuota pendiente; si ya no hay, el último registrado.
  const ref =
    (await prisma.cuota.findFirst({ where: { clienteId, estado: "PENDIENTE" }, orderBy: { vencimiento: "asc" } })) ??
    (await prisma.cuota.findFirst({ where: { clienteId }, orderBy: { vencimiento: "desc" } }));

  const [suma, pagosMes, exitosos, restantes, historial] = await Promise.all([
    prisma.punto.aggregate({ where: { clienteId }, _sum: { puntos: true } }),
    prisma.pago.count({ where: { clienteId, estado: "EXITOSO", creadoEn: { gte: inicioVentanaMes(cliente.fechaSimulada) } } }),
    prisma.pago.count({ where: { clienteId, estado: "EXITOSO" } }),
    ref ? prisma.cuota.count({ where: { clienteId, credito: ref.credito, estado: "PENDIENTE" } }) : Promise.resolve(0),
    prisma.punto.findMany({ where: { clienteId }, orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: 10 }),
  ]);

  const r: ProgresoRes = {
    puntosTotal: suma._sum.puntos ?? 0,
    pagosDigitalesMes: pagosMes,
    visitasAhorradas: exitosos,
    cuotasRestantes: restantes,
    totalCuotas: ref?.totalCuotas ?? 0,
    sugerirVistaEstandar: debeSugerirEstandar(cliente.vistaPreferida, cliente.pagosSinAyuda),
    historial: historial.map((p) => ({ fecha: p.creadoEn.toISOString(), descripcion: p.motivo, puntos: p.puntos })),
  };
  res.json(r);
});
