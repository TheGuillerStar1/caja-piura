// Dueño: Agente C. Respaldo del asistente SIN LLM: interpreta el mensaje con palabras clave (sin tildes, tolera errores).
// Se usa si no hay Groq, si falla, si tarda más de 6 s o si contradice a estas reglas. También decide los casos de seguridad (clave) antes del LLM.
import { contienePalabra, normalizar } from "./texto.js";

export type Rubro = "LUZ" | "AGUA" | "TELEFONIA" | "INTERNET";
export type FrecuenteCtx = { id: number; alias: string; rubro: Rubro | string };
export type ProblemaPago = "DUPLICADO" | "NO_PROCESADO" | "ERRADO";
export type Billetera = "YAPE" | "PLIN" | "BIM" | "DALE" | "SIP";
export type Pantalla = "inicio" | "pagar_cuota" | "frecuentes" | "pagar_recibo" | "progreso" | "ajustes";

/** Intención reconocida. La ejecutan las mismas funciones que las herramientas del LLM (asistente.ts). */
export type Intencion =
  | { tipo: "CUOTA" }
  | { tipo: "DEUDA" }
  | { tipo: "SALDO" }
  | { tipo: "FRECUENTE"; ids: number[] }
  | { tipo: "RUBRO_SIN_FRECUENTE"; rubro: Rubro }
  | { tipo: "RECIBO" }
  | { tipo: "PANTALLA"; pantalla: Pantalla }
  | { tipo: "CLAVE_CAMBIAR" }
  | { tipo: "CLAVE_PEDIDA" }
  | { tipo: "FUERA_DE_ALCANCE" }
  /** Enviar a un contacto: Pía solo extrae a quién, cuánto y por dónde; el cliente elige, revisa y confirma. */
  | { tipo: "TRANSFERIR"; nombre: string | null; monto: number | null; billetera: Billetera | null }
  | { tipo: "PROBLEMA_PAGO"; problema: ProblemaPago }
  | { tipo: "NADA" };

const RUBROS: Record<Rubro, string[]> = {
  LUZ: ["luz", "electricidad", "enosa", "energia"],
  AGUA: ["agua", "eps grau", "grau", "desague"],
  TELEFONIA: ["celular", "telefono", "movil", "movistar", "linea", "cel"],
  INTERNET: ["internet", "wifi", "claro internet"],
};

const PALABRAS_RUBRO = new Set(Object.values(RUBROS).flat());
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "mi", "mis", "su", "a", "y", "en", "para"]);

const algun = (t: string, claves: string[]) => claves.some((c) => contienePalabra(t, c));
/** Coincidencia exacta de frase (sin tolerancia a errores): para frases cortas que no deben confundirse. */
const frase = (t: string, claves: string[]) => claves.some((c) => t.includes(c));

const PROBLEMAS: [ProblemaPago, string[]][] = [
  ["DUPLICADO", ["dos veces", "doble", "duplicad", "duplicaron", "cobraron de mas", "cobro de mas", "pague de mas", "pague 2 veces"]],
  ["ERRADO", ["me equivoque", "equivocad", "pague mal", "pague otro", "pague a otro", "pago errado", "pago erroneo", "otro recibo", "monto equivocado", "no era ese", "no era el"]],
  ["NO_PROCESADO", ["se hizo mi pago", "se realizo mi pago", "paso mi pago", "se pago o no", "no se proceso", "no proceso", "no paso", "no se hizo", "no salio", "no se pago", "no se realizo", "no se completo", "fallo", "rechaz", "se colgo", "se quedo cargando", "no llego"]],
];

/** Busca frecuentes cuyo alias aparece en el mensaje ("la luz de mi mamá" ↔ "Luz de mamá"). */
export function buscarPorAlias(t: string, frecuentes: FrecuenteCtx[]): number[] {
  const exactos = frecuentes.filter((f) => t.includes(normalizar(f.alias)));
  if (exactos.length) return exactos.map((f) => f.id);
  return frecuentes
    .filter((f) => {
      const palabras = normalizar(f.alias)
        .split(" ")
        .filter((p) => p && !VACIAS.has(p));
      // Un alias solo con palabras de rubro ("Mi luz") no se elige por aproximación: lo decide el rubro.
      const especificas = palabras.filter((p) => !PALABRAS_RUBRO.has(p));
      return especificas.length > 0 && palabras.every((p) => contienePalabra(t, p));
    })
    .map((f) => f.id);
}

