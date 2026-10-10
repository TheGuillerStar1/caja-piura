// Dueño: Agente G (F3). "Reiniciar demo" en un toque: vuelve a cero SOLO a los clientes de demo (esDemo, por DNI fijo).
// Se hace en el sitio (mismos ids de cliente): las sesiones abiertas en otros celulares siguen siendo válidas.
// Rápido: ~15 consultas en 3 tandas paralelas (unos 3 viajes a la base). Idempotente: si algo falla a medias, se repite entero.
// No toca a los 500 perfiles ni a sus recibos: solo borra por clienteId de demo y por (servicio, código) de recibos de demo.
import type { Prisma, PrismaClient } from "@prisma/client";
import { asegurarServicios, CLAVE_DEMO, CLIENTES_DEMO, type Empresa, hoyUTC, RECIBOS_DEMO, sembrarDemo } from "../../prisma/demo.js";

const DIA = 86400000;
const masDias = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA);
const masMeses = (d: Date, meses: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, Math.min(d.getUTCDate(), 28)));

export type ResultadoReinicio = { ok: true; modo: "EN_SITIO" | "COMPLETO"; ms: number };

/** Ids de servicio por empresa; solo crea/actualiza servicios si falta alguno. */
async function idsServicios(db: PrismaClient): Promise<Record<Empresa, number>> {
  const s = await db.servicio.findMany({ select: { id: true, empresa: true } });
  const ids = {} as Record<Empresa, number>;
  for (const x of s) ids[x.empresa as Empresa] ??= x.id;
  const faltan = (["Enosa", "EPS Grau", "Movistar", "Claro"] as Empresa[]).some((e) => !ids[e]);
  return faltan ? asegurarServicios(db) : ids;
}

/** Pares (servicio, código) de todos los recibos de demo: de frecuentes de demo y de la ruta C. */
export function codigosRecibosDemo(servicios: Record<Empresa, number>) {
  return [
    ...CLIENTES_DEMO.flatMap((c) => c.frecuentes.map((f) => ({ servicioId: servicios[f.empresa], codigo: f.codigo }))),
    ...RECIBOS_DEMO.map((r) => ({ servicioId: servicios[r.empresa], codigo: r.codigo })),
  ];
}

