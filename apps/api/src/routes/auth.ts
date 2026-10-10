// Dueño: Agente A. Contratos de request/response en @cp/shared.
// Biometría simulada: ROSTRO y HUELLA aceptan el DNI sin clave. CLAVE compara con claveDemo; 2 fallos → BLOQUEADO.
import { LoginReq, type ClienteDemo, type LoginRes } from "@cp/shared";
import { Router } from "express";
import { HttpError, validar } from "../lib/errores.js";
import { prisma } from "../lib/prisma.js";
import { cerrarSesion, iniciarSesion } from "../lib/sesion.js";

export const router = Router();

const MAX_INTENTOS = 2;
/** Intentos fallidos de clave por DNI (en memoria; se reinicia al entrar bien o al reiniciar la API). */
const fallos = new Map<string, number>();

const MENSAJE_BLOQUEO =
  "Por tu seguridad bloqueamos el ingreso con clave. Acércate a una agencia o llama al (073) 284-500 para recuperar tu clave.";

router.post("/auth/login", async (req, res) => {
  const body = validar(LoginReq, req.body);
  const cliente = await prisma.cliente.findUnique({ where: { dni: body.dni } });
  if (!cliente) throw new HttpError(404, "NO_EXISTE", "No encontramos ese DNI. Revisa los números o acércate a una agencia.");

  if (body.metodo === "CLAVE") {
    const n = fallos.get(body.dni) ?? 0;
    if (n >= MAX_INTENTOS) throw new HttpError(423, "BLOQUEADO", MENSAJE_BLOQUEO);
    if (body.clave !== cliente.claveDemo) {
      const total = n + 1;
      fallos.set(body.dni, total);
      if (total >= MAX_INTENTOS) throw new HttpError(423, "BLOQUEADO", MENSAJE_BLOQUEO);
      const intentosRestantes = MAX_INTENTOS - total;
      throw new HttpError(401, "CLAVE_INCORRECTA", `La clave no coincide. Te queda ${intentosRestantes} intento.`, { intentosRestantes });
    }
  }
  // Rostro/huella válidos (simulados) o clave correcta: se limpia el contador.
  fallos.delete(body.dni);
  iniciarSesion(res, cliente.id);
  const r: LoginRes = { ok: true, nombre: cliente.nombre, primerIngreso: cliente.primerIngreso };
  res.json(r);
});

router.post("/auth/logout", (_req, res) => {
  cerrarSesion(res);
  res.json({ ok: true });
});

const OCUPACION: Record<string, string> = { COMERCIANTE: "Comerciante", AGRICULTOR: "Agricultor", TRANSPORTISTA: "Transportista", OTRO: "Independiente" };

router.get("/auth/clientes-demo", async (_req, res) => {
  const demo = await prisma.cliente.findMany({ where: { esDemo: true }, orderBy: { dni: "asc" } });
  const r: ClienteDemo[] = demo.map((c) => {
    const ocup = c.ocupacion === "AGRICULTOR" && c.nombre === "Elena" ? "Agricultora" : OCUPACION[c.ocupacion];
    return {
      dni: c.dni,
      nombre: `${c.nombre} ${c.apellido}`,
      edad: c.edad,
      descripcion: `${ocup} · ${c.distrito} · ${c.zona === "RURAL" ? "zona rural" : "zona urbana"}`,
    };
  });
  res.json(r);
});