// ── Envíos a contacto ("yapéale 50 a Sergio", "plinea a mi mamá", "transfiere 100 soles a Lucía") ──
const VERBO_ENVIO = /^(yape\w*|plin\w*|transf\w*|mand\w*|envi\w*|pasale|pasarle|depositale|depositarle)$/;
const DINERO = /\b(plata|dinero|soles?|lucas?|\d+)\b/;
const PALABRAS_MONTO: Record<string, number> = {
  cinco: 5, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
};
/** Palabras que cortan el nombre del contacto. */
const NO_NOMBRE = new Set([
  ...Object.keys(PALABRAS_MONTO),
  "a", "al", "para", "por", "con", "en", "de", "que", "y", "le", "les", "lo", "la", "el", "mi", "mis", "su", "sus", "tu",
  "plata", "dinero", "sol", "soles", "luca", "lucas", "cocos", "mangos", "quiero", "puedes", "porfa", "por favor", "favor", "ahora", "hoy",
  "yape", "plin", "bim", "dale", "sip", "celular", "numero", "contacto", "mi contacto", "un", "una", "uno",
]);
const QUITAR_INICIO = new Set(["mi", "mis", "su", "la", "el", "le", "al", "a"]);

function esEnvio(t: string) {
  const palabras = t.split(" ");
  if (palabras.some((p) => /^(yape\w*|yapea\w*|plin\w*|plinea\w*|transfer\w*|transfi\w*)$/.test(p))) return true;
  // "mándale plata a Sergio", "envía 20 soles a mi mamá": verbo de envío + dinero.
  return palabras.some((p) => VERBO_ENVIO.test(p)) && (DINERO.test(t) || palabras.some((p) => PALABRAS_MONTO[p]));
}

function billeteraDe(t: string): Billetera | null {
  if (/\byape\w*|\byapea\w*/.test(t)) return "YAPE";
  if (/\bplin\w*/.test(t)) return "PLIN";
  if (/\bbim\b/.test(t)) return "BIM";
  const m = t.match(/\b(?:por|con|a su|al|en|su) (dale|sip)\b/);
  return m ? (m[1].toUpperCase() as Billetera) : null;
}

/** Monto pedido, del texto original ("S/ 50", "50.50 soles", "cincuenta"). Ignora números largos (celulares). */
export function montoDe(mensaje: string): number | null {
  const m = mensaje.toLowerCase().replace(/(\d),(\d{1,2})\b/g, "$1.$2");
  const conMoneda = m.match(/s\/\.?\s*(\d{1,4}(?:\.\d{1,2})?)\b/) ?? m.match(/\b(\d{1,4}(?:\.\d{1,2})?)\s*(?:soles?|lucas?|cocos|mangos)\b/);
  const suelto = m.match(/(?:^|[^\d.])(\d{1,4}(?:\.\d{1,2})?)(?![\d.])/);
  const n = conMoneda?.[1] ?? suelto?.[1];
  if (n) return Number(n) > 0 ? Number(n) : null;
  const palabra = normalizar(mensaje)
    .split(" ")
    .find((p) => PALABRAS_MONTO[p]);
  return palabra ? PALABRAS_MONTO[palabra] : null;
}

