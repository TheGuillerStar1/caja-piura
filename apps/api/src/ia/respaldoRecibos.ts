// Dueño: Agente G (F3). Respaldo de la ruta C para la demo en vivo: si Groq falla, tarda o lee mal un recibo de demo,
// se usa el código conocido del recibo de demo (por demoKey, por huella SHA-256 de la imagen o por el nombre del archivo).
// Nunca se inventa un código para una foto real: en ese caso se pide escribir el código con guía.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { LeerReciboRes } from "@cp/shared";
import { RECIBOS_DEMO } from "../../prisma/demo.js";
import type { Lectura } from "./leerRecibo.js";
import { normalizar } from "./texto.js";

export type ReciboDemoConocido = (typeof RECIBOS_DEMO)[number];

export const NO_PUDE = "No pude leer el código. Toma otra foto con buena luz o escribe el código.";
/** La web (pagar/recibo) reconoce este inicio para poner primero "Escribir el código". */
export const NO_DISPONIBLE = "Ahora no puedo leer fotos. Escribe el código del recibo: yo te guío paso a paso.";

/** Recibo de demo por su clave en R2 ("demo/recibo-enosa.jpg"). */
export function demoPorKey(key: string | undefined | null): ReciboDemoConocido | null {
  if (!key) return null;
  return RECIBOS_DEMO.find((r) => r.imagenKey === key) ?? null;
}

/** Recibo de demo por (servicio, código) o solo código. */
export function demoPorCodigo(codigo: string, empresa?: string): ReciboDemoConocido | null {
  return RECIBOS_DEMO.find((r) => r.codigo === codigo && (!empresa || r.empresa === empresa)) ?? null;
}

/** Recibo de demo por el nombre del archivo subido ("recibo-enosa.jpg", "Recibo EPS Grau (1).jpeg"…). */
export function demoPorNombreArchivo(nombre: string | undefined | null): ReciboDemoConocido | null {
  const n = normalizar(nombre ?? "").replace(/ /g, "");
  if (!n.includes("recibo")) return null;
  return (
    RECIBOS_DEMO.find((r) => {
      const base = normalizar(r.imagenKey.replace(/^demo\//, "").replace(/\.\w+$/, "")).replace(/ /g, ""); // "reciboenosa"
      return n.includes(base);
    }) ?? null
  );
}

// Huellas de las imágenes de demo que viven en el repo (apps/api/prisma/demo-recibos). Se calculan una vez.
let huellas: Promise<Map<string, ReciboDemoConocido>> | null = null;
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function cargarHuellas() {
  huellas ??= (async () => {
    const mapa = new Map<string, ReciboDemoConocido>();
    try {
      const dir = new URL("../../prisma/demo-recibos/", import.meta.url);
      for (const archivo of await readdir(dir)) {
        const r = RECIBOS_DEMO.find((x) => x.imagenKey === `demo/${archivo}`);
        if (r) mapa.set(sha(await readFile(new URL(archivo, dir))), r);
      }
    } catch (e) {
      console.warn("[respaldoRecibos] sin huellas de demo:", (e as Error).message?.slice(0, 120));
    }
    return mapa;
  })();
  return huellas;
}

/** Recibo de demo si la imagen es exactamente uno de los archivos de demo. */
export async function demoPorImagen(imagen: Buffer): Promise<ReciboDemoConocido | null> {
  return (await cargarHuellas()).get(sha(imagen)) ?? null;
}

/** Decide qué responder: lectura de la IA, o el recibo de demo conocido si la IA falló o leyó otro código. */
export function resolverLectura(lectura: Lectura, demo: ReciboDemoConocido | null, servicios: { id: number; empresa: string }[]): LeerReciboRes {
  if (demo) {
    const s = servicios.find((x) => x.empresa === demo.empresa);
    if (s) return { ok: true, codigo: demo.codigo, servicioId: s.id, empresa: s.empresa };
  }
  if (lectura.ok) return { ok: true, codigo: lectura.codigo, servicioId: lectura.servicioId, empresa: lectura.empresa };
  // La IA no está disponible (caída, lenta o sin llave): la foto no es el problema, mejor escribir el código.
  const sinIA = ["TIMEOUT", "ERROR", "SIN_GROQ", "SIN_IMAGEN"].includes(lectura.razon);
  return { ok: false, motivo: sinIA ? NO_DISPONIBLE : NO_PUDE };
}
