import { describe, expect, it } from "vitest";
import { pedidoEnvio } from "./envio.js";
import { interpretar } from "./palabrasClave.js";

describe("envíos a contacto en el chat (solo se entiende el pedido; no se envía nada)", () => {
  it("entiende a quién, cuánto y por dónde", () => {
    expect(pedidoEnvio("quiero que le yapees a sergio 50 soles")).toEqual({ nombre: "sergio", monto: 50, billetera: "YAPE" });
    expect(pedidoEnvio("quiero yapear a brian")).toEqual({ nombre: "brian", monto: null, billetera: "YAPE" });
    expect(pedidoEnvio("plinéale S/ 20.50 a mi mamá")).toEqual({ nombre: "mama", monto: 20.5, billetera: "PLIN" });
    expect(pedidoEnvio("yapéale 30 a Sergio")).toEqual({ nombre: "sergio", monto: 30, billetera: "YAPE" });
    expect(pedidoEnvio("transfiere 100 soles a mi hijo")).toEqual({ nombre: "hijo", monto: 100, billetera: null });
    expect(pedidoEnvio("mándale cincuenta a lucía por dale")).toEqual({ nombre: "lucia", monto: 50, billetera: "DALE" });
    expect(pedidoEnvio("quiero yapear")).toEqual({ nombre: null, monto: null, billetera: "YAPE" });
  });

  it("un celular en el texto no es el monto", () => {
    expect(pedidoEnvio("yapea 30 al 987654321")).toMatchObject({ monto: 30 });
  });

  it("transferencias que no son a un contacto siguen ofreciendo los tipos", () => {
    expect(pedidoEnvio("quiero transferir")).toBeNull();
    expect(pedidoEnvio("transferir a otra cuenta")).toBeNull();
    expect(pedidoEnvio("transferencia a otro banco")).toBeNull();
    expect(interpretar("quiero transferir", [])).toEqual({ tipo: "TRANSFERIR", envio: null });
  });

  it("la clave sigue primero y Plin no se confunde con pin", () => {
    expect(interpretar("dame mi clave para yapear", []).tipo).toBe("CLAVE_PEDIDA");
    expect(interpretar("plinea a sergio", [])).toMatchObject({ tipo: "TRANSFERIR", envio: { nombre: "sergio", billetera: "PLIN" } });
  });
});
