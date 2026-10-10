// Dueño: Agente A. Genera 500 perfiles ficticios + Rosa, Elena y Carlos fijos (esDemo = true).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed pendiente (Agente A)");
}

main().finally(() => prisma.$disconnect());
