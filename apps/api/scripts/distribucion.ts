// Dueño: Agente A. Imprime cuántos de los 500 perfiles ficticios quedan en cada vista según el motor.
// Uso (desde apps/api): npx dotenv -e ../../.env -- tsx scripts/distribucion.ts
import { PrismaClient } from "@prisma/client";
import { perfilDeCliente, recomendar } from "../src/motor/index.js";

const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({ where: { esDemo: false }, include: { _count: { select: { frecuentes: true } } } });
  const conteo = { ASISTIDA: 0, ESTANDAR: 0 };
  const tonos: Record<string, number> = {};
  const porEdad: Record<string, { ASISTIDA: number; ESTANDAR: number }> = {};
  for (const c of clientes) {
    const r = recomendar(perfilDeCliente(c, c._count.frecuentes > 0));
    conteo[r.vista]++;
    tonos[r.tono] = (tonos[r.tono] ?? 0) + 1;
    const tramo = c.edad < 35 ? "22-34" : c.edad < 55 ? "35-54" : c.edad < 65 ? "55-64" : "65+";
    porEdad[tramo] ??= { ASISTIDA: 0, ESTANDAR: 0 };
    porEdad[tramo][r.vista]++;
  }
  const pct = (n: number) => `${((n / clientes.length) * 100).toFixed(1)}%`;
  console.log(`Perfiles: ${clientes.length}`);
  console.log(`ASISTIDA: ${conteo.ASISTIDA} (${pct(conteo.ASISTIDA)}) · ESTANDAR: ${conteo.ESTANDAR} (${pct(conteo.ESTANDAR)})`);
  console.log("Tonos:", tonos);
  console.log("Por edad:", porEdad);
}

main().finally(() => prisma.$disconnect());
