import { describe, expect, it } from "vitest";
import { bancoDeCci, ocultarCelular, validarDestino } from "./logica.js";

describe("validarDestino", () => {
  it("terceros: acepta el número con guiones y espacios", () => {
    expect(validarDestino("TERCEROS", "210-01-2280638")).toEqual({ ok: true, valor: "210012280638" });
  });
  it("terceros: rechaza números cortos o con letras", () => {
    expect(validarDestino("TERCEROS", "12345").ok).toBe(false);
    expect(validarDestino("TERCEROS", "21001A280638").ok).toBe(false);
  });
  it("interbancaria: el CCI tiene 20 dígitos y no puede ser de Caja Piura", () => {
    expect(validarDestino("INTERBANCARIA", "00219300123456789012")).toEqual({ ok: true, valor: "00219300123456789012" });
    expect(validarDestino("INTERBANCARIA", "0021930012345678901").ok).toBe(false);
    const cp = validarDestino("INTERBANCARIA", "80200100123456789012");
    expect(cp.ok === false && cp.codigo).toBe("ES_CAJA_PIURA");
  });
  it("contacto: celular de 9 dígitos que empieza con 9", () => {
    expect(validarDestino("CONTACTO", "987 654 321")).toEqual({ ok: true, valor: "987654321" });
    expect(validarDestino("CONTACTO", "887654321").ok).toBe(false);
    expect(validarDestino("CONTACTO", "98765432").ok).toBe(false);
  });
});

describe("formatos", () => {
  it("oculta el celular y reconoce el banco del CCI", () => {
    expect(ocultarCelular("987654321")).toBe("987 *** 321");
    expect(bancoDeCci("00219300123456789012")).toBe("BCP");
    expect(bancoDeCci("99919300123456789012")).toBe("otra entidad");
  });
});
