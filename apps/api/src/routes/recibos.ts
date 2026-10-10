// Dueño: Agente C. Contratos de request/response en @cp/shared.
// Ruta C: foto del recibo → R2 (privado) → Groq visión (solo el código) → consulta del monto REAL en Caja Piura.
import type { LeerReciboRes, ReciboRes } from "@cp/shared";
import type { Prisma } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { HttpError } from "../lib/errores.js";
import { aNumero, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { leerArchivo, PREFIJO_DEMO, PREFIJO_SUBIDAS, subirArchivo, urlDemo } from "../lib/r2.js";
import { requiereSesion } from "../lib/sesion.js";
import { leerRecibo } from "../ia/leerRecibo.js";

export const router = Router();

const NO_PUDE = "No pude leer el código. Toma otra foto con buena luz o escribe el código.";
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, TIPOS.includes(file.mimetype)),
});

/** multer solo si es multipart; sus errores (p. ej. foto muy pesada) se vuelven ok:false. */
const imagenOpcional: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  subida.single("imagen")(req, res, (err: unknown) => {
    if (err) {
      const r: LeerReciboRes = {
        ok: false,
        motivo: (err as { code?: string }).code === "LIMIT_FILE_SIZE" ? "La foto pesa mucho. Toma otra foto o escribe el código." : NO_PUDE,
      };
      res.json(r);
      return;
    }
    next();
  });
};

/** Recibos de ejemplo de respaldo si la base aún no tiene imagenKey. */
const DEMO_RESPALDO = [
  { key: "demo/recibo-enosa.jpg", empresa: "Enosa" },
  { key: "demo/recibo-epsgrau.jpg", empresa: "EPS Grau" },
  { key: "demo/recibo-movistar.jpg", empresa: "Movistar" },
];

router.get("/recibos/demo", requiereSesion, async (_req, res) => {
  const recibos = await prisma.recibo.findMany({
    where: { imagenKey: { not: null } },
    include: { servicio: true },
    orderBy: { id: "asc" },
  });
  const vistos = new Set<string>();
  const lista = recibos
    .filter((r) => r.imagenKey!.startsWith(PREFIJO_DEMO) && !vistos.has(r.imagenKey!) && vistos.add(r.imagenKey!))
    .map((r) => ({ key: r.imagenKey!, empresa: r.servicio.empresa }));
  res.json((lista.length ? lista : DEMO_RESPALDO).map((d) => ({ ...d, url: urlDemo(d.key) })));
});

/** Servicios para "Escribir el código" (empresa, rubro, formato y ayuda). Fuera del contrato: tipo local en la web. */
router.get("/recibos/servicios", requiereSesion, async (_req, res) => {
  const s = await prisma.servicio.findMany({ orderBy: { id: "asc" } });
  res.json(s.map((x) => ({ id: x.id, empresa: x.empresa, rubro: x.rubro, formatoCodigo: x.formatoCodigo, ayudaCodigo: x.ayudaCodigo })));
});

router.post("/recibos/leer", requiereSesion, imagenOpcional, async (req, res) => {
  let imagen: Buffer;
  let mime = "image/jpeg";
  if (req.file) {
    imagen = req.file.buffer;
    mime = req.file.mimetype;
  } else {
    const demoKey = typeof req.body?.demoKey === "string" ? req.body.demoKey : "";
    if (!/^demo\/[a-z0-9-]+\.(jpe?g|png|webp)$/.test(demoKey)) {
      if (req.is("multipart/form-data")) {
        // Llegó multipart pero sin imagen válida (tipo no permitido o campo vacío).
        const r: LeerReciboRes = { ok: false, motivo: NO_PUDE };
        res.json(r);
        return;
      }
      throw new HttpError(400, "VALIDACION", "Envía una foto (campo imagen) o un recibo de ejemplo (demoKey)");
    }
    try {
      imagen = await leerArchivo(demoKey);
    } catch {
      throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese recibo de ejemplo");
    }
    if (demoKey.endsWith(".png")) mime = "image/png";
  }

  // La foto del cliente se guarda en privado (subidas/), nunca se expone por URL. No bloquea la lectura.
  if (req.file) {
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    subirArchivo(`${PREFIJO_SUBIDAS}${req.clienteId}/${Date.now()}.${ext}`, imagen, mime).catch((e) =>
      console.warn("[recibos] no se pudo subir a R2:", (e as Error).message?.slice(0, 120)),
    );
  }

  const servicios = await prisma.servicio.findMany({ select: { id: true, empresa: true, formatoCodigo: true } });
  const t0 = Date.now();
  const lectura = await leerRecibo(imagen, mime, servicios);
  console.log(`[recibos] lectura en ${Date.now() - t0} ms → ${lectura.ok ? `${lectura.empresa} ${lectura.codigo}` : lectura.razon}`);
  const r: LeerReciboRes = lectura.ok
    ? { ok: true, codigo: lectura.codigo, servicioId: lectura.servicioId, empresa: lectura.empresa }
    : { ok: false, motivo: NO_PUDE };
  res.json(r);
});

/** Recibo por id (pagado o no). Lo usa "¿Lo guardo?" tras el pago para sugerir el alias según el rubro. */
router.get("/recibos/por-id/:id", requiereSesion, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "VALIDACION", "Recibo no válido");
  const recibo = await prisma.recibo.findUnique({ where: { id }, include: { servicio: true } });
  if (!recibo) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese recibo");
  res.json(aReciboRes(recibo));
});

router.get("/recibos/:codigo", requiereSesion, async (req, res) => {
  const codigo = String(req.params.codigo).replace(/\D/g, "");
  const servicioId = req.query.servicioId ? Number(req.query.servicioId) : undefined;
  if (!codigo || (servicioId !== undefined && !Number.isInteger(servicioId))) {
    throw new HttpError(400, "VALIDACION", "Revisa el código del recibo");
  }
  if (servicioId !== undefined) {
    const s = await prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!s) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos esa empresa");
    if (!new RegExp(s.formatoCodigo).test(codigo)) {
      throw new HttpError(400, "CODIGO_INVALIDO", `Revisa el código. ${s.ayudaCodigo}`);
    }
  }
  const recibo = await prisma.recibo.findFirst({
    where: { codigo, pagado: false, ...(servicioId !== undefined ? { servicioId } : {}) },
    include: { servicio: true },
    orderBy: { vencimiento: "asc" },
  });
  if (!recibo) throw new HttpError(404, "NO_HAY_DEUDA", "Este recibo no tiene deuda pendiente");
  res.json(aReciboRes(recibo));
});

type ReciboConServicio = Prisma.ReciboGetPayload<{ include: { servicio: true } }>;
function aReciboRes(recibo: ReciboConServicio): ReciboRes {
  return {
    id: recibo.id,
    codigo: recibo.codigo,
    empresa: recibo.servicio.empresa,
    rubro: recibo.servicio.rubro,
    titularOculto: ocultarNombre(recibo.titular),
    monto: aNumero(recibo.monto), // monto real de Caja Piura, nunca el de la foto
    vencimiento: recibo.vencimiento.toISOString(),
  };
}
