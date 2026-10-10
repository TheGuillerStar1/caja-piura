// Dueño: Agente B. Contratos de request/response en @cp/shared.
import type { CuotaRes } from "@cp/shared";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { aCuotaRes, obtenerCliente } from "../pagos/servicio.js";

export const router = Router();

router.get("/cuotas/proxima", requiereSesion, async (req, res) => {
  const cliente = await obtenerCliente(req.clienteId!);
  const q = await prisma.cuota.findFirst({
    where: { clienteId: cliente.id, estado: "PENDIENTE" },
    orderBy: [{ vencimiento: "asc" }, { numero: "asc" }],
  });
  const r: CuotaRes | null = q ? aCuotaRes(q, cliente.fechaSimulada) : null;
  res.json(r);
});
