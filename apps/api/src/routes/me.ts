// Dueño: Agente A. Contratos de request/response en @cp/shared.
import { PutVistaReq, type MeRes, type Movimiento, type MovimientosRes } from "@cp/shared";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { aNumero, ocultarCuenta, ocultarNombre } from "../lib/formato.js";
import { NOMBRE_TIPO } from "../transferencias/logica.js";
import { sePuedePagarDesde } from "../pagos/servicio.js";
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
    cuentas: c.cuentas.map((k) => ({ id: k.id, numero: k.numero, numeroOculto: ocultarCuenta(k.numero), tipo: k.tipo, saldo: aNumero(k.saldo), paraPagar: sePuedePagarDesde(k.tipo) })),
  };
  res.json(r);
});

router.put("/me/vista", requiereSesion, async (req, res) => {
  const { vista } = validar(PutVistaReq, req.body);
  await prisma.cliente.update({ where: { id: req.clienteId! }, data: { vistaPreferida: vista, primerIngreso: false } });
  res.json({ ok: true, vista });
});

// Últimos movimientos de una cuenta del cliente: pagos exitosos que salieron de ella y transferencias que salieron o entraron.
router.get("/me/cuentas/:id/movimientos", requiereSesion, async (req, res) => {
  const cuentaId = Number(req.params.id);
  const cuenta = Number.isInteger(cuentaId) ? await prisma.cuenta.findFirst({ where: { id: cuentaId, clienteId: req.clienteId! } }) : null;
  if (!cuenta) throw new HttpError(404, "CUENTA_NO_ENCONTRADA", "No encontramos esa cuenta");
  const [pagos, salen, entran] = await Promise.all([
    prisma.pago.findMany({ where: { cuentaId, estado: "EXITOSO" }, orderBy: { creadoEn: "desc" }, take: 10 }),
    prisma.transferencia.findMany({ where: { cuentaOrigenId: cuentaId }, orderBy: { creadoEn: "desc" }, take: 10 }),
    prisma.transferencia.findMany({ where: { cuentaDestinoId: cuentaId }, orderBy: { creadoEn: "desc" }, take: 10, include: { cliente: true } }),
  ]);
  const movimientos: Movimiento[] = [
    ...pagos.map((p) => ({ id: `p${p.id}`, descripcion: p.descripcion, monto: aNumero(p.monto), fecha: p.creadoEn.toISOString(), operacion: p.operacion, entrada: false })),
    ...salen.map((t) => ({ id: `t${t.id}`, descripcion: `${NOMBRE_TIPO[t.tipo]} · ${t.nombreDestino}`, monto: aNumero(t.monto), fecha: t.creadoEn.toISOString(), operacion: t.operacion, entrada: false })),
    ...entran.map((t) => ({
      id: `e${t.id}`,
      descripcion: t.tipo === "PROPIAS" ? "Transferencia desde tu otra cuenta" : `Transferencia recibida de ${ocultarNombre(`${t.cliente.nombre} ${t.cliente.apellido}`)}`,
      monto: aNumero(t.monto),
      fecha: t.creadoEn.toISOString(),
      operacion: t.operacion,
      entrada: true,
    })),
  ]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 10);
  const r: MovimientosRes = { cuentaId, movimientos };
  res.json(r);
});
