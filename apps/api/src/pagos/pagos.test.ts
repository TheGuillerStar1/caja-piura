import { describe, expect, it } from "vitest";
import { calcularCashback, decidirIdempotencia, fechaOperacion, motivoCashback, planCredito } from "./logica.js";

describe("calcularCashback", () => {
  const base = { conAyuda: false, diasAlVencimiento: 3, acumuladoMes: 0 };
  it("cuota de S/ 100 antes del vencimiento y sin ayuda = S/ 3 (1% + 0.5% + 1.5%)", () => {
    const c = calcularCashback({ ...base, tipo: "CUOTA", monto: 100 });
    expect(c.monto).toBe(3);
    expect(c.partes).toHaveLength(3);
    expect(c.topeAlcanzado).toBe(false);
  });
  it("cuota el mismo día, con ayuda = solo el 1%", () => {
    expect(calcularCashback({ ...base, tipo: "CUOTA", monto: 80, conAyuda: true, diasAlVencimiento: 0 }).monto).toBe(0.8);
  });
  it("recibo sin ayuda = 1.5% (la puntualidad es solo para cuotas)", () => {
    expect(calcularCashback({ ...base, tipo: "RECIBO", monto: 60, diasAlVencimiento: 5 }).monto).toBe(0.9);
  });
  it("no pasa de S/ 5 por pago", () => {
    const c = calcularCashback({ ...base, tipo: "CUOTA", monto: 500 });
    expect(c.monto).toBe(5);
    expect(c.topeAlcanzado).toBe(true);
  });
  it("respeta lo que queda del tope del mes", () => {
    expect(calcularCashback({ ...base, tipo: "CUOTA", monto: 100, acumuladoMes: 18.5 }).monto).toBe(1.5);
    expect(calcularCashback({ ...base, tipo: "CUOTA", monto: 100, acumuladoMes: 20 }).monto).toBe(0);
  });
  it("el movimiento lleva el motivo más fuerte", () => {
    expect(motivoCashback(calcularCashback({ ...base, tipo: "CUOTA", monto: 100 }))).toBe("Cashback · Cuota pagada antes de vencer");
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
