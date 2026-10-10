// Dueño: Agente C. Respaldo del asistente SIN LLM: interpreta el mensaje con palabras clave (sin tildes, tolera errores).
// Se usa si no hay Groq, si falla, si tarda más de 6 s o si contradice a estas reglas. También decide los casos de seguridad (clave) antes del LLM.
import { contienePalabra, normalizar } from "./texto.js";

export type Rubro = "LUZ" | "AGUA" | "TELEFONIA" | "INTERNET";
export type FrecuenteCtx = { id: number; alias: string; rubro: Rubro | string };
export type ProblemaPago = "DUPLICADO" | "NO_PROCESADO" | "ERRADO";
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

export function interpretar(mensaje: string, frecuentes: FrecuenteCtx[]): Intencion {
  const t = normalizar(mensaje);
  if (!t) return { tipo: "NADA" };

  // 1. Seguridad primero: la clave nunca se pide ni se muestra.
  if (algun(t, ["clave", "contrasena", "password", "pin", "token", "codigo secreto"])) {
    return algun(t, ["cambiar", "cambio", "cambia", "olvide", "olvido", "nueva", "actualizar", "bloquee", "bloqueada"])
      ? { tipo: "CLAVE_CAMBIAR" }
      : { tipo: "CLAVE_PEDIDA" };
  }
  // 2. Mover dinero fuera de lo que la app prepara: no se hace desde el asistente.
  if (algun(t, ["transferir", "transferencia", "transfiere", "yapear", "yape", "plin", "prestame plata", "prestame dinero", "retirar", "depositar a", "enviar plata", "mandar plata", "enviar dinero", "mandar dinero"])) {
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
