// Railway: un solo servicio levanta las dos apps del monorepo.
// - Web (Next.js) en el puerto público $PORT.
// - API (Express) en un puerto interno; la web le reenvía /api/* por localhost (rewrite de next.config, fijado al compilar).
// Si cualquiera de las dos se cae, el proceso termina y Railway reinicia el servicio entero (restartPolicy ON_FAILURE).
import { spawn } from "node:child_process";

const PUERTO_WEB = process.env.PORT ?? "3000";
const PUERTO_API = process.env.API_PORT ?? "4317";

const hijos = [];
function correr(nombre, args, env) {
  const p = spawn("npm", args, { stdio: "inherit", env: { ...process.env, ...env } });
  p.on("exit", (codigo, senal) => {
    console.error(`[${nombre}] terminó (${senal ?? codigo}). Se detiene el servicio para que Railway lo reinicie.`);
    for (const h of hijos) if (h !== p) h.kill("SIGTERM");
    process.exit(codigo ?? 1);
  });
  hijos.push(p);
}

correr("api", ["run", "start", "-w", "apps/api"], { PORT: PUERTO_API });
correr("web", ["run", "start", "-w", "apps/web"], { PORT: PUERTO_WEB, API_URL: `http://localhost:${PUERTO_API}` });

for (const s of ["SIGTERM", "SIGINT"]) {
  process.on(s, () => {
    for (const h of hijos) h.kill(s);
    process.exit(0);
  });
}