/** Operaciones del reinicio en el sitio, en tandas: cada tanda corre en paralelo y depende solo de las anteriores. */
export function planReinicio(db: PrismaClient, idPorDni: Record<string, number>, servicios: Record<Empresa, number>, hoy: Date) {
  const ids = CLIENTES_DEMO.map((c) => idPorDni[c.dni]);
  const where = { clienteId: { in: ids } };
  const ahora = Date.now();

  const cuentas: Prisma.CuentaCreateManyInput[] = [];
  const cuotas: Prisma.CuotaCreateManyInput[] = [];
  const frecuentes: Prisma.FrecuenteCreateManyInput[] = [];
  const recibos: Prisma.ReciboCreateManyInput[] = [];
  const clientes: Promise<unknown>[] = [];

  CLIENTES_DEMO.forEach((c, i) => {
    const clienteId = idPorDni[c.dni];
    const vencSiguiente = masDias(hoy, c.diasSiguiente);
    clientes.push(
      db.cliente.update({
        where: { id: clienteId },
        data: {
          nombre: c.nombre,
          apellido: c.apellido,
          edad: c.edad,
          ocupacion: c.ocupacion,
          zona: c.zona,
          distrito: c.distrito,
          opsPresencialesMes: c.presenciales,
          opsDigitalesMes: c.digitales,
          gamaDispositivo: c.gama,
          diaPagoHabitual: Math.min(28, vencSiguiente.getUTCDate()),
          claveDemo: CLAVE_DEMO,
          vistaPreferida: null,
          primerIngreso: true,
          fechaSimulada: hoy,
          pagosSinAyuda: 0,
          esDemo: true,
        },
      }),
    );
    cuentas.push({ clienteId, numero: `0011020000${String(i + 1).padStart(4, "0")}`, tipo: c.cuentaTipo, saldo: c.saldo });
    for (let k = 0; k < c.totalCuotas; k++) {
      const numero = k + 1;
      const offset = numero - (c.pagadas + 1);
      cuotas.push({
        clienteId,
        credito: c.credito,
        numero,
        totalCuotas: c.totalCuotas,
        monto: c.montoCuota,
        vencimiento: offset === 0 ? vencSiguiente : masMeses(vencSiguiente, offset),
        estado: numero <= c.pagadas ? "PAGADA" : "PENDIENTE",
      });
    }
    c.frecuentes.forEach((f, j) => {
      // creadoEn distinto para que el orden "más antiguo primero" sea estable (lo usa el asistente).
      frecuentes.push({ clienteId, alias: f.alias, servicioId: servicios[f.empresa], codigo: f.codigo, esPropio: f.esPropio, creadoEn: new Date(ahora + j) });
      recibos.push({ codigo: f.codigo, servicioId: servicios[f.empresa], titular: f.titular, monto: f.monto, vencimiento: masDias(hoy, f.dias) });
    });
  });
  for (const r of RECIBOS_DEMO) {
    recibos.push({ codigo: r.codigo, servicioId: servicios[r.empresa], titular: r.titular, monto: r.monto, vencimiento: masDias(hoy, r.dias), imagenKey: r.imagenKey });
  }

  return {
    // 1. Borrar lo que generó la demo y dejar a cada cliente como el primer día.
    //    Los recibos de demo incluyen los del "mes siguiente" que crea "Adelantar 30 días" y los marcados como pagados.
    borrar: () => [
      db.pago.deleteMany({ where }),
      db.punto.deleteMany({ where }),
      db.evento.deleteMany({ where }),
      db.frecuente.deleteMany({ where }),
      db.cuota.deleteMany({ where }),
      db.recibo.deleteMany({ where: { OR: codigosRecibosDemo(servicios) } }),
      ...clientes,
    ],
    // 2. Recrear. La cuenta se borra recién aquí porque los pagos (ya borrados) la referencian.
    crear: () => [
      db.cuenta.deleteMany({ where }).then(() => db.cuenta.createMany({ data: cuentas })),
      db.cuota.createMany({ data: cuotas }),
      db.frecuente.createMany({ data: frecuentes }),
      db.recibo.createMany({ data: recibos }),
    ],
  };
}

async function reiniciar(db: PrismaClient): Promise<ResultadoReinicio> {
  const t0 = Date.now();
  const dnis = CLIENTES_DEMO.map((c) => c.dni);
  const [servicios, existentes] = await Promise.all([
    idsServicios(db),
    db.cliente.findMany({ where: { dni: { in: dnis } }, select: { id: true, dni: true, esDemo: true } }),
  ]);
  // Si falta algún cliente de demo (base recién creada), se siembra completo.
  if (existentes.length !== dnis.length || existentes.some((c) => !c.esDemo)) {
    await sembrarDemo(db);
    return { ok: true, modo: "COMPLETO", ms: Date.now() - t0 };
  }
  const idPorDni = Object.fromEntries(existentes.map((c) => [c.dni, c.id]));
  const plan = planReinicio(db, idPorDni, servicios, hoyUTC());
  await Promise.all(plan.borrar());
  await Promise.all(plan.crear());
  return { ok: true, modo: "EN_SITIO", ms: Date.now() - t0 };
}

let enCurso: Promise<ResultadoReinicio> | null = null;

/** Reinicia la demo. Dos toques seguidos comparten el mismo reinicio. Reintenta una vez (p. ej. conexión cerrada por Railway). */
export function reiniciarDemo(db: PrismaClient): Promise<ResultadoReinicio> {
  enCurso ??= reiniciar(db)
    .catch((e) => {
      console.warn("[demo/reset] reintento:", (e as Error).message?.slice(0, 160));
      return reiniciar(db);
    })
    .finally(() => {
      enCurso = null;
    });
  return enCurso;
}
