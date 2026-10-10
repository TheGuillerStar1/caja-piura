import { Prisma, PrismaClient } from "@prisma/client";

// El proxy de MySQL de Railway cierra conexiones inactivas: la primera consulta después falla con P1017/P1001.
// Se reintenta una vez cualquier operación (fuera de transacciones) ante esos errores de conexión.
const ERRORES_CONEXION = new Set(["P1001", "P1002", "P1017"]);

const esErrorConexion = (e: unknown) =>
  (e instanceof Prisma.PrismaClientKnownRequestError && ERRORES_CONEXION.has(e.code)) ||
  (e instanceof Prisma.PrismaClientUnknownRequestError && /closed the connection|ECONNRESET/i.test(e.message));

/** Cliente sin extensión, para funciones que piden el tipo PrismaClient (p. ej. sembrarDemo). */
export const prismaBase = new PrismaClient();
const base = prismaBase;

export const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      try {
        return await query(args);
      } catch (e) {
        if (!esErrorConexion(e)) throw e;
        return await query(args);
      }
    },
  },
});
