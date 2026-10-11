import { describe, expect, it } from "vitest";
import { pedidoCambio, textoCambio } from "./cambio.js";
import { interpretar } from "./palabrasClave.js";

describe("tipo de cambio en el chat (cifras fijas, sin LLM)", () => {
  it("reconoce la pregunta y la conversión", () => {
    expect(pedidoCambio("¿a cuánto está el dólar?")).toEqual({ conversion: null });
    expect(pedidoCambio("tipo de cambio")).toEqual({ conversion: null });
    expect(pedidoCambio("¿cuántos soles son 100 dólares?")).toEqual({ conversion: { tipo: "DOLARES_A_SOLES", monto: 100 } });
    expect(pedidoCambio("quiero comprar 50 dólares")).toEqual({ conversion: { tipo: "COMPRAR_DOLARES", monto: 50 } });
    expect(pedidoCambio("cuántos dólares son 360 soles")).toEqual({ conversion: { tipo: "SOLES_A_DOLARES", monto: 360 } });
    expect(pedidoCambio("$ 20 a soles")).toEqual({ conversion: { tipo: "DOLARES_A_SOLES", monto: 20 } });
    expect(pedidoCambio("pagar la luz")).toBeNull();
    expect(pedidoCambio("cuánto tengo en soles")).toBeNull();
  });

  it("hace la cuenta con compra y venta", () => {
    expect(textoCambio({ conversion: { tipo: "DOLARES_A_SOLES", monto: 100 } }, "Rosa", true)).toContain("US$ 100.00 son S/ 330.00");
    expect(textoCambio({ conversion: { tipo: "COMPRAR_DOLARES", monto: 50 } }, "Rosa", false)).toContain("necesitas S/ 180.00");
    expect(textoCambio({ conversion: { tipo: "SOLES_A_DOLARES", monto: 360 } }, "Rosa", false)).toContain("compras US$ 100.00");
    expect(textoCambio({ conversion: null }, "Rosa", true)).toContain("Compra: S/ 3.30");
  });

  it("interpretar: tipo de cambio, pero un envío en dólares sigue siendo envío", () => {
    expect(interpretar("a cuánto está el dólar", [])).toEqual({ tipo: "CAMBIO", conversion: null });
    expect(interpretar("yapea 20 a sergio", []).tipo).toBe("TRANSFERIR");
  });
});
