// Dueño: Agente C. Lee SOLO el código de suministro de la foto de un recibo con Groq visión.
// Nunca se usa ni se devuelve el monto de la foto: el monto real lo da Caja Piura (tabla Recibo).
import { groq, hayGroq, MODELO_VISION } from "../lib/groq.js";
import { extraerJson, normalizar, quitarThink } from "./texto.js";

export type ServicioLectura = { id: number; empresa: string; formatoCodigo: string };
export type Lectura = { ok: true; codigo: string; servicioId: number; empresa: string } | { ok: false; razon: string };

const PROMPT = `Eres un lector de recibos de servicios del Perú (luz, agua, telefonía, internet).
Mira la imagen y responde SOLO con un JSON, sin explicaciones:
{"empresa": "<nombre de la empresa que emite el recibo>", "codigo": "<código de suministro, número de servicio o teléfono>"}
Reglas:
- "codigo" lleva SOLO los dígitos del código de suministro / número de servicio (sin espacios, guiones ni letras).
- No es el número de medidor, ni el número de recibo, ni una fecha, ni un monto.
- No incluyas montos ni ningún otro dato.
- Si no ves el código con claridad, responde {"empresa": "", "codigo": ""}.`;

/** Alias por empresa para identificarla por nombre aunque el modelo la escriba distinto. */
const ALIAS: Record<string, string[]> = {
  enosa: ["enosa", "electronoroeste", "electro noroeste"],
  "eps grau": ["eps grau", "grau", "epsgrau"],
  movistar: ["movistar", "telefonica"],
  claro: ["claro", "america movil"],
};

/** Decide servicio + código a partir de lo que respondió el modelo. Exportado para pruebas. */
export function identificarServicio(empresaLeida: string, codigoLeido: string, servicios: ServicioLectura[]): Lectura {
  const codigo = (codigoLeido ?? "").replace(/\D/g, "");
  if (!codigo) return { ok: false, razon: "SIN_CODIGO" };
  const valida = (s: ServicioLectura) => {
    try {
      return new RegExp(s.formatoCodigo).test(codigo);
    } catch {
      return false;
    }
  };
  const emp = normalizar(empresaLeida ?? "");
  const porNombre = emp
    ? servicios.find((s) => {
        const n = normalizar(s.empresa);
        const alias = ALIAS[n] ?? [n];
        return alias.some((a) => emp.includes(a) || a.includes(emp));
      })
    : undefined;
  if (porNombre) {
    return valida(porNombre)
      ? { ok: true, codigo, servicioId: porNombre.id, empresa: porNombre.empresa }
      : { ok: false, razon: "FORMATO_NO_VALIDO" };
  }
  // Sin empresa reconocida: si el formato coincide con un solo servicio, se usa ese.
  const candidatos = servicios.filter(valida);
  if (candidatos.length === 1) return { ok: true, codigo, servicioId: candidatos[0].id, empresa: candidatos[0].empresa };
  return { ok: false, razon: candidatos.length ? "AMBIGUO" : "FORMATO_NO_VALIDO" };
}

/** Imagen → { codigo, servicioId, empresa } o { ok:false }. Timeout de 12 s. */
export async function leerRecibo(imagen: Buffer, mime: string, servicios: ServicioLectura[]): Promise<Lectura> {
  if (!hayGroq) return { ok: false, razon: "SIN_GROQ" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await groq.chat.completions.create(
      {
        model: MODELO_VISION,
        temperature: 0,
        max_completion_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:${mime};base64,${imagen.toString("base64")}` } },
            ],
          },
        ],
      },
      { signal: ctrl.signal },
    );
    const texto = quitarThink(r.choices[0]?.message?.content);
    if (process.env.DEBUG_IA) console.log("[leerRecibo] respuesta:", texto.slice(0, 300));
    const json = extraerJson(texto);
    if (!json) return { ok: false, razon: "SIN_JSON" };
    return identificarServicio(String(json.empresa ?? ""), String(json.codigo ?? ""), servicios);
  } catch (e) {
    console.warn("[leerRecibo]", (e as Error).message?.slice(0, 160));
    return { ok: false, razon: ctrl.signal.aborted ? "TIMEOUT" : "ERROR" };
  } finally {
    clearTimeout(t);
  }
}
