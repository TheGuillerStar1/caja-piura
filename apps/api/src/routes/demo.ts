// Dueño: Agente D. Contratos de request/response en @cp/shared.
// Reloj simulado de la demo: "Adelantar 30 días" reemplaza al cron de recordatorios.
import type { AdelantarRes } from "@cp/shared";
import { Router } from "express";
import { sembrarDemo } from "../../prisma/demo.js";
import { HttpError } from "../lib/errores.js";
import { aNumero } from "../lib/formato.js";
import { prisma, prismaBase } from "../lib/prisma.js";
import { cerrarSesion, requiereSesion } from "../lib/sesion.js";
import { calcularNotificaciones, type Pendiente, siguienteRecibo, sumarDias } from "../retencion/logica.js";

export const router = Router();

async function clienteDemo(id: number) {
  const c = await prisma.cliente.findUnique({ where: { id } });
  if (!c) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  if (!c.esDemo) throw new HttpError(403, "SOLO_DEMO", "Esta opción solo está disponible para clientes de demostración");
  return c;
}

router.post("/demo/adelantar", requiereSesion, async (req, res) => {
  const c = await clienteDemo(req.clienteId!);
  const hoy = sumarDias(c.fechaSimulada, 30);
  await prisma.cliente.update({ where: { id: c.id }, data: { fechaSimulada: hoy } });

  // Recibos del mes siguiente para cada frecuente cuyo último recibo ya está pagado.
  const frecuentes = await prisma.frecuente.findMany({ where: { clienteId: c.id } });
  const pendientes: Pendiente[] = [];
  for (const f of frecuentes) {
    let ultimo = await prisma.recibo.findFirst({
      where: { servicioId: f.servicioId, codigo: f.codigo },
      orderBy: { vencimiento: "desc" },
    });
    if (!ultimo) continue;
    if (ultimo.pagado) {
      const s = siguienteRecibo({ ...ultimo, monto: aNumero(ultimo.monto) });
      ultimo = await prisma.recibo.upsert({
        where: { servicioId_codigo_vencimiento: { servicioId: s.servicioId, codigo: s.codigo, vencimiento: s.vencimiento } },
        create: s,
        update: {},
      });
    }
    if (!ultimo.pagado) pendientes.push({ tipo: "FRECUENTE", alias: f.alias, monto: aNumero(ultimo.monto), vencimiento: ultimo.vencimiento });
  }

  const cuota = await prisma.cuota.findFirst({ where: { clienteId: c.id, estado: "PENDIENTE" }, orderBy: { vencimiento: "asc" } });
  if (cuota) pendientes.push({ tipo: "CUOTA", monto: aNumero(cuota.monto), vencimiento: cuota.vencimiento });

  const r: AdelantarRes = {
    fechaSimulada: hoy.toISOString(),
    notificaciones: calcularNotificaciones(hoy, c.diaPagoHabitual, pendientes),
  };
  res.json(r);
});

router.post("/demo/reset", requiereSesion, async (req, res) => {
  await clienteDemo(req.clienteId!);
  await sembrarDemo(prismaBase);
  cerrarSesion(res);
  res.json({ ok: true });
});
