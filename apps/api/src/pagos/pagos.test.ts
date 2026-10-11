import { describe, expect, it } from "vitest";
import { calcularPuntos, decidirIdempotencia, fechaOperacion, planCredito, sumarPuntos } from "./logica.js";

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

describe("planCredito", () => {
  const q = [
    { id: 1, monto: 350 },
    { id: 2, monto: 350 },
    { id: 3, monto: 350 },
    { id: 4, monto: 350 },
  ];
  it("cuota paga solo la del mes", () => expect(planCredito(q, "CUOTA")).toMatchObject({ monto: 350, pagar: [1], restar: [] }));
  it("interés cobra la parte estimada y la cuota sigue pendiente por el resto", () =>
    expect(planCredito(q, "INTERES")).toMatchObject({ monto: 98, pagar: [], restar: [{ id: 1, de: 350, a: 252 }] }));
  it("adelanto de 2 paga la del mes y la siguiente", () => expect(planCredito(q, "ADELANTO", 2)).toMatchObject({ monto: 700, pagar: [1, 2] }));
  it("adelanto fuera de rango se rechaza", () => expect(() => planCredito(q, "ADELANTO", 5)).toThrow(/de 1 a 3/));
  it("amortización baja desde las últimas cuotas", () =>
    expect(planCredito(q, "AMORTIZACION", 500)).toMatchObject({ monto: 500, pagar: [4], restar: [{ id: 3, de: 350, a: 200 }] }));
  it("amortización bajo el mínimo o mayor a la deuda se rechaza", () => {
    expect(() => planCredito(q, "AMORTIZACION", 20)).toThrow(/mínimo/);
    expect(() => planCredito(q, "AMORTIZACION", 2000)).toThrow(/deuda pendiente/);
  });
});
