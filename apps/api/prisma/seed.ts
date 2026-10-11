// Dueño: Agente A. Genera 500 perfiles ficticios + clientes demo fijos (esDemo = true).
// Se puede correr varias veces: limpia antes. Uso: npm run db:seed (desde la raíz).
import { fakerES as faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";
import { asegurarServicios, hoyUTC, SERVICIOS, sembrarDemo, type Empresa } from "./demo.js";

const prisma = new PrismaClient();
faker.seed(13); // reproducible

const NOMBRES_M = ["José", "Juan", "Luis", "Carlos", "Jorge", "Miguel", "Víctor", "Manuel", "César", "Pedro", "Segundo", "Wilmer", "Santos", "Alberto", "Julio", "Raúl", "Hugo", "Óscar", "Fernando", "Marco", "Jhon", "Ángel", "Félix", "Eduardo", "Walter"];
const NOMBRES_F = ["María", "Rosa", "Ana", "Carmen", "Juana", "Elena", "Luz", "Gladys", "Milagros", "Teresa", "Flor", "Yolanda", "Silvia", "Patricia", "Nelly", "Doris", "Lucía", "Marleny", "Sonia", "Isabel", "Liliana", "Karina", "Socorro", "Mercedes", "Delia"];
const APELLIDOS = ["Huamán", "Quispe", "Chávez", "Mendoza", "Zapata", "Ramírez", "Castillo", "Sosa", "Ipanaqué", "Chunga", "Yarlequé", "Querevalú", "Saavedra", "Timaná", "Alvarado", "Flores", "García", "Rojas", "Silva", "Córdova", "Morales", "Jiménez", "Vílchez", "Peña", "Seminario", "Atoche", "Sernaqué", "Ruiz", "Távara", "Carrasco", "Purizaca", "Llacsahuanga", "Agurto", "Juárez", "Palacios"];
const DISTRITOS_URBANOS = ["Piura", "Castilla", "Veintiséis de Octubre", "Sullana", "Paita", "Talara"];
const DISTRITOS_RURALES = ["Chulucanas", "Catacaos", "Tambogrande", "Morropón", "La Arena", "Las Lomas", "Sechura", "Ayabaca"];

const pick = <T,>(xs: readonly T[]) => faker.helpers.arrayElement(xs);
const entre = (min: number, max: number) => faker.number.int({ min, max });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** Normal aproximada (suma de uniformes). */
const normal = (media: number, desv: number) => media + desv * ((Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73);

const masMeses = (d: Date, meses: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, Math.min(d.getUTCDate(), 28)));
const masDias = (d: Date, dias: number) => new Date(d.getTime() + dias * 86400000);

type Ocupacion = "COMERCIANTE" | "AGRICULTOR" | "TRANSPORTISTA" | "OTRO";
type Gama = "BAJA" | "MEDIA" | "ALTA";

function codigoPara(empresa: Empresa) {
  const fmt = SERVICIOS.find((s) => s.empresa === empresa)!.formatoCodigo;
  const n = Number(fmt.match(/\d+/)![0]);
  return String(entre(1, 9)) + faker.string.numeric(n - 1);
}

async function enLotes<T>(datos: T[], tam: number, fn: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < datos.length; i += tam) await fn(datos.slice(i, i + tam));
}

