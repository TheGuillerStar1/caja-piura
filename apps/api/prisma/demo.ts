// Dueño: Agente A. Datos FIJOS de demo (Rosa, Elena, Carlos, Pedro) + servicios + recibos de demo.
// sembrarDemo() es idempotente: borra y recrea solo lo de demo. La usan seed.ts y "Reiniciar demo" (Agente D).
import type { PrismaClient } from "@prisma/client";

type Rubro = "LUZ" | "AGUA" | "TELEFONIA" | "INTERNET";

export const SERVICIOS: { empresa: string; rubro: Rubro; formatoCodigo: string; ayudaCodigo: string }[] = [
  { empresa: "Enosa", rubro: "LUZ", formatoCodigo: "^\\d{8}$", ayudaCodigo: "Número de suministro, arriba a la derecha del recibo" },
  { empresa: "EPS Grau", rubro: "AGUA", formatoCodigo: "^\\d{7}$", ayudaCodigo: "Código de suministro, debajo de tu nombre" },
  { empresa: "Movistar", rubro: "TELEFONIA", formatoCodigo: "^\\d{9}$", ayudaCodigo: "Número de servicio, en el recuadro superior" },
  { empresa: "Claro", rubro: "INTERNET", formatoCodigo: "^\\d{10}$", ayudaCodigo: "Código de cliente, junto al logo" },
];

export type Empresa = "Enosa" | "EPS Grau" | "Movistar" | "Claro";

/** Crea o actualiza los 4 servicios. Devuelve { empresa → id }. */
export async function asegurarServicios(prisma: PrismaClient): Promise<Record<Empresa, number>> {
  const ids = {} as Record<Empresa, number>;
  for (const s of SERVICIOS) {
    const existente = await prisma.servicio.findFirst({ where: { empresa: s.empresa } });
    const r = existente
      ? await prisma.servicio.update({ where: { id: existente.id }, data: s })
      : await prisma.servicio.create({ data: s });
    ids[s.empresa as Empresa] = r.id;
  }
  return ids;
}

/** Hoy a las 00:00 UTC. */
export function hoyUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
const masDias = (d: Date, dias: number) => new Date(d.getTime() + dias * 86400000);
/** Misma fecha desplazada n meses (día acotado a 28 para no saltar de mes). */
const masMeses = (d: Date, meses: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, Math.min(d.getUTCDate(), 28)));

type DemoCliente = {
  dni: string;
  nombre: string;
  apellido: string;
  edad: number;
  ocupacion: "COMERCIANTE" | "AGRICULTOR" | "TRANSPORTISTA" | "OTRO";
  zona: "RURAL" | "URBANA";
  distrito: string;
  presenciales: number;
  digitales: number;
  gama: "BAJA" | "MEDIA" | "ALTA";
  cuentaTipo: string;
  saldo: number;
  /** Cuentas adicionales (para elegir la cuenta de origen, como en la app oficial). */
  otrasCuentas?: { tipo: string; saldo: number }[];
  credito: string;
  totalCuotas: number;
  montoCuota: number;
  pagadas: number;
  diasSiguiente: number;
  frecuentes: { alias: string; empresa: Empresa; codigo: string; esPropio: boolean; titular: string; monto: number; dias: number }[];
};

export const CLIENTES_DEMO: DemoCliente[] = [
  {
    dni: "40000001", nombre: "Rosa", apellido: "Huamán", edad: 63, ocupacion: "COMERCIANTE", zona: "URBANA", distrito: "Castilla",
    presenciales: 9, digitales: 0, gama: "BAJA", cuentaTipo: "Ahorro emprendedor", saldo: 1200, otrasCuentas: [{ tipo: "Ahorro corriente", saldo: 280 }, { tipo: "CTS", saldo: 3500 }, { tipo: "Depósito a plazo fijo", saldo: 5000 }],
    credito: "0012345", totalCuotas: 12, montoCuota: 350, pagadas: 7, diasSiguiente: 3,
    frecuentes: [{ alias: "Luz de mamá", empresa: "Enosa", codigo: "45781236", esPropio: false, titular: "MARIA PEREZ", monto: 85.4, dias: 5 }],
  },
  {
    dni: "40000002", nombre: "Elena", apellido: "Quispe", edad: 47, ocupacion: "AGRICULTOR", zona: "RURAL", distrito: "Tambogrande",
    presenciales: 6, digitales: 1, gama: "BAJA", cuentaTipo: "Ahorro", saldo: 600, otrasCuentas: [{ tipo: "Ahorro corriente", saldo: 150 }],
    credito: "0023456", totalCuotas: 10, montoCuota: 280, pagadas: 3, diasSiguiente: 10,
    frecuentes: [],
  },
  {
    dni: "40000003", nombre: "Carlos", apellido: "Rojas", edad: 35, ocupacion: "TRANSPORTISTA", zona: "URBANA", distrito: "Piura",
    presenciales: 1, digitales: 14, gama: "MEDIA", cuentaTipo: "Ahorro", saldo: 3000, otrasCuentas: [{ tipo: "Cuenta sueldo", saldo: 850 }, { tipo: "CTS", saldo: 2100 }],
    credito: "0034567", totalCuotas: 24, montoCuota: 520, pagadas: 15, diasSiguiente: 20,
    frecuentes: [
      { alias: "Mi celular", empresa: "Movistar", codigo: "987654321", esPropio: true, titular: "CARLOS ROJAS", monto: 59.9, dias: 2 },
      { alias: "Internet casa", empresa: "Claro", codigo: "4455667788", esPropio: true, titular: "CARLOS ROJAS", monto: 99, dias: 12 },
    ],
  },
  {
    dni: "40000004", nombre: "Pedro", apellido: "Silva", edad: 52, ocupacion: "TRANSPORTISTA", zona: "RURAL", distrito: "Chulucanas",
    presenciales: 5, digitales: 2, gama: "BAJA", cuentaTipo: "Ahorro", saldo: 15, otrasCuentas: [{ tipo: "Ahorro corriente", saldo: 320 }],
    credito: "0045678", totalCuotas: 8, montoCuota: 210, pagadas: 2, diasSiguiente: 1,
    frecuentes: [],
  },
];

