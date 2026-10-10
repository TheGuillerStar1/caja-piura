// Dueño: Agente B. Contratos de request/response en @cp/shared.
import { CrearFrecuenteReq, type FrecuenteRes } from "@cp/shared";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { aFrecuenteRes } from "../pagos/servicio.js";

export const router = Router();

router.get("/frecuentes", requiereSesion, async (req, res) => {
  const lista = await prisma.frecuente.findMany({
    where: { clienteId: req.clienteId! },
    include: { servicio: true },
    orderBy: { creadoEn: "asc" },
  });
  const r: FrecuenteRes[] = await Promise.all(lista.map(aFrecuenteRes));
  res.json(r);
});

/** "¿Lo guardo para la próxima?" (ruta C): guarda el servicio y código del recibo pagado. */
router.post("/frecuentes", requiereSesion, async (req, res) => {
  const { reciboId, alias, esPropio } = validar(CrearFrecuenteReq, req.body);
  const recibo = await prisma.recibo.findUnique({ where: { id: reciboId } });
  if (!recibo) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese recibo");
  const clienteId = req.clienteId!;
  const f = await prisma.frecuente.upsert({
    where: { clienteId_servicioId_codigo: { clienteId, servicioId: recibo.servicioId, codigo: recibo.codigo } },
    create: { clienteId, servicioId: recibo.servicioId, codigo: recibo.codigo, alias: alias.trim(), esPropio },
    update: { alias: alias.trim(), esPropio },
    include: { servicio: true },
  });
  const r: FrecuenteRes = await aFrecuenteRes(f);
  res.status(201).json(r);
});
