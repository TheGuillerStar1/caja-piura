// Dueño: Agente C. Utilidades de texto para respuestas del LLM y coincidencias aproximadas.

/** Quita bloques <think>…</think> (y uno sin cerrar) de una respuesta del modelo. */
export function quitarThink(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .trim();
}

/** Extrae el primer objeto JSON de un texto aunque venga con texto o ``` alrededor. */
export function extraerJson(texto: string): Record<string, unknown> | null {
  const limpio = quitarThink(texto);
  const inicio = limpio.indexOf("{");
  if (inicio < 0) return null;
  // Busca el cierre balanceado más corto que parsee.
  let prof = 0;
  for (let i = inicio; i < limpio.length; i++) {
    const c = limpio[i];
    if (c === "{") prof++;
    else if (c === "}") {
      prof--;
      if (prof === 0) {
        try {
          const v = JSON.parse(limpio.slice(inicio, i + 1));
          return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** minúsculas, sin tildes, sin signos, espacios simples. */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distancia de Levenshtein (para tolerar errores de tipeo: "cuta" → "cuota"). */
export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** ¿Alguna palabra del texto se parece a la palabra clave? Tolera 1 error en palabras de 5+ letras. */
export function contienePalabra(textoNormalizado: string, clave: string): boolean {
  const c = normalizar(clave);
  if (!c) return false;
  if (c.includes(" ")) return textoNormalizado.includes(c);
  const tol = c.length >= 5 ? 1 : 0;
  return textoNormalizado.split(" ").some((p) => p === c || (tol > 0 && Math.abs(p.length - c.length) <= tol && distancia(p, c) <= tol));
}

/** Promesa con límite de tiempo. */
export function conTimeout<T>(p: Promise<T>, ms: number, mensaje = "TIMEOUT"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(mensaje)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