/** Recibos sueltos para la ruta C (foto del recibo). El Agente C genera las imágenes con estos datos. */
export const RECIBOS_DEMO: { empresa: Empresa; codigo: string; titular: string; monto: number; dias: number; imagenKey: string }[] = [
  { empresa: "Enosa", codigo: "31264587", titular: "ELENA QUISPE", monto: 72.3, dias: 6, imagenKey: "demo/recibo-enosa.jpg" },
  { empresa: "EPS Grau", codigo: "2045871", titular: "ELENA QUISPE", monto: 38.5, dias: 9, imagenKey: "demo/recibo-epsgrau.jpg" },
  { empresa: "Movistar", codigo: "912345678", titular: "JUAN CHAVEZ", monto: 45, dias: 4, imagenKey: "demo/recibo-movistar.jpg" },
];

export const CLAVE_DEMO = "123456";

/** Borra y recrea los clientes demo (y todo lo suyo) y los recibos de demo. Idempotente. */
export async function sembrarDemo(prisma: PrismaClient) {
  const servicios = await asegurarServicios(prisma);
  const hoy = hoyUTC();
  const dnis = CLIENTES_DEMO.map((c) => c.dni);

  // 1. Borrar lo anterior (orden explícito para no depender de cascadas).
  const previos = await prisma.cliente.findMany({ where: { OR: [{ esDemo: true }, { dni: { in: dnis } }] }, select: { id: true } });
  const ids = previos.map((c) => c.id);
  if (ids.length) {
    const where = { clienteId: { in: ids } };
    await prisma.pago.deleteMany({ where });
    await prisma.punto.deleteMany({ where });
    await prisma.evento.deleteMany({ where });
    await prisma.frecuente.deleteMany({ where });
    await prisma.cuota.deleteMany({ where });
    await prisma.cuenta.deleteMany({ where });
    await prisma.cliente.deleteMany({ where: { id: { in: ids } } });
  }
  const codigosRecibo = [
    ...CLIENTES_DEMO.flatMap((c) => c.frecuentes.map((f) => ({ servicioId: servicios[f.empresa], codigo: f.codigo }))),
    ...RECIBOS_DEMO.map((r) => ({ servicioId: servicios[r.empresa], codigo: r.codigo })),
  ];
  await prisma.recibo.deleteMany({ where: { OR: codigosRecibo } });

  // 2. Recrear.
  for (const [i, c] of CLIENTES_DEMO.entries()) {
    const vencSiguiente = masDias(hoy, c.diasSiguiente);
    const cliente = await prisma.cliente.create({
      data: {
        dni: c.dni,
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
    });
    await prisma.cuenta.create({
      data: { clienteId: cliente.id, numero: `0011020000${String(i + 1).padStart(4, "0")}`, tipo: c.cuentaTipo, saldo: c.saldo },
    });
    for (const [k, o] of (c.otrasCuentas ?? []).entries()) {
      await prisma.cuenta.create({
        data: { clienteId: cliente.id, numero: `0011030000${String(i + 1).padStart(2, "0")}${String(k + 1).padStart(2, "0")}`, tipo: o.tipo, saldo: o.saldo },
      });
    }
    // Cuotas: la n.º (pagadas + 1) vence en vencSiguiente; el resto, mes a mes.
    await prisma.cuota.createMany({
      data: Array.from({ length: c.totalCuotas }, (_, k) => {
        const numero = k + 1;
        const offset = numero - (c.pagadas + 1);
        const vencimiento = offset === 0 ? vencSiguiente : masMeses(vencSiguiente, offset);
        return {
          clienteId: cliente.id,
          credito: c.credito,
          numero,
          totalCuotas: c.totalCuotas,
          monto: c.montoCuota,
          vencimiento,
          estado: numero <= c.pagadas ? ("PAGADA" as const) : ("PENDIENTE" as const),
        };
      }),
    });
    for (const f of c.frecuentes) {
      await prisma.frecuente.create({
        data: { clienteId: cliente.id, alias: f.alias, servicioId: servicios[f.empresa], codigo: f.codigo, esPropio: f.esPropio },
      });
      await prisma.recibo.create({
        data: { codigo: f.codigo, servicioId: servicios[f.empresa], titular: f.titular, monto: f.monto, vencimiento: masDias(hoy, f.dias) },
      });
    }
  }
  for (const r of RECIBOS_DEMO) {
    await prisma.recibo.create({
      data: {
        codigo: r.codigo,
        servicioId: servicios[r.empresa],
        titular: r.titular,
        monto: r.monto,
        vencimiento: masDias(hoy, r.dias),
        imagenKey: r.imagenKey,
      },
    });
  }
}
