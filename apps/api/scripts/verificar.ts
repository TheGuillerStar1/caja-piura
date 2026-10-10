// F0. Verifica conexiones: MySQL, R2 (subir/leer/borrar en el bucket privado) y Groq (modelos configurados).
// Uso: npx tsx --env-file=../../.env scripts/verificar.ts
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../src/lib/env.js";
import { groq } from "../src/lib/groq.js";
import { prisma } from "../src/lib/prisma.js";
import { leerArchivo, r2, subirArchivo } from "../src/lib/r2.js";

async function paso(nombre: string, fn: () => Promise<string>) {
  try {
    console.log(`✔ ${nombre}: ${await fn()}`);
  } catch (e) {
    console.log(`✘ ${nombre}: ${(e as Error).message}`);
  }
}

await paso("MySQL", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return `${await prisma.cliente.count()} clientes`;
});
await paso("R2", async () => {
  const key = "verificacion/prueba.txt";
  await subirArchivo(key, Buffer.from("ok"), "text/plain");
  const leido = (await leerArchivo(key)).toString();
  await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  return `subir/leer/borrar = ${leido}`;
});
await paso("Groq modelos", async () => {
  const lista = await groq.models.list();
  const ids = lista.data.map((m) => m.id);
  const t = ids.includes(env.GROQ_MODELO_TEXTO) ? "disponible" : "NO DISPONIBLE";
  const v = ids.includes(env.GROQ_MODELO_VISION) ? "disponible" : "NO DISPONIBLE";
  return `texto ${env.GROQ_MODELO_TEXTO} ${t} · visión ${env.GROQ_MODELO_VISION} ${v}`;
});
await prisma.$disconnect();
