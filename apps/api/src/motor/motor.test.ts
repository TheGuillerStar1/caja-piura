import { describe, expect, it } from "vitest";
import { recomendar, type PerfilMotor } from "./index.js";

const rosa: PerfilMotor = { edad: 63, ocupacion: "COMERCIANTE", zona: "URBANA", opsPresencialesMes: 9, opsDigitalesMes: 0, gamaDispositivo: "BAJA", pagosSinAyuda: 0, tieneFrecuentes: true };
const elena: PerfilMotor = { edad: 47, ocupacion: "AGRICULTOR", zona: "RURAL", opsPresencialesMes: 6, opsDigitalesMes: 1, gamaDispositivo: "BAJA", pagosSinAyuda: 0, tieneFrecuentes: false };
const carlos: PerfilMotor = { edad: 35, ocupacion: "TRANSPORTISTA", zona: "URBANA", opsPresencialesMes: 1, opsDigitalesMes: 14, gamaDispositivo: "MEDIA", pagosSinAyuda: 0, tieneFrecuentes: true };
const pedro: PerfilMotor = { edad: 52, ocupacion: "TRANSPORTISTA", zona: "RURAL", opsPresencialesMes: 5, opsDigitalesMes: 2, gamaDispositivo: "BAJA", pagosSinAyuda: 0 };

describe("motor de personalización", () => {
  it("Rosa → asistida, tono cálido", () => {
    const r = recomendar(rosa);
    expect(r.vista).toBe("ASISTIDA");
    expect(r.tono).toBe("CALIDO");
    expect(r.razones[0]).toMatch(/agencia/);
    expect(r.sugerencias.map((s) => s.id)).toEqual(["PAGAR_CUOTA", "FRECUENTES", "PAGAR_RECIBO", "AYUDA"]);
  });
  it("Elena → asistida, tono corto, sin frecuentes", () => {
    const r = recomendar(elena);
    expect(r.vista).toBe("ASISTIDA");
    expect(r.tono).toBe("CORTO");
    expect(r.sugerencias.some((s) => s.id === "FRECUENTES")).toBe(false);
  });
  it("Carlos → estándar, tono directo", () => {
    const r = recomendar(carlos);
    expect(r.vista).toBe("ESTANDAR");
    expect(r.tono).toBe("DIRECTO");
    expect(r.sugerencias[0].id).toBe("FRECUENTES");
  });
  it("Pedro → asistida", () => {
    expect(recomendar(pedro).vista).toBe("ASISTIDA");
  });
  it("razones no vacías (2-3) y puntaje en 0..100", () => {
    for (const p of [rosa, elena, carlos, pedro]) {
      const r = recomendar(p);
      expect(r.razones.length).toBeGreaterThanOrEqual(2);
      expect(r.razones.length).toBeLessThanOrEqual(3);
      expect(r.puntaje).toBeGreaterThanOrEqual(0);
      expect(r.puntaje).toBeLessThanOrEqual(100);
    }
  });
  it("no decide solo por edad: un mayor muy digital va a estándar", () => {
    const r = recomendar({ ...carlos, edad: 68 });
    expect(r.vista).toBe("ESTANDAR");
  });
  it("no decide solo por zona: rural muy digital va a estándar", () => {
    const r = recomendar({ ...carlos, zona: "RURAL" });
    expect(r.vista).toBe("ESTANDAR");
  });
  it("pagos sin ayuda suben el puntaje", () => {
    expect(recomendar({ ...pedro, pagosSinAyuda: 8 }).puntaje).toBeGreaterThan(recomendar(pedro).puntaje);
  });
});