/** A quién: lo que sigue a "a" / "para" o al verbo ("yapea a Sergio", "plinéale a mi mamá", "yapea Sergio 20"). */
export function nombreDe(t: string): string | null {
  const palabras = t.split(" ");
  const inicios: number[] = [];
  palabras.forEach((p, i) => {
    if (p === "a" || p === "para" || p === "al") inicios.push(i + 1);
  });
  palabras.forEach((p, i) => {
    if (VERBO_ENVIO.test(p) || /^(yape|plin)/.test(p)) inicios.push(i + 1);
  });
  for (const i of inicios) {
    let j = i;
    while (j < palabras.length && QUITAR_INICIO.has(palabras[j])) j++;
    const nombre: string[] = [];
    for (; j < palabras.length && nombre.length < 3; j++) {
      const p = palabras[j];
      if (NO_NOMBRE.has(p) || /\d/.test(p) || VERBO_ENVIO.test(p)) break;
      nombre.push(p);
    }
    if (nombre.length) return nombre.join(" ");
  }
  return null;
}

export function interpretar(mensaje: string, frecuentes: FrecuenteCtx[]): Intencion {
  const t = normalizar(mensaje);
  if (!t) return { tipo: "NADA" };

  // 1. Seguridad primero: la clave nunca se pide ni se muestra.
  if (algun(t, ["clave", "contrasena", "password", "pin", "token", "codigo secreto"])) {
    return algun(t, ["cambiar", "cambio", "cambia", "olvide", "olvido", "nueva", "actualizar", "bloquee", "bloqueada"])
      ? { tipo: "CLAVE_CAMBIAR" }
      : { tipo: "CLAVE_PEDIDA" };
  }
  // 2. Enviar a un contacto: Pía arma el pedido; el cliente elige el contacto, el monto y confirma con su huella.
  if (esEnvio(t)) return { tipo: "TRANSFERIR", nombre: nombreDe(t), monto: montoDe(mensaje), billetera: billeteraDe(t) };
  // 2a. Otras formas de mover dinero que la app no hace desde el asistente.
  if (algun(t, ["prestame plata", "prestame dinero", "retirar", "retiro", "sacar plata"])) {
    return { tipo: "FUERA_DE_ALCANCE" };
  }

  // 2b. Problemas con un pago (duplicado, no procesado, errado): antes que "cuota" para "me cobraron la cuota dos veces".
  for (const [problema, claves] of PROBLEMAS) {
    if (frase(t, claves)) return { tipo: "PROBLEMA_PAGO", problema };
  }

  // 3. Pagos frecuentes por alias ("luz de mamá", "mi celular").
  const porAlias = buscarPorAlias(t, frecuentes);
  if (porAlias.length) return { tipo: "FRECUENTE", ids: porAlias };

  // 4. Cuota / crédito.
  const mencionaCuota = algun(t, ["cuota", "credito", "prestamo"]);
  if (mencionaCuota) return { tipo: "CUOTA" };
  if (algun(t, ["deuda", "debo", "deudas", "pendiente", "pendientes", "vence"])) return { tipo: "DEUDA" };

  // 5. Servicios por rubro.
  for (const [rubro, claves] of Object.entries(RUBROS) as [Rubro, string[]][]) {
    if (algun(t, claves)) {
      const ids = frecuentes.filter((f) => f.rubro === rubro).map((f) => f.id);
      return ids.length ? { tipo: "FRECUENTE", ids } : { tipo: "RUBRO_SIN_FRECUENTE", rubro };
    }
  }

  // 6. Resto de accesos.
  if (algun(t, ["recibo", "foto", "fotito", "boleta", "factura"])) return { tipo: "RECIBO" };
  if (algun(t, ["saldo", "cuanto tengo", "mi plata", "mi dinero", "tengo plata", "plata tengo", "dinero tengo", "cuanto hay en mi cuenta"])) return { tipo: "SALDO" };
  if (algun(t, ["puntos", "progreso", "premio", "premios", "millas"])) return { tipo: "PANTALLA", pantalla: "progreso" };
  if (algun(t, ["frecuente", "frecuentes", "guardados", "de siempre"])) return { tipo: "PANTALLA", pantalla: "frecuentes" };
  if (algun(t, ["ajustes", "configuracion", "vista", "letra"])) return { tipo: "PANTALLA", pantalla: "ajustes" };
  if (algun(t, ["inicio", "volver", "principal"])) return { tipo: "PANTALLA", pantalla: "inicio" };
  return { tipo: "NADA" };
}
