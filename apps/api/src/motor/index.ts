// Dueño: Agente A. Motor de personalización por reglas deterministas (sin LLM).
// Firma estable: otros agentes (C: sugerencias del asistente) importan recomendar().
import type { Recomendacion } from "@cp/shared";

export type PerfilMotor = {
  edad: number;
  ocupacion: "COMERCIANTE" | "AGRICULTOR" | "TRANSPORTISTA" | "OTRO";
  zona: "RURAL" | "URBANA";
  opsPresencialesMes: number;
  opsDigitalesMes: number;
  gamaDispositivo: "BAJA" | "MEDIA" | "ALTA";
  pagosSinAyuda: number;
};

/** PROVISIONAL (F0): el Agente A lo reemplaza por el motor real con pesos y razones. */
export function recomendar(p: PerfilMotor): Recomendacion {
  const tasa = p.opsDigitalesMes / Math.max(1, p.opsDigitalesMes + p.opsPresencialesMes);
  const asistida = tasa < 0.5;
  return {
    vista: asistida ? "ASISTIDA" : "ESTANDAR",
    tono: asistida ? "CALIDO" : "DIRECTO",
    puntaje: Math.round(tasa * 100),
    razones: [],
    sugerencias: [
      { id: "PAGAR_CUOTA", texto: "Pagar mi cuota" },
      { id: "FRECUENTES", texto: "Mis pagos frecuentes" },
      { id: "PAGAR_RECIBO", texto: "Pagar un recibo" },
      { id: "AYUDA", texto: "Ayuda" },
    ],
  };
}
