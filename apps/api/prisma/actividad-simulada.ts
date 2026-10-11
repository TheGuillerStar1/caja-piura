// Actividad SIMULADA en la app para los perfiles ficticios (esDemo = false), para que /panel y /gestion no se vean vacíos.
// ~3 meses de uso: pagos de crédito, servicios (frecuentes y recibos con foto) y yapeos, con más ayuda el primer mes y menos
// después (aprenden a hacerlo solos), clientes que vuelven mes a mes, cuotas casi siempre antes de vencer, abandonos y tiempos.
// Nunca toca a los clientes de la demo (Rosa, Javier, Elena) ni cambia saldos o cuotas.
//
// Todo lo que crea va marcado: idempotencyKey y sesionId empiezan con «sim-». Se puede borrar sin tocar nada más.
// Uso (desde apps/api):
//   npx dotenv -e ../../.env -- tsx prisma/actividad-simulada.ts          ← borra lo simulado anterior y lo vuelve a crear
//   npx dotenv -e ../../.env -- tsx prisma/actividad-simulada.ts borrar   ← solo borra lo simulado
import { fakerES as faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import { calcularCashback, motivoCashback } from "../src/pagos/logica.js";

const prisma = new PrismaClient();
faker.seed(2026); // reproducible
const azar = () => faker.number.float({ min: 0, max: 1 });
const entre = (a: number, b: number) => faker.number.int({ min: a, max: b });
const DIA = 86400000;
const masDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA);
const diasEntre = (a: Date, b: Date) => Math.round((Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / DIA);
const r2 = (n: number) => Math.round(n * 100) / 100;
const PREFIJO = "sim-";

async function borrar() {
  const pagos = await prisma.pago.findMany({ where: { idempotencyKey: { startsWith: PREFIJO } }, select: { id: true } });
  const ids = pagos.map((p) => p.id);
  const [cb, pg, tr, ev] = await prisma.$transaction([
    prisma.cashback.deleteMany({ where: { pagoId: { in: ids } } }),
    prisma.pago.deleteMany({ where: { id: { in: ids } } }),
    prisma.transferencia.deleteMany({ where: { idempotencyKey: { startsWith: PREFIJO } } }),
    prisma.evento.deleteMany({ where: { sesionId: { startsWith: PREFIJO } } }),
  ]);
  console.log(`Borrado lo simulado: ${pg.count} pagos, ${cb.count} cashback, ${tr.count} yapeos, ${ev.count} eventos.`);
}

/** Probabilidad de usar ayuda: alta el primer mes y baja con la práctica; algo más con celular de gama baja o 56+ años. */
const pAyuda = (mes: number, gama: string, edad: number) => [0.38, 0.18, 0.08][Math.min(mes, 2)] + (gama === "BAJA" ? 0.08 : 0) + (edad > 55 ? 0.05 : 0);

async function main() {
  await borrar();
  if (process.argv[2] === "borrar") return;

  const clientes = await prisma.cliente.findMany({
    where: { esDemo: false, opsDigitalesMes: { gt: 0 } },
    select: {
      id: true,
      edad: true,
      gamaDispositivo: true,
      opsDigitalesMes: true,
      opsPresencialesMes: true,
      fechaSimulada: true,
      cuentas: { select: { id: true }, orderBy: { id: "asc" }, take: 1 },
      cuotas: { where: { estado: "PAGADA" }, select: { id: true, numero: true, totalCuotas: true, credito: true, monto: true, vencimiento: true } },
      frecuentes: { select: { id: true, alias: true, codigo: true, servicioId: true, servicio: { select: { empresa: true } } } },
    },
  });
  const recibos = await prisma.recibo.findMany({ select: { id: true, servicioId: true, codigo: true, monto: true } });
  const reciboDe = new Map(recibos.map((r) => [`${r.servicioId}|${r.codigo}`, r]));

  const pagos: Prisma.PagoCreateManyInput[] = [];
  /** idempotencyKey del pago → motivo de su cashback (el movimiento se crea al final, con el id del pago). */
  const motivos = new Map<string, string>();
  const yapeos: Prisma.TransferenciaCreateManyInput[] = [];
  const eventos: Prisma.EventoCreateManyInput[] = [];
  let sesion = 0;

  for (const c of clientes) {
    const tasa = c.opsDigitalesMes / (c.opsDigitalesMes + c.opsPresencialesMes);
    if (azar() > 0.25 + 0.6 * tasa) continue; // no todos usan la app nueva
    const cuenta = c.cuentas[0];
    if (!cuenta) continue;
    const hoy = c.fechaSimulada;

    // Empieza hace 3, 2 o 1 meses; cada mes siguiente sigue con más probabilidad si ya usa el celular.
    let hace = faker.helpers.weightedArrayElement([{ value: 3, weight: 45 }, { value: 2, weight: 35 }, { value: 1, weight: 20 }]);
    const pSeguir = 0.55 + 0.4 * tasa - (c.gamaDispositivo === "BAJA" ? 0.08 : 0);
    let mes = 0;
    let acumuladoMes = 0;

    while (hace >= 1) {
      const base = masDias(hoy, -30 * hace);
      acumuladoMes = 0;
      const operaciones: ("CUOTA" | "FRECUENTE" | "RECIBO" | "YAPEO")[] = [];
      if (azar() < 0.75) operaciones.push("CUOTA");
      for (const f of c.frecuentes) if (azar() < 0.6) operaciones.push(azar() < 0.7 || !reciboDe.has(`${f.servicioId}|${f.codigo}`) ? "FRECUENTE" : "RECIBO");
      for (let i = 0; i < 2; i++) if (azar() < 0.45) operaciones.push("YAPEO");

      for (const op of operaciones) {
        const sid = `${PREFIJO}${++sesion}`;
        const conAyuda = azar() < pAyuda(mes, c.gamaDispositivo, c.edad);
        let fecha = masDias(base, entre(0, 26));
        const ev = (pantalla: string, accion: string, extra: Partial<Prisma.EventoCreateManyInput> = {}) =>
          eventos.push({ clienteId: c.id, sesionId: sid, pantalla, accion, ayudaUsada: conAyuda, creadoEn: fecha, ...extra });

        if (op === "YAPEO") {
          ev("inicio", "ver");
          ev("transferir-contacto", "ver");
          ev("transferir-contacto", "completar");
          yapeos.push({
            idempotencyKey: `${sid}-y`,
            clienteId: c.id,
            tipo: "CONTACTO",
            cuentaOrigenId: cuenta.id,
            destino: "9" + faker.string.numeric(8),
            nombreDestino: `${faker.person.firstName()} ${faker.person.lastName()}`.slice(0, 80),
            monto: r2(entre(10, 150) + (azar() < 0.5 ? 0.5 : 0)),
            operacion: "SIM" + faker.string.numeric(8),
            creadoEn: fecha,
            conAyuda,
          });
          continue;
        }

        // Pago: crédito, servicio frecuente o recibo con foto.
        let referenciaId: number;
        let descripcion: string;
        let monto: number;
        let diasAlVencimiento: number | null = null;
        if (op === "CUOTA") {
          // La cuota cuyo vencimiento cae en ese mes; casi siempre se paga unos días antes, a veces tarde.
          const q = c.cuotas.find((x) => Math.abs(diasEntre(base, x.vencimiento) - 13) <= 16);
          if (!q) continue;
          const tarde = azar() < 0.07 + (mes === 0 ? 0.05 : 0);
          fecha = masDias(q.vencimiento, tarde ? entre(1, 6) : -entre(0, 7));
          if (fecha > hoy) continue;
          referenciaId = q.id;
          monto = Number(q.monto);
          descripcion = `Pago de cuota · Cuota ${q.numero} de ${q.totalCuotas} · Crédito ${q.credito}`;
          diasAlVencimiento = diasEntre(fecha, q.vencimiento);
        } else {
          const f = faker.helpers.arrayElement(c.frecuentes);
          const rec = reciboDe.get(`${f.servicioId}|${f.codigo}`);
          monto = rec ? Number(rec.monto) : entre(25, 120);
          if (op === "RECIBO" && rec) {
            referenciaId = rec.id;
            descripcion = `Recibo ${f.servicio.empresa} · ${f.codigo}`;
          } else {
            referenciaId = f.id;
            descripcion = `${f.alias} · ${f.servicio.empresa}`;
          }
        }
        const flujo = op === "CUOTA" ? "CUOTA" : op === "RECIBO" ? "RECIBO" : "FRECUENTE";
        const pantalla = op === "CUOTA" ? "pagar-cuota" : op === "RECIBO" ? "pagar-recibo" : "pagar-frecuentes";
        ev("inicio", "ver");
        ev(pantalla, "ver", { flujo });
        ev("confirmar", "ver", { flujo });
        // A veces se va en la confirmación (intento sin éxito); la mitad vuelve y termina.
        if (azar() < [0.1, 0.06, 0.04][Math.min(mes, 2)]) {
          ev("confirmar", "abandonar", { flujo });
          if (azar() < 0.5) continue;
        }
        const exitoso = azar() > 0.02;
        const seg = { CUOTA: [16, 32], FRECUENTE: [8, 20], RECIBO: [14, 28] }[flujo];
        const ms = Math.round((entre(seg[0], seg[1]) + (conAyuda ? entre(6, 12) : 0)) * 1000 * (mes === 0 ? 1.1 : 1));
        let cashback = 0;
        if (exitoso) {
          const cb = calcularCashback({ tipo: flujo, monto, conAyuda, diasAlVencimiento, acumuladoMes });
          cashback = cb.monto;
          acumuladoMes = r2(acumuladoMes + cb.monto);
          ev("exito", "ver", { flujo });
          ev("exito", "completar", { flujo, msDesdeInicio: ms });
          if (cashback > 0) motivos.set(`${sid}-p`, motivoCashback(cb));
          pagos.push({
            idempotencyKey: `${sid}-p`,
            clienteId: c.id,
            cuentaId: cuenta.id,
            tipo: flujo,
            referenciaId,
            descripcion: descripcion.slice(0, 120),
            monto,
            estado: "EXITOSO",
            conAyuda,
            cashback,
            operacion: "SIM" + faker.string.numeric(8),
            creadoEn: fecha,
          });
        } else {
          ev("pago-fallido", "ver", { flujo });
          pagos.push({
            idempotencyKey: `${sid}-p`,
            clienteId: c.id,
            cuentaId: cuenta.id,
            tipo: flujo,
            referenciaId,
            descripcion: descripcion.slice(0, 120),
            monto,
            estado: "FALLIDO",
            conAyuda,
            cashback: 0,
            operacion: "",
            creadoEn: fecha,
          });
        }
      }

      // ¿Sigue usando la app el mes siguiente?
      hace--;
      mes++;
      if (azar() > pSeguir) break;
    }
  }

  const lotes = async <T,>(xs: T[], n: number, f: (l: T[]) => Promise<unknown>) => {
    for (let i = 0; i < xs.length; i += n) await f(xs.slice(i, i + n));
  };
  await lotes(pagos, 300, (l) => prisma.pago.createMany({ data: l }));
  await lotes(yapeos, 300, (l) => prisma.transferencia.createMany({ data: l }));
  await lotes(eventos, 1000, (l) => prisma.evento.createMany({ data: l }));

  // Cashback: un movimiento por pago exitoso que lo ganó (como en pagos/confirmar.ts).
  const creados = await prisma.pago.findMany({
    where: { idempotencyKey: { startsWith: PREFIJO }, estado: "EXITOSO", cashback: { gt: 0 } },
    select: { id: true, idempotencyKey: true, clienteId: true, cuentaId: true, cashback: true, creadoEn: true },
  });
  await lotes(
    creados.map((p) => ({ clienteId: p.clienteId, cuentaId: p.cuentaId, pagoId: p.id, motivo: motivos.get(p.idempotencyKey) ?? "Cashback · Pago desde la app", monto: p.cashback, creadoEn: p.creadoEn })),
    300,
    (l) => prisma.cashback.createMany({ data: l }),
  );

  const clientesActivos = new Set([...pagos.map((p) => p.clienteId), ...yapeos.map((y) => y.clienteId)]).size;
  console.log(
    `Simulado: ${clientesActivos} clientes · ${pagos.length} pagos (${pagos.filter((p) => p.estado === "FALLIDO").length} fallidos) · ` +
      `${yapeos.length} yapeos · ${eventos.length} eventos · ${creados.length} cashback.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