async function main() {
  Math.random = () => faker.number.float({ min: 0, max: 1 }); // reproducible también en normal()
  const t0 = Date.now();
  console.log("Limpiando datos…");
  await prisma.pago.deleteMany();
  await prisma.cashback.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.frecuente.deleteMany();
  await prisma.cuota.deleteMany();
  await prisma.cuenta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.recibo.deleteMany();

  const servicios = await asegurarServicios(prisma);
  const hoy = hoyUTC();

  console.log("Generando 500 perfiles…");
  const dnis = new Set<string>();
  const perfiles: Prisma.ClienteCreateManyInput[] = [];
  for (let i = 0; i < 500; i++) {
    let dni: string;
    do dni = "7" + faker.string.numeric(7);
    while (dnis.has(dni));
    dnis.add(dni);

    const ocupacion = faker.helpers.weightedArrayElement<Ocupacion>([
      { value: "COMERCIANTE", weight: 45 },
      { value: "AGRICULTOR", weight: 25 },
      { value: "TRANSPORTISTA", weight: 20 },
      { value: "OTRO", weight: 10 },
    ]);
    // Rural ~35% en total: los agricultores casi siempre rurales.
    const pRural = ocupacion === "AGRICULTOR" ? 0.85 : ocupacion === "TRANSPORTISTA" ? 0.2 : 0.17;
    const rural = Math.random() < pRural;
    const edad = Math.round(clamp(normal(ocupacion === "TRANSPORTISTA" ? 40 : 47, 13), 22, 75));
    // Gama: más baja con edad y zona rural.
    const pBaja = clamp(0.35 + (edad - 40) * 0.012 + (rural ? 0.2 : 0), 0.15, 0.9);
    const gama: Gama = Math.random() < pBaja ? "BAJA" : Math.random() < 0.85 ? "MEDIA" : "ALTA";
    // Uso digital: correlacionado con edad, zona y gama.
    const propension = clamp(
      0.8 - (edad - 22) * 0.013 - (rural ? 0.18 : 0) - (gama === "BAJA" ? 0.1 : gama === "ALTA" ? -0.1 : 0) + normal(0, 0.15),
      0,
      0.98,
    );
    const total = entre(3, 18);
    const opsDigitalesMes = Math.round(total * propension);
    const opsPresencialesMes = total - opsDigitalesMes;
    const mujer = Math.random() < 0.5;

    perfiles.push({
      dni,
      nombre: pick(mujer ? NOMBRES_F : NOMBRES_M),
      apellido: `${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
      edad,
      ocupacion,
      zona: rural ? "RURAL" : "URBANA",
      distrito: pick(rural ? DISTRITOS_RURALES : DISTRITOS_URBANOS),
      opsPresencialesMes,
      opsDigitalesMes,
      gamaDispositivo: gama,
      diaPagoHabitual: entre(1, 28),
      claveDemo: faker.string.numeric(6),
      fechaSimulada: hoy,
      pagosSinAyuda: Math.round(opsDigitalesMes * Math.random() * 0.6),
      esDemo: false,
    });
  }
  await enLotes(perfiles, 250, (lote) => prisma.cliente.createMany({ data: lote }));
  const clientes = await prisma.cliente.findMany({ where: { esDemo: false }, select: { id: true, ocupacion: true, nombre: true, apellido: true, diaPagoHabitual: true } });

  const cuentas: Prisma.CuentaCreateManyInput[] = [];
  const cuotas: Prisma.CuotaCreateManyInput[] = [];
  const frecuentes: Prisma.FrecuenteCreateManyInput[] = [];
  const recibos: Prisma.ReciboCreateManyInput[] = [];
  const codigosUsados = new Set<string>(["45781236", "987654321", "4455667788", "31264587", "2045871", "912345678"]);

  clientes.forEach((c, i) => {
    cuentas.push({
      clienteId: c.id,
      numero: `0011010${String(i + 1).padStart(7, "0")}`,
      tipo: c.ocupacion === "COMERCIANTE" ? "Ahorro emprendedor" : "Ahorro",
      saldo: faker.number.float({ min: 20, max: 6000, fractionDigits: 2 }),
    });
    // Segunda cuenta: así cualquiera puede probar «Cambiar cuenta» y las transferencias entre cuentas propias.
    cuentas.push({ clienteId: c.id, numero: `0011040${String(i + 1).padStart(7, "0")}`, tipo: "Ahorro corriente", saldo: faker.number.float({ min: 50, max: 800, fractionDigits: 2 }) });

    const totalCuotas = pick([6, 8, 10, 12, 12, 18, 24]);
    const pagadas = entre(0, totalCuotas - 1);
    const base = { COMERCIANTE: [200, 900], AGRICULTOR: [150, 600], TRANSPORTISTA: [300, 1200], OTRO: [150, 700] }[c.ocupacion];
    const monto = Math.round(entre(base[0], base[1]) / 10) * 10;
    const credito = "00" + faker.string.numeric(5);
    const siguiente = masDias(hoy, entre(0, 30));
    for (let k = 1; k <= totalCuotas; k++) {
      cuotas.push({
        clienteId: c.id,
        credito,
        numero: k,
        totalCuotas,
        monto,
        vencimiento: masMeses(siguiente, k - (pagadas + 1)),
        estado: k <= pagadas ? "PAGADA" : "PENDIENTE",
      });
    }

    const nFrec = faker.helpers.weightedArrayElement([
      { value: 0, weight: 40 },
      { value: 1, weight: 40 },
      { value: 2, weight: 20 },
    ]);
    const empresas = faker.helpers.arrayElements<Empresa>(["Enosa", "EPS Grau", "Movistar", "Claro"], nFrec);
    for (const empresa of empresas) {
      let codigo: string;
      do codigo = codigoPara(empresa);
      while (codigosUsados.has(codigo));
      codigosUsados.add(codigo);
      const esPropio = Math.random() < 0.7;
      const alias = {
        Enosa: esPropio ? "Luz de mi casa" : pick(["Luz de mamá", "Luz del puesto", "Luz de mi hija"]),
        "EPS Grau": esPropio ? "Agua de mi casa" : pick(["Agua de mamá", "Agua del local"]),
        Movistar: esPropio ? "Mi celular" : pick(["Celular de mi hijo", "Celular de papá"]),
        Claro: esPropio ? "Internet casa" : "Internet de mi hija",
      }[empresa];
      frecuentes.push({ clienteId: c.id, alias, servicioId: servicios[empresa], codigo, esPropio });
      const monto = { Enosa: [35, 180], "EPS Grau": [20, 90], Movistar: [29, 89], Claro: [59, 149] }[empresa];
      recibos.push({
        codigo,
        servicioId: servicios[empresa],
        titular: esPropio ? `${c.nombre} ${c.apellido.split(" ")[0]}`.toUpperCase() : `${pick([...NOMBRES_F, ...NOMBRES_M])} ${pick(APELLIDOS)}`.toUpperCase(),
        monto: faker.number.float({ min: monto[0], max: monto[1], fractionDigits: 2 }),
        vencimiento: masDias(hoy, entre(1, 25)),
      });
    }
  });

  await enLotes(cuentas, 500, (l) => prisma.cuenta.createMany({ data: l }));
  await enLotes(cuotas, 1000, (l) => prisma.cuota.createMany({ data: l }));
  await enLotes(frecuentes, 500, (l) => prisma.frecuente.createMany({ data: l }));
  await enLotes(recibos, 500, (l) => prisma.recibo.createMany({ data: l }));

  console.log("Sembrando clientes demo…");
  await sembrarDemo(prisma);

  const [nCli, nCuo, nFre, nRec] = await Promise.all([prisma.cliente.count(), prisma.cuota.count(), prisma.frecuente.count(), prisma.recibo.count()]);
  console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${nCli} clientes, ${nCuo} cuotas, ${nFre} frecuentes, ${nRec} recibos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
