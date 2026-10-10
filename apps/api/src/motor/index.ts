// Dueño: Agente A. Motor de personalización por reglas deterministas (sin LLM).
// Firma estable: otros agentes (C: sugerencias del asistente) importan recomendar().
//
// Puntaje 0..100 (mayor = más digital). La señal principal es la TASA DIGITAL
// (digitales / (digitales + presenciales)); edad, zona, gama del celular y pagos sin ayuda solo ajustan.
//   puntaje = BASE + tasa·PESO_TASA + volumen·PESO_VOLUMEN + ajusteEdad + ajusteZona + ajusteGama + ajusteAutonomia
// puntaje < UMBRAL_ASISTIDA → vista ASISTIDA.
import type { Recomendacion, Sugerencia, Tono } from "@cp/shared";

export type PerfilMotor = {
  edad: number;
  ocupacion: "COMERCIANTE" | "AGRICULTOR" | "TRANSPORTISTA" | "OTRO";
  zona: "RURAL" | "URBANA";
  opsPresencialesMes: number;
  opsDigitalesMes: number;
  gamaDispositivo: "BAJA" | "MEDIA" | "ALTA";
  pagosSinAyuda: number;
  /** Opcional: si tiene pagos frecuentes guardados (para sugerir "Mis pagos de siempre"). */
  tieneFrecuentes?: boolean;
};

export const PESOS = {
  BASE: 15,
  PESO_TASA: 60, // señal principal
  PESO_VOLUMEN: 10, // operaciones digitales al mes (tope 15)
  TOPE_VOLUMEN: 15,
  EDAD: { menos35: 10, de35a54: 5, de55a64: 0, desde65: -5 },
  RURAL: -8,
  GAMA: { BAJA: -7, MEDIA: 0, ALTA: 5 },
  POR_PAGO_SIN_AYUDA: 1.5, // tope 10 pagos → +15
  TOPE_PAGOS: 10,
  UMBRAL_ASISTIDA: 55,
} as const;

export function tasaDigital(p: Pick<PerfilMotor, "opsDigitalesMes" | "opsPresencialesMes">) {
  const total = p.opsDigitalesMes + p.opsPresencialesMes;
  return total > 0 ? p.opsDigitalesMes / total : 0;
}

function ajusteEdad(edad: number) {
  if (edad < 35) return PESOS.EDAD.menos35;
  if (edad < 55) return PESOS.EDAD.de35a54;
  if (edad < 65) return PESOS.EDAD.de55a64;
  return PESOS.EDAD.desde65;
}

export function puntajeDigital(p: PerfilMotor) {
  const tasa = tasaDigital(p);
  const volumen = Math.min(p.opsDigitalesMes, PESOS.TOPE_VOLUMEN) / PESOS.TOPE_VOLUMEN;
  const crudo =
    PESOS.BASE +
    tasa * PESOS.PESO_TASA +
    volumen * PESOS.PESO_VOLUMEN +
    ajusteEdad(p.edad) +
    (p.zona === "RURAL" ? PESOS.RURAL : 0) +
    PESOS.GAMA[p.gamaDispositivo] +
    Math.min(p.pagosSinAyuda, PESOS.TOPE_PAGOS) * PESOS.POR_PAGO_SIN_AYUDA;
  return Math.round(Math.max(0, Math.min(100, crudo)));
}

function razonesPara(p: PerfilMotor, asistida: boolean): string[] {
  const tasa = tasaDigital(p);
  const r: string[] = [];
  // 1. Siempre la señal principal.
  if (tasa < 0.25) r.push("Haces casi todas tus operaciones en agencia");
  else if (tasa < 0.5) r.push("Todavía vas seguido a la agencia");
  else if (tasa < 0.8) r.push("Ya haces varias operaciones desde tu celular");
  else r.push("Usas tu celular para pagar seguido");

  // 2. Ajustes, en orden de peso.
  if (p.pagosSinAyuda >= 3) r.push(`Ya hiciste ${p.pagosSinAyuda} pagos sin ayuda`);
  if (asistida) {
    if (p.zona === "RURAL") r.push("Vives lejos de la agencia: pagar desde aquí te ahorra el viaje");
    if (p.gamaDispositivo === "BAJA") r.push("Tu celular funciona mejor con pantallas simples");
    if (p.edad >= 55) r.push("Con letra y botones grandes todo se lee mejor");
    r.push("Te guiamos paso a paso en cada pago");
  } else {
    if (p.gamaDispositivo !== "BAJA") r.push("Tu celular muestra bien más opciones a la vez");
    r.push("Tendrás todas las opciones a la vista");
  }
  return r.slice(0, 3);
}

function sugerenciasPara(p: PerfilMotor, asistida: boolean): Sugerencia[] {
  if (asistida) {
    const s: Sugerencia[] = [{ id: "PAGAR_CUOTA", texto: "Pagar mi cuota" }];
    if (p.tieneFrecuentes) s.push({ id: "FRECUENTES", texto: "Mis pagos de siempre" });
    s.push({ id: "PAGAR_RECIBO", texto: "Pagar un recibo con foto" }, { id: "AYUDA", texto: "Pedir ayuda a Pía" });
    return s;
  }
  return [
    { id: "FRECUENTES", texto: "Pagos frecuentes" },
    { id: "VER_SALDO", texto: "Ver saldo" },
    { id: "PAGAR_CUOTA", texto: "Pagar cuota" },
    { id: "PAGAR_RECIBO", texto: "Pagar recibo" },
    { id: "PROGRESO", texto: "Mi progreso" },
  ];
}

export function recomendar(p: PerfilMotor): Recomendacion {
  const puntaje = puntajeDigital(p);
  const asistida = puntaje < PESOS.UMBRAL_ASISTIDA;
  const tono: Tono = !asistida ? "DIRECTO" : p.edad >= 55 ? "CALIDO" : "CORTO";
  return {
    vista: asistida ? "ASISTIDA" : "ESTANDAR",
    tono,
    puntaje,
    razones: razonesPara(p, asistida),
    sugerencias: sugerenciasPara(p, asistida),
  };
}

/** Atajo: arma el PerfilMotor desde una fila de Cliente de Prisma. */
export function perfilDeCliente(c: PerfilMotor, tieneFrecuentes?: boolean): PerfilMotor {
  return {
    edad: c.edad,
    ocupacion: c.ocupacion,
    zona: c.zona,
    opsPresencialesMes: c.opsPresencialesMes,
    opsDigitalesMes: c.opsDigitalesMes,
    gamaDispositivo: c.gamaDispositivo,
    pagosSinAyuda: c.pagosSinAyuda,
    tieneFrecuentes,
  };
}
