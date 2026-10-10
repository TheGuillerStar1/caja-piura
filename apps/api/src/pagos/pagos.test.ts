import { describe, expect, it } from "vitest";
import { calcularPuntos, decidirIdempotencia, fechaOperacion, sumarPuntos } from "./logica.js";

describe("calcularPuntos", () => {
  it("cuota antes del vencimiento y sin ayuda = 25", () => {
    expect(sumarPuntos(calcularPuntos({ tipo: "CUOTA", conAyuda: false, diasAlVencimiento: 3 }))).toBe(25);
  });
  it("cuota el mismo día, con ayuda = 10", () => {
    expect(sumarPuntos(calcularPuntos({ tipo: "CUOTA", conAyuda: true, diasAlVencimiento: 0 }))).toBe(10);
  });
  it("recibo sin ayuda = 15 (el bono de anticipo es solo para cuotas)", () => {
    expect(sumarPuntos(calcularPuntos({ tipo: "RECIBO", conAyuda: false, diasAlVencimiento: 5 }))).toBe(15);
  });
});

describe("decidirIdempotencia", () => {
  it("sin pago previo procesa", () => expect(decidirIdempotencia(null, false)).toBe("NUEVO"));
  it("exitoso previo nunca vuelve a cobrar", () => {
    expect(decidirIdempotencia({ estado: "EXITOSO" }, false)).toBe("DEVOLVER");
    expect(decidirIdempotencia({ estado: "EXITOSO" }, true)).toBe("DEVOLVER");
  });
  it("fallido previo se reintenta con la misma key", () => expect(decidirIdempotencia({ estado: "FALLIDO" }, false)).toBe("REPROCESAR"));
});

describe("fechaOperacion", () => {
  it("usa el día simulado y la hora real", () => {
    const f = fechaOperacion(new Date("2026-11-09T00:00:00Z"), new Date("2026-10-10T15:30:20Z"));
    expect(f.toISOString()).toBe("2026-11-09T15:30:20.000Z");
  });
});
