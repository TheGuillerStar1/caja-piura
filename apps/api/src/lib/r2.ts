import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

// Cloudflare R2 vía API compatible con S3. Solo se usa desde el backend.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

export async function subirArchivo(key: string, cuerpo: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: cuerpo, ContentType: contentType }));
  return key;
}

export async function leerArchivo(key: string): Promise<Buffer> {
  const r = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  return Buffer.from(await r.Body!.transformToByteArray());
}

/** Prefijos: demo/ (recibos ficticios, se sirven por /api/archivos con sesión) · subidas/ (fotos de clientes, nunca se exponen). */
export const PREFIJO_DEMO = "demo/";
export const PREFIJO_SUBIDAS = "subidas/";

/** URL para mostrar un recibo de demo. Pasa por la API (requiere sesión); el bucket no es público. */
export function urlDemo(key: string) {
  return `/api/archivos/${key}`;
}
