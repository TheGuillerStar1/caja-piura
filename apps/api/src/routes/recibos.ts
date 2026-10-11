// Dueño: Agente C. Contratos de request/response en @cp/shared.
// Ruta C: foto del recibo → R2 (privado) → Groq visión (solo el código) → consulta del monto REAL en Caja Piura.
import type { LeerReciboRes, ReciboRes } from "@cp/shared";
import type { Prisma } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { HttpError } from "../lib/errores.js";
import { aNumero, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { leerArchivo, PREFIJO_SUBIDAS, subirArchivo, urlDemo } from "../lib/r2.js";
import { requiereSesion } from "../lib/sesion.js";
import { type Lectura, leerRecibo } from "../ia/leerRecibo.js";
import { demoPorCodigo, demoPorImagen, demoPorKey, demoPorNombreArchivo, NO_PUDE, type ReciboDemoConocido, resolverLectura } from "../ia/respaldoRecibos.js";
import { RECIBOS_DEMO, venceReciboDemo } from "../../prisma/demo.js";

export const router = Router();


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

/** Recibos de ejemplo de la ruta C. Salen de la lista fija de demo: no dependen de la base ni de un seed reciente. */
router.get("/recibos/demo", requiereSesion, async (_req, res) => {
  res.json(RECIBOS_DEMO.map((r) => ({ key: r.imagenKey, empresa: r.empresa, url: urlDemo(r.imagenKey) })));
});

/** Servicios para "Escribir el código" (empresa, rubro, formato y ayuda). Fuera del contrato: tipo local en la web. */
router.get("/recibos/servicios", requiereSesion, async (_req, res) => {
  const s = await prisma.servicio.findMany({ orderBy: { id: "asc" } });
  res.json(s.map((x) => ({ id: x.id, empresa: x.empresa, rubro: x.rubro, formatoCodigo: x.formatoCodigo, ayudaCodigo: x.ayudaCodigo })));
});

router.post("/recibos/leer", requiereSesion, imagenOpcional, async (req, res) => {
  let imagen: Buffer | null = null;
  let mime = "image/jpeg";
  /** Recibo de demo reconocido (por demoKey, huella de la imagen o nombre del archivo): respaldo si la IA falla. */
  let demo: ReciboDemoConocido | null = null;
  if (req.file) {
    imagen = req.file.buffer;
    mime = req.file.mimetype;
    demo = (await demoPorImagen(imagen)) ?? demoPorNombreArchivo(req.file.originalname);
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
    demo = demoPorKey(demoKey);
    try {
      imagen = await leerArchivo(demoKey);
    } catch (e) {
      // Sin la imagen (R2 caído) un recibo de demo igual se resuelve con su código conocido.
      if (!demo) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos ese recibo de ejemplo");
      console.warn("[recibos] R2 no respondió, uso el recibo de demo conocido:", (e as Error).message?.slice(0, 120));
    }
    if (demoKey.endsWith(".png")) mime = "image/png";
  }

  // La foto del cliente se guarda en privado (subidas/), nunca se expone por URL. No bloquea la lectura.
  if (req.file && imagen) {
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    subirArchivo(`${PREFIJO_SUBIDAS}${req.clienteId}/${Date.now()}.${ext}`, imagen, mime).catch((e) =>
      console.warn("[recibos] no se pudo subir a R2:", (e as Error).message?.slice(0, 120)),
    );
  }

  const servicios = await prisma.servicio.findMany({ select: { id: true, empresa: true, formatoCodigo: true } });
  const t0 = Date.now();
  // Recibo de demo: límite más corto (hay respaldo seguro). Foto real: un poco más de margen.
  const lectura: Lectura = imagen ? await leerRecibo(imagen, mime, servicios, demo ? 6_000 : 8_000) : { ok: false, razon: "SIN_IMAGEN" };
  console.log(`[recibos] lectura en ${Date.now() - t0} ms → ${lectura.ok ? `${lectura.empresa} ${lectura.codigo}` : lectura.razon}`);

  const r = resolverLectura(lectura, demo, servicios);
  if (demo && r.ok && (!lectura.ok || lectura.codigo !== r.codigo)) console.log(`[recibos] respaldo de demo → ${r.empresa} ${r.codigo}`);
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
  const buscar = () =>
    prisma.recibo.findFirst({
      where: { codigo, pagado: false, ...(servicioId !== undefined ? { servicioId } : {}) },
      include: { servicio: true },
      orderBy: { vencimiento: "asc" },
    });
  let recibo = await buscar();
  if (!recibo && (await reponerReciboDemo(codigo, servicioId, req.clienteId!))) recibo = await buscar();
  if (!recibo) throw new HttpError(404, "NO_HAY_DEUDA", "Este recibo no tiene deuda pendiente");
  res.json(aReciboRes(recibo));
});

/**
 * Recibos de ejemplo de la ruta C que siempre funcionan: si ya lo pagó OTRO cliente de demo (p. ej. Rosa y luego Elena
 * prueban el mismo recibo) o falta en la base, vuelve a quedar pendiente. Si lo pagó este mismo cliente, se respeta
 * "no tiene deuda" (es lo real). "Reiniciar demo" también los restaura. Devuelve true si cambió algo.
 */
async function reponerReciboDemo(codigo: string, servicioId: number | undefined, clienteId: number): Promise<boolean> {
  const servicio = servicioId !== undefined ? await prisma.servicio.findUnique({ where: { id: servicioId } }) : null;
  const demo = demoPorCodigo(codigo, servicio?.empresa);
  if (!demo) return false;
  const s = servicio ?? (await prisma.servicio.findFirst({ where: { empresa: demo.empresa } }));
  if (!s) return false;
  const ultimo = await prisma.recibo.findFirst({ where: { servicioId: s.id, codigo }, orderBy: { vencimiento: "desc" } });
  if (!ultimo) {
    await prisma.recibo.create({
      data: { codigo, servicioId: s.id, titular: demo.titular, monto: demo.monto, vencimiento: venceReciboDemo(demo), imagenKey: demo.imagenKey },
    });
    return true;
  }
  const pagoPropio = await prisma.pago.findFirst({ where: { clienteId, tipo: "RECIBO", referenciaId: ultimo.id, estado: "EXITOSO" }, select: { id: true } });
  if (pagoPropio) return false;
  await prisma.recibo.update({ where: { id: ultimo.id }, data: { pagado: false } });
  return true;
}

type ReciboConServicio =Prisma.ReciboGetPayload<{ include: { servicio: true } }>;
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
