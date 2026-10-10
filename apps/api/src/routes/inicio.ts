// Dueño: Agente A. Contratos de request/response en @cp/shared.
// Avisos proactivos: cuota pendiente más próxima y recibos de sus frecuentes que vencen en ≤ 3 días
// (respecto a fechaSimulada) o cuando hoy es su día de pago habitual.
import type { Aviso, InicioRes } from "@cp/shared";
import { Router } from "express";
import { HttpError } from "../lib/errores.js";
import { aNumero, cuandoVence, diasEntre, soles } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { requiereSesion } from "../lib/sesion.js";
import { perfilDeCliente, recomendar } from "../motor/index.js";

export const router = Router();

// Misma ventana que las notificaciones de "Adelantar 30 días" (retencion/logica.ts DIAS_AVISO).
const DIAS_AVISO = 5;

router.get("/inicio", requiereSesion, async (req, res) => {
  const c = await prisma.cliente.findUnique({
    where: { id: req.clienteId! },
    include: { frecuentes: { include: { servicio: true }, orderBy: { id: "asc" } } },
  });
  if (!c) throw new HttpError(401, "SIN_SESION", "Inicia sesión para continuar");
  const hoy = c.fechaSimulada;
  const esDiaHabitual = hoy.getUTCDate() === c.diaPagoHabitual;
  const avisar = (dias: number) => dias <= DIAS_AVISO || esDiaHabitual;
  const avisos: Aviso[] = [];

  const cuota = await prisma.cuota.findFirst({
    where: { clienteId: c.id, estado: "PENDIENTE" },
    orderBy: { vencimiento: "asc" },
  });
  if (cuota) {
    const dias = diasEntre(hoy, cuota.vencimiento);
    if (avisar(dias)) {
      const monto = aNumero(cuota.monto);
      avisos.push({
        tipo: "CUOTA",
        referenciaId: cuota.id,
        titulo: dias < 0 ? `Tu cuota de ${soles(monto)} ya venció` : `Tu cuota de ${soles(monto)} vence ${cuandoVence(hoy, cuota.vencimiento)}`,
        monto,
        vencimiento: cuota.vencimiento.toISOString(),
        diasRestantes: dias,
      });
    }
  }

  for (const f of c.frecuentes) {
    const recibo = await prisma.recibo.findFirst({
      where: { servicioId: f.servicioId, codigo: f.codigo, pagado: false },
      orderBy: { vencimiento: "asc" },
    });
    if (!recibo) continue;
    const dias = diasEntre(hoy, recibo.vencimiento);
    if (!avisar(dias)) continue;
    const monto = aNumero(recibo.monto);
    avisos.push({
      tipo: "FRECUENTE",
      referenciaId: f.id,
      titulo: `${f.alias} · ${soles(monto)} · ${dias < 0 ? "ya venció" : `vence ${cuandoVence(hoy, recibo.vencimiento)}`}`,
      monto,
      vencimiento: recibo.vencimiento.toISOString(),
      diasRestantes: dias,
    });
  }
  avisos.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const rec = recomendar(perfilDeCliente(c, c.frecuentes.length > 0));
  const r: InicioRes = {
    saludo: `Hola, ${c.nombre}`,
    vista: c.vistaPreferida ?? rec.vista,
    avisos,
    accesos: rec.sugerencias,
  };
  res.json(r);
});
