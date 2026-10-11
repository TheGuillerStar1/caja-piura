// Centro de mando (/gestion): agregados por distrito y proyección de campañas. Funciones puras (sin base de datos).
//
// Las campañas no se "ejecutan" de verdad: los perfiles son ficticios. Su resultado se PROYECTA con un modelo
// determinista y explicable (abajo, MODELO) que usa lo que ya sabemos de cada cliente: qué parte de sus operaciones
// hace por el celular y la gama de su celular.
import { SUPUESTOS_GESTION, type AccionCampana, type AlcanceSegmentoRes, type CampanaRes, type SegmentoCampana } from "@cp/shared";
import { tasaDigital } from "../motor/index.js";

/** Distrito de la base → ubigeo INEI del polígono en /geo/piura-distritos.geojson. */
export const UBIGEO_DE: Record<string, string> = {
  Piura: "200101",
  // Creado en 2013 a partir de Piura: el GeoJSON del INEI usado no lo trae, se dibuja dentro de Piura.
  "Veintiséis de Octubre": "200101",
  Castilla: "200104",
  Catacaos: "200105",
  "La Arena": "200109",
  "Las Lomas": "200111",
  Tambogrande: "200114",
  Ayabaca: "200201",
  Chulucanas: "200401",
  Morropón: "200405",
  Paita: "200501",
  Sullana: "200601",
  Talara: "200701", // distrito de Pariñas
  Sechura: "200801",
};

export type PerfilGestion = {
  id: number;
  edad: number;
  ocupacion: "COMERCIANTE" | "AGRICULTOR" | "TRANSPORTISTA" | "OTRO";
  zona: "RURAL" | "URBANA";
  distrito: string;
  opsPresencialesMes: number;
  opsDigitalesMes: number;
  gamaDispositivo: "BAJA" | "MEDIA" | "ALTA";
};

export const ubigeoDe = (distrito: string) => UBIGEO_DE[distrito] ?? null;

/** Ahorro de pasar una operación de la ventanilla a la app. */
export const AHORRO_POR_OP = SUPUESTOS_GESTION.costoOpVentanilla - SUPUESTOS_GESTION.costoOpDigital;

export function enSegmento(p: PerfilGestion, s: SegmentoCampana) {
  if (s.distritos.length && !s.distritos.includes(ubigeoDe(p.distrito) ?? "")) return false;
  if (s.ocupaciones.length && !s.ocupaciones.includes(p.ocupacion)) return false;
  if (s.gamas.length && !s.gamas.includes(p.gamaDispositivo)) return false;
  if (s.zonas.length && !s.zonas.includes(p.zona)) return false;
  if (p.edad < s.edadMin || p.edad > s.edadMax) return false;
  if (s.soloVentanilla && tasaDigital(p) >= 0.5) return false;
  return true;
}

export function alcance(perfiles: PerfilGestion[], s: SegmentoCampana): AlcanceSegmentoRes {
  const r = { clientes: 0, porApp: 0, porSms: 0, opsVentanillaMes: 0 };
  for (const p of perfiles) {
    if (!enSegmento(p, s)) continue;
    r.clientes++;
    if (p.opsDigitalesMes > 0) r.porApp++;
    else r.porSms++;
    r.opsVentanillaMes += p.opsPresencialesMes;
  }
  return r;
}

/**
 * Modelo de respuesta a una campaña. Valores de referencia razonables para un piloto, no medidos:
 * se reemplazan con los resultados de la primera campaña real.
 */
export const MODELO = {
  /** Probabilidad de abrir el aviso según el canal */
  abrir: { APP: 0.7, SMS: 0.45 },
  /** Probabilidad base de pagar por la app tras abrir, según la acción */
  pagar: { AVISO: 0.18, RECORDATORIO_CUOTA: 0.3, CASHBACK_DOBLE: 0.38 } satisfies Record<AccionCampana, number>,
  gama: { BAJA: 0.7, MEDIA: 1, ALTA: 1.1 },
  /** Días para que la mitad de los que pagarán ya hayan pagado (curva 1 − e^(−días/τ), τ = este valor / ln 2) */
  diasMitad: 12,
  /** Parte de sus operaciones en ventanilla que pasa a la app quien sigue usándola */
  migracion: 0.5,
  /** Días tras los que se mide si sigue usando la app */
  diasSigue: 30,
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Embudo ESPERADO de una campaña a `diasSimulados`: cada etapa suma las probabilidades de cada cliente
 * (no se sortea a nadie). Así un segmento chico no da «0 pagaron» por mala suerte, y el resultado solo crece
 * al simular más días.
 */
export function proyectarCampana(
  campana: { accion: AccionCampana; segmento: SegmentoCampana; diasSimulados: number },
  perfiles: PerfilGestion[],
): Pick<CampanaRes, "alcance" | "embudo" | "opsMigradasMes" | "ahorroMes" | "costo"> {
  const { accion, segmento, diasSimulados: dias } = campana;
  const avance = dias > 0 ? 1 - Math.exp((-dias * Math.LN2) / MODELO.diasMitad) : 0;
  const e = { enviados: 0, abrieron: 0, pagaron: 0, siguenUsando: 0 };
  let opsMigradasMes = 0;
  let sms = 0;

  for (const p of perfiles) {
    if (dias === 0 || !enSegmento(p, segmento)) continue;
    const canal = p.opsDigitalesMes > 0 ? "APP" : "SMS";
    e.enviados++;
    if (canal === "SMS") sms++;

    const tasa = tasaDigital(p);
    const pAbrir = MODELO.abrir[canal] * (p.gamaDispositivo === "BAJA" ? 0.85 : 1);
    const pPagar = Math.min(0.9, MODELO.pagar[accion] * (0.6 + 0.8 * tasa) * MODELO.gama[p.gamaDispositivo]);
    // Quien llegó solo por el cashback doble vuelve un poco más a la ventanilla.
    const pSigue = dias >= MODELO.diasSigue ? Math.min(0.95, 0.55 + 0.3 * tasa - (accion === "CASHBACK_DOBLE" ? 0.1 : 0)) : 0;

    const abre = pAbrir;
    const paga = abre * pPagar * avance;
    const sigue = paga * pSigue;
    e.abrieron += abre;
    e.pagaron += paga;
    e.siguenUsando += sigue;
    opsMigradasMes += sigue * p.opsPresencialesMes * MODELO.migracion;
  }

  const embudo = { enviados: e.enviados, abrieron: Math.round(e.abrieron), pagaron: Math.round(e.pagaron), siguenUsando: Math.round(e.siguenUsando) };
  const costo = sms * SUPUESTOS_GESTION.costoSms + (accion === "CASHBACK_DOBLE" ? e.pagaron * SUPUESTOS_GESTION.cashbackExtraPorPago : 0);
  return {
    alcance: alcance(perfiles, segmento),
    embudo,
    opsMigradasMes: Math.round(opsMigradasMes * 10) / 10,
    ahorroMes: r2(opsMigradasMes * AHORRO_POR_OP),
    costo: r2(costo),
  };
}
