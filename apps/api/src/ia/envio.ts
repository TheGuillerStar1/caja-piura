// Envíos a contacto pedidos en el chat ("yapéale 50 a Sergio", "plinea a mi mamá", "transfiere 100 soles a Lucía").
// Reglas fijas, sin LLM: solo se extrae a quién, cuánto y por dónde. Nada de esto mueve dinero.
import { normalizar } from "./texto.js";

export type Billetera = "YAPE" | "PLIN" | "BIM" | "DALE" | "SIP";
export type PedidoEnvio = { nombre: string | null; monto: number | null; billetera: Billetera | null };

const VERBO_ENVIO = /^(yape\w*|plin\w*|transf\w*|mand\w*|envi\w*|pasale|pasarle|depositale|depositarle)$/;
const PALABRAS_MONTO: Record<string, number> = {
  cinco: 5, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
};
/** Palabras que cortan el nombre del contacto. */
const NO_NOMBRE = new Set([
  ...Object.keys(PALABRAS_MONTO),
  "a", "al", "para", "por", "con", "en", "de", "que", "y", "le", "les", "lo", "la", "el", "mi", "mis", "su", "sus", "tu",
  "plata", "dinero", "sol", "soles", "luca", "lucas", "cocos", "mangos", "quiero", "puedes", "porfa", "favor", "ahora", "hoy",
  "yape", "plin", "bim", "dale", "sip", "celular", "numero", "contacto", "un", "una", "uno", "otra", "otro", "cuenta", "banco",
]);
const QUITAR_INICIO = new Set(["mi", "mis", "su", "la", "el", "le", "al", "a"]);

const esBilletera = (p: string) => /^(yape\w*|plin\w*)$/.test(p);

export function billeteraDe(t: string): Billetera | null {
  if (/\byape\w*/.test(t)) return "YAPE";
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
    if (VERBO_ENVIO.test(p)) inicios.push(i + 1);
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

/**
 * ¿Es un envío a un contacto? Sí si menciona Yape/Plin/Bim/Dale/Sip, o si dice a quién ("transfiere 100 a Sergio").
 * "quiero transferir" a secas devuelve null: ahí Pía ofrece los tipos de transferencia.
 */
export function pedidoEnvio(mensaje: string): PedidoEnvio | null {
  const t = normalizar(mensaje);
  const palabras = t.split(" ");
  const billetera = billeteraDe(t);
  const nombre = nombreDe(t);
  const verbo = palabras.some((p) => VERBO_ENVIO.test(p) || esBilletera(p));
  if (!verbo) return null;
  // "otra cuenta", "otro banco", "mis cuentas": no es a un contacto.
  if (!billetera && /\b(cuenta|cuentas|banco|cci|interbancari\w*)\b/.test(t)) return null;
  if (!billetera && !nombre) return null;
  return { nombre, monto: montoDe(mensaje), billetera };
}
