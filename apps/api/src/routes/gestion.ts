// Centro de mando (/gestion), público como el panel del jurado: solo agregados de perfiles ficticios, sin datos personales.
// GET  /gestion/funciona              «¿Está funcionando?»: pagan solos, vuelven a pagar, pagan a tiempo, ahorro (caché 5 s)
// GET  /gestion/resumen               KPIs del negocio, por distrito y por segmento (caché 10 s)
// POST /gestion/segmento              cuántos clientes alcanza un segmento
// GET  /gestion/campanas              campañas con su resultado proyectado
// POST /gestion/campanas              crear campaña
// POST /gestion/campanas/:id/simular  avanza 30 días la campaña
// DELETE /gestion/campanas/:id
import {
  CrearCampanaReq,
  METAS_FUNCIONA,
  SegmentoCampana,
  SUPUESTOS_GESTION,
  type AlcanceSegmentoRes,
  type CampanaRes,
  type DistritoGestion,
  type FuncionaRes,
  type ResumenGestionRes,
} from "@cp/shared";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { aNumero, diasEntre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { recomendar } from "../motor/index.js";
import { AHORRO_POR_OP, alcance, pagosATiempo, type PerfilGestion, proyectarCampana, ubigeoDe, vuelvenAPagar } from "../gestion/logica.js";
import { tasaExitoSinAyuda } from "../retencion/logica.js";

export const router = Router();

const CACHE_MS = 10_000;
const MAX_CAMPANAS = 30;
const DIAS_POR_SIMULACION = 30;
const MAX_DIAS = 90;

type PerfilCompleto = PerfilGestion & {
  pagosSinAyuda: number;
  fechaSimulada: Date;
  cuotas: { monto: number; vencimiento: Date }[];
};

let cachePerfiles: { hasta: number; datos: Promise<PerfilCompleto[]> } | null = null;

/** Todos los clientes (incluidos los de demo: así el mapa cambia en vivo cuando Rosa paga). */
function perfiles(): Promise<PerfilCompleto[]> {
  if (!cachePerfiles || cachePerfiles.hasta < Date.now()) {
    const datos = prisma.cliente
      .findMany({
        select: {
          id: true,
          edad: true,
          ocupacion: true,
          zona: true,
          distrito: true,
          opsPresencialesMes: true,
          opsDigitalesMes: true,
          gamaDispositivo: true,
          pagosSinAyuda: true,
          fechaSimulada: true,
          cuotas: { where: { estado: "PENDIENTE" }, orderBy: { vencimiento: "asc" }, take: 3, select: { monto: true, vencimiento: true } },
        },
      })
      .then((cs) => cs.map((c) => ({ ...c, cuotas: c.cuotas.map((q) => ({ monto: aNumero(q.monto), vencimiento: q.vencimiento })) })));
    datos.catch(() => (cachePerfiles = null));
    cachePerfiles = { hasta: Date.now() + CACHE_MS, datos };
  }
  return cachePerfiles.datos;
}

type Acumulado = Omit<DistritoGestion, "ubigeo" | "nombres" | "ocupacionPrincipal" | "edadMedia"> & {
  sumaEdad: number;
  conDigital: number;
  nAsistida: number;
  ocupaciones: Record<string, number>;
};
const vacio = (): Acumulado => ({
  clientes: 0,
  adopcion: 0,
  tasaDigital: 0,
  opsVentanillaMes: 0,
  opsDigitalesMes: 0,
  oportunidad: 0,
  porVencer: 0,
  montoPorVencer: 0,
  vencidas: 0,
  asistida: 0,
  pagosApp: 0,
  sumaEdad: 0,
  conDigital: 0,
  nAsistida: 0,
  ocupaciones: {},
});

function sumar(a: Acumulado, p: PerfilCompleto, pagos: number) {
  a.clientes++;
  a.sumaEdad += p.edad;
  a.opsVentanillaMes += p.opsPresencialesMes;
  a.opsDigitalesMes += p.opsDigitalesMes;
  if (p.opsDigitalesMes > 0) a.conDigital++;
  if (p.gamaDispositivo !== "BAJA") a.oportunidad += p.opsPresencialesMes;
  if (recomendar(p).vista === "ASISTIDA") a.nAsistida++;
  a.ocupaciones[p.ocupacion] = (a.ocupaciones[p.ocupacion] ?? 0) + 1;
  a.pagosApp += pagos;
  for (const q of p.cuotas) {
    const d = diasEntre(p.fechaSimulada, q.vencimiento);
    if (d < 0) a.vencidas++;
    else if (d <= 7) {
      a.porVencer++;
      a.montoPorVencer += q.monto;
    }
  }
}

const cerrar = (a: Acumulado) => {
  const { sumaEdad, conDigital, nAsistida, ocupaciones, ...resto } = a;
  const ops = a.opsVentanillaMes + a.opsDigitalesMes;
  return {
    ...resto,
    adopcion: a.clientes ? conDigital / a.clientes : 0,
    tasaDigital: ops ? a.opsDigitalesMes / ops : 0,
    asistida: a.clientes ? nAsistida / a.clientes : 0,
    montoPorVencer: Math.round(a.montoPorVencer * 100) / 100,
    edadMedia: a.clientes ? Math.round(sumaEdad / a.clientes) : 0,
    ocupacionPrincipal: (Object.entries(ocupaciones).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "OTRO") as DistritoGestion["ocupacionPrincipal"],
  };
};

async function calcularResumen(): Promise<ResumenGestionRes> {
  const [ps, pagosPorCliente, cashback, pagosRegistrados, exitososSinAyuda, abandonosConfirmar] = await Promise.all([
    perfiles(),
    prisma.pago.groupBy({ by: ["clienteId"], where: { estado: "EXITOSO" }, _count: { _all: true } }),
    prisma.cashback.aggregate({ _sum: { monto: true } }),
    prisma.pago.count(),
    prisma.pago.count({ where: { estado: "EXITOSO", conAyuda: false } }),
    prisma.evento.count({ where: { pantalla: "confirmar", accion: "abandonar" } }),
  ]);
  const pagos = new Map(pagosPorCliente.map((g) => [g.clienteId, g._count._all]));

  const porDistrito = new Map<string, { a: Acumulado; nombres: Set<string> }>();
  const porSegmento = new Map<string, { clientes: number; dig: number; ops: number; asistida: number }>();
  const total = vacio();
  for (const p of ps) {
    const n = pagos.get(p.id) ?? 0;
    sumar(total, p, n);
    const ubigeo = ubigeoDe(p.distrito);
    if (ubigeo) {
      const d = porDistrito.get(ubigeo) ?? { a: vacio(), nombres: new Set<string>() };
      sumar(d.a, p, n);
      d.nombres.add(p.distrito);
      porDistrito.set(ubigeo, d);
    }
    const clave = `${p.ocupacion}|${p.gamaDispositivo}`;
    const s = porSegmento.get(clave) ?? { clientes: 0, dig: 0, ops: 0, asistida: 0 };
    s.clientes++;
    s.dig += p.opsDigitalesMes;
    s.ops += p.opsDigitalesMes + p.opsPresencialesMes;
    if (recomendar(p).vista === "ASISTIDA") s.asistida++;
    porSegmento.set(clave, s);
  }

  const { edadMedia: _e, ocupacionPrincipal: _o, ...totales } = cerrar(total);
  return {
    distritos: [...porDistrito].map(([ubigeo, d]) => ({ ubigeo, nombres: [...d.nombres].sort(), ...cerrar(d.a) })),
    totales: {
      ...totales,
      cashbackEntregado: aNumero(cashback._sum.monto ?? 0),
      tasaExitoSinAyuda: tasaExitoSinAyuda(exitososSinAyuda, pagosRegistrados, abandonosConfirmar),
    },
    segmentos: [...porSegmento].map(([clave, s]) => {
      const [ocupacion, gama] = clave.split("|") as [DistritoGestion["ocupacionPrincipal"], "BAJA" | "MEDIA" | "ALTA"];
      return { ocupacion, gama, clientes: s.clientes, tasaDigital: s.ops ? s.dig / s.ops : 0, asistida: s.asistida / s.clientes };
    }),
    supuestos: { ...SUPUESTOS_GESTION },
  };
}

let cacheResumen: { hasta: number; datos: ResumenGestionRes } | null = null;

router.get("/gestion/resumen", async (_req, res) => {
  if (!cacheResumen || cacheResumen.hasta < Date.now()) cacheResumen = { hasta: Date.now() + CACHE_MS, datos: await calcularResumen() };
  res.set("Cache-Control", "no-store").json(cacheResumen.datos);
});

async function calcularFunciona(): Promise<FuncionaRes> {
  const [ps, pagos, pagosRegistrados, exitososSinAyuda, abandonosConfirmar] = await Promise.all([
    perfiles(),
    // creadoEn es la fecha simulada del cliente (pagos/confirmar.ts): «Adelantar 30 días» cuenta como otro mes.
    prisma.pago.findMany({ where: { estado: "EXITOSO" }, select: { clienteId: true, creadoEn: true, tipo: true, referenciaId: true } }),
    prisma.pago.count(),
    prisma.pago.count({ where: { estado: "EXITOSO", conAyuda: false } }),
    prisma.evento.count({ where: { pantalla: "confirmar", accion: "abandonar" } }),
  ]);

  const hoyDe = new Map(ps.map((p) => [p.id, p.fechaSimulada]));
  const porCliente = new Map<number, Date[]>();
  for (const p of pagos) porCliente.set(p.clienteId, [...(porCliente.get(p.clienteId) ?? []), p.creadoEn]);
  const repiten = vuelvenAPagar([...porCliente].map(([id, fechas]) => ({ hoy: hoyDe.get(id) ?? new Date(), pagos: fechas })));

  const pagosCuota = pagos.filter((p) => p.tipo === "CUOTA");
  const cuotas = await prisma.cuota.findMany({ where: { id: { in: pagosCuota.map((p) => p.referenciaId) } }, select: { id: true, vencimiento: true } });
  const vence = new Map(cuotas.map((q) => [q.id, q.vencimiento]));
  const aTiempo = pagosATiempo(
    pagosCuota.filter((p) => vence.has(p.referenciaId)).map((p) => ({ pagado: p.creadoEn, vencimiento: vence.get(p.referenciaId)! })),
  );

  let opsAppMes = 0;
  let opsMigrablesMes = 0;
  for (const p of ps) {
    opsAppMes += p.opsDigitalesMes;
    if (p.gamaDispositivo !== "BAJA") opsMigrablesMes += p.opsPresencialesMes;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;

  return {
    sinAyuda: {
      tasa: tasaExitoSinAyuda(exitososSinAyuda, pagosRegistrados, abandonosConfirmar),
      exitososSinAyuda,
      intentos: pagosRegistrados + abandonosConfirmar,
      meta: METAS_FUNCIONA.sinAyuda,
    },
    repiten: { ...repiten, conPago: porCliente.size, meta: METAS_FUNCIONA.repiten },
    aTiempo: { ...aTiempo, meta: METAS_FUNCIONA.aTiempo },
    ahorro: { actualMes: r2(opsAppMes * AHORRO_POR_OP), potencialMes: r2(opsMigrablesMes * AHORRO_POR_OP), opsAppMes, opsMigrablesMes, ahorroPorOp: AHORRO_POR_OP },
  };
}

let cacheFunciona: { hasta: number; datos: FuncionaRes } | null = null;

router.get("/gestion/funciona", async (_req, res) => {
  if (!cacheFunciona || cacheFunciona.hasta < Date.now()) cacheFunciona = { hasta: Date.now() + 5_000, datos: await calcularFunciona() };
  res.set("Cache-Control", "no-store").json(cacheFunciona.datos);
});

router.post("/gestion/segmento", async (req, res) => {
  const segmento = validar(SegmentoCampana, req.body);
  const r: AlcanceSegmentoRes = alcance(await perfiles(), segmento);
  res.json(r);
});

type FilaCampana = { id: number; nombre: string; accion: CampanaRes["accion"]; segmento: unknown; diasSimulados: number; creadoEn: Date };

function aRespuesta(c: FilaCampana, ps: PerfilGestion[]): CampanaRes {
  // El segmento guardado se vuelve a validar: completa valores por defecto si el contrato creció.
  const segmento = SegmentoCampana.parse(c.segmento);
  return {
    id: c.id,
    nombre: c.nombre,
    accion: c.accion,
    segmento,
    creadoEn: c.creadoEn.toISOString(),
    diasSimulados: c.diasSimulados,
    ...proyectarCampana({ ...c, segmento }, ps),
  };
}

router.get("/gestion/campanas", async (_req, res) => {
  const [cs, ps] = await Promise.all([prisma.campana.findMany({ orderBy: { id: "desc" } }), perfiles()]);
  res.set("Cache-Control", "no-store").json(cs.map((c) => aRespuesta(c, ps)));
});

router.post("/gestion/campanas", async (req, res) => {
  const { nombre, accion, segmento } = validar(CrearCampanaReq, req.body);
  const ps = await perfiles();
  if (alcance(ps, segmento).clientes === 0) throw new HttpError(400, "SEGMENTO_VACIO", "Ningún cliente cumple ese segmento. Quita algún filtro.");
  if ((await prisma.campana.count()) >= MAX_CAMPANAS) {
    throw new HttpError(409, "DEMASIADAS", `Hay ${MAX_CAMPANAS} campañas. Borra alguna para crear otra.`);
  }
  const c = await prisma.campana.create({ data: { nombre, accion, segmento } });
  res.status(201).json(aRespuesta(c, ps));
});

const idDe = (v: unknown) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "NO_ENCONTRADO", "Campaña no encontrada");
  return id;
};

router.post("/gestion/campanas/:id/simular", async (req, res) => {
  const id = idDe(req.params.id);
  const c = await prisma.campana.findUnique({ where: { id } });
  if (!c) throw new HttpError(404, "NO_ENCONTRADO", "Campaña no encontrada");
  const actualizada = await prisma.campana.update({
    where: { id },
    data: { diasSimulados: Math.min(MAX_DIAS, c.diasSimulados + DIAS_POR_SIMULACION) },
  });
  res.json(aRespuesta(actualizada, await perfiles()));
});

router.delete("/gestion/campanas/:id", async (req, res) => {
  const id = idDe(req.params.id);
  await prisma.campana.deleteMany({ where: { id } });
  res.status(204).end();
});
