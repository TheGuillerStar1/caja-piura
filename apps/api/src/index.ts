// F0. Registra todos los routers; los agentes implementan cada archivo en src/routes/ sin tocar este.
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./lib/env.js";
import { manejadorErrores } from "./lib/errores.js";
import { prisma } from "./lib/prisma.js";
import { leerArchivo } from "./lib/r2.js";
import { leerSesion, requiereSesion } from "./lib/sesion.js";
import { router as asistente } from "./routes/asistente.js";
import { router as auth } from "./routes/auth.js";
import { router as cuotas } from "./routes/cuotas.js";
import { router as demo } from "./routes/demo.js";
import { router as eventos } from "./routes/eventos.js";
import { router as frecuentes } from "./routes/frecuentes.js";
import { router as inicio } from "./routes/inicio.js";
import { router as me } from "./routes/me.js";
import { router as pagos } from "./routes/pagos.js";
import { router as panel } from "./routes/panel.js";
import { router as progreso } from "./routes/progreso.js";
import { router as recibos } from "./routes/recibos.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: "text/plain", limit: "200kb" })); // navigator.sendBeacon envía text/plain
app.use(cookieParser(env.SESSION_SECRET));
app.use(leerSesion);

app.get("/health", async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {}
  res.json({ ok: true, db, groq: Boolean(env.GROQ_API_KEY), r2: Boolean(env.R2_BUCKET) });
});

// Proxy de lectura de R2. El bucket es PRIVADO: solo se sirven recibos ficticios de demo (prefijo demo/) y con sesión.
// Las fotos que suben los clientes van a subidas/ y nunca se exponen por URL.
app.get("/archivos/*key", requiereSesion, async (req, res) => {
  const key = ([] as string[]).concat(req.params.key as string | string[]).join("/");
  if (!key.startsWith("demo/")) {
    res.status(404).end();
    return;
  }
  const buf = await leerArchivo(key);
  res.type(key.endsWith(".png") ? "png" : "jpeg").set("Cache-Control", "public, max-age=86400").send(buf);
});

for (const r of [auth, me, inicio, cuotas, frecuentes, pagos, recibos, asistente, progreso, demo, eventos, panel]) app.use(r);

app.use((_req, res) => {
  res.status(404).json({ error: { codigo: "NO_ENCONTRADO", mensaje: "Ruta no encontrada" } });
});
app.use(manejadorErrores);

app.listen(env.PORT, () => console.log(`API en http://localhost:${env.PORT}`));
