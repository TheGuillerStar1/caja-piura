import { describe, expect, it } from "vitest";
import { interpretar } from "./palabrasClave.js";
import { pedidoServicio } from "./servicio.js";

describe("pago de servicios en el chat (solo se entiende el pedido; no se paga nada)", () => {
  it("reconoce empresa, rubro y código", () => {
    expect(pedidoServicio("paga Enosa 31264587")).toEqual({ rubro: "LUZ", empresa: "Enosa", codigo: "31264587" });
    expect(pedidoServicio("quiero pagar el agua 2045871")).toEqual({ rubro: "AGUA", empresa: null, codigo: "2045871" });
    expect(pedidoServicio("pagar servicios")).toEqual({ rubro: null, empresa: null, codigo: null });
    expect(pedidoServicio("quiero pagar mi recibo de movistar")).toEqual({ rubro: "TELEFONIA", empresa: "Movistar", codigo: null });
  });

  it("no se mete con otros pedidos", () => {
    expect(pedidoServicio("pagar la luz")).toBeNull(); // lo decide palabrasClave (frecuentes primero)
    expect(pedidoServicio("pagar mi cuota")).toBeNull();
    expect(pedidoServicio("mis pagos de siempre")).toBeNull();
  });

  it("interpretar: servicio con código; la luz sin frecuente sigue siendo por rubro", () => {
    expect(interpretar("paga Enosa 31264587", [{ id: 1, alias: "Luz de mamá", rubro: "LUZ" }])).toEqual({
      tipo: "SERVICIO",
      rubro: "LUZ",
      empresa: "Enosa",
      codigo: "31264587",
    });
    expect(interpretar("pagar servicios", [])).toMatchObject({ tipo: "SERVICIO" });
    expect(interpretar("pagar el agua", [])).toEqual({ tipo: "RUBRO_SIN_FRECUENTE", rubro: "AGUA" });
    expect(interpretar("pagar la luz de mi mamá", [{ id: 1, alias: "Luz de mamá", rubro: "LUZ" }])).toEqual({ tipo: "FRECUENTE", ids: [1] });
  });
});
