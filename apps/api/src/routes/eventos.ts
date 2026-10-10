// Dueño: Agente D. Contratos de request/response en @cp/shared.
// POST /eventos (público): lote de telemetría. Acepta JSON o text/plain (navigator.sendBeacon).
// Nunca responde 500 por datos malos: descarta lo inválido y responde 400 sin detalle.
import { EventoIn } from "@cp/shared";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const router = Router();

function leerCuerpo(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

router.post("/eventos", async (req, res) => {
  const cuerpo = leerCuerpo(req.body) as { eventos?: unknown } | null;
  const lista = Array.isArray(cuerpo?.eventos) ? cuerpo.eventos.slice(0, 50) : [];
  const validos = lista.flatMap((e) => {
    const r = EventoIn.safeParse(e);
    return r.success ? [r.data] : [];
  });
  if (!validos.length) {
    res.status(400).end();
    return;
  }
  const filas = (clienteId: number | null) =>
    validos.map((e) => ({
      clienteId,
      sesionId: e.sesionId,
      pantalla: e.pantalla,
      accion: e.accion,
      flujo: e.flujo ?? null,
      msDesdeInicio: e.msDesdeInicio != null ? Math.min(e.msDesdeInicio, 2_000_000_000) : null,
      ayudaUsada: e.ayudaUsada ?? false,
    }));
  try {
    await prisma.evento.createMany({ data: filas(req.clienteId ?? null) });
  } catch {
    // p. ej. la cookie apunta a un cliente que ya no existe (tras reiniciar la demo): se guarda sin cliente.
    try {
      await prisma.evento.createMany({ data: filas(null) });
    } catch (e) {
      console.error("eventos:", e);
    }
  }
  res.status(204).end();
});

