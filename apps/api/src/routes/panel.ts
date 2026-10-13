// Dueño: Agente D. Contratos de request/response en @cp/shared.
// GET /panel/kpis (público): indicadores para el jurado. Se cachea 10 s en memoria.
import type { KpisRes } from "@cp/shared";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { recomendar } from "../motor/index.js";
import { armarEmbudo, armarRecorridos, msASeg, tasaExitoSinAyuda } from "../retencion/logica.js";

export const router = Router();

/**
 * PROVISIONAL: segundos que toma hoy pagar una cuota en la app actual de Caja Piura.
 * Reemplazar con lo medido en el video del flujo actual cuando lo tengamos.
 */
export const TIEMPO_REFERENCIA_ACTUAL_SEG = 180;
const CACHE_MS = 10_000;

let cache: { hasta: number; datos: KpisRes } | null = null;

async function calcularKpis(): Promise<KpisRes> {
  const [pagosRegistrados, exitososSinAyuda, pagosExitosos, abandonosConfirmar, porPantalla, tiempos, clientes, eventosTramite] = await Promise.all([
    prisma.pago.count(),
    prisma.pago.count({ where: { estado: "EXITOSO", conAyuda: false } }),
    prisma.pago.count({ where: { estado: "EXITOSO" } }),
    prisma.evento.count({ where: { pantalla: "confirmar", accion: "abandonar" } }),
    prisma.evento.groupBy({ by: ["pantalla", "accion"], where: { accion: { in: ["ver", "abandonar"] } }, _count: { _all: true } }),
    prisma.evento.groupBy({
      by: ["flujo"],
      where: { accion: "completar", flujo: { in: ["CUOTA", "FRECUENTE", "RECIBO"] }, msDesdeInicio: { not: null } },
      _avg: { msDesdeInicio: true },
    }),
    // Distribución sobre los 500 perfiles sintéticos (sin los clientes de demo).
    prisma.cliente.findMany({
      where: { esDemo: false },
      select: {
        edad: true,
        ocupacion: true,
        zona: true,
        opsPresencialesMes: true,
        opsDigitalesMes: true,
        gamaDispositivo: true,
        pagosSinAyuda: true,
      },
    }),
    // Eventos de los trámites de pago (últimos 30 días, como máximo 20 000) para seguir cada sesión paso a paso.
    prisma.evento.findMany({
      where: { flujo: { in: ["CUOTA", "RECIBO", "FRECUENTE"] }, creadoEn: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
      select: { sesionId: true, flujo: true, pantalla: true, accion: true, ayudaUsada: true },
      orderBy: { id: "asc" },
      take: 20000,
    }),
  ]);

  const tiempo = (f: string) => msASeg(tiempos.find((t) => t.flujo === f)?._avg.msDesdeInicio);
  const distribucionVistas = { ASISTIDA: 0, ESTANDAR: 0 };
  for (const c of clientes) distribucionVistas[recomendar(c).vista]++;

  return {
    // Fórmula en retencion/logica.ts: exitosos sin ayuda ÷ (pagos registrados + abandonos en "confirmar").
    tasaExitoSinAyuda: tasaExitoSinAyuda(exitososSinAyuda, pagosRegistrados, abandonosConfirmar),
    tiempoMedioSeg: { CUOTA: tiempo("CUOTA"), FRECUENTE: tiempo("FRECUENTE"), RECIBO: tiempo("RECIBO") },
    tiempoReferenciaActualSeg: TIEMPO_REFERENCIA_ACTUAL_SEG,
    embudo: armarEmbudo(porPantalla.map((g) => ({ pantalla: g.pantalla, accion: g.accion, n: g._count._all }))),
    distribucionVistas,
    // Pagos realizados con éxito desde la app.
    pagosTotales: pagosExitosos,
    recorridos: armarRecorridos(eventosTramite),
  };
}

router.get("/panel/kpis", async (_req, res) => {
  if (!cache || cache.hasta < Date.now()) cache = { hasta: Date.now() + CACHE_MS, datos: await calcularKpis() };
  res.set("Cache-Control", "no-store").json(cache.datos);
});
