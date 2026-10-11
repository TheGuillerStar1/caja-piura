import { describe, expect, it } from "vitest";
import { pedidoCuenta, pedidoEnvio } from "./envio.js";
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
    expect(interpretar("quiero transferir", [])).toEqual({ tipo: "TRANSFERIR", envio: null, cuenta: null });
  });

  it("la clave sigue primero y Plin no se confunde con pin", () => {
    expect(interpretar("dame mi clave para yapear", []).tipo).toBe("CLAVE_PEDIDA");
    expect(interpretar("plinea a sergio", [])).toMatchObject({ tipo: "TRANSFERIR", envio: { nombre: "sergio", billetera: "PLIN" } });
  });
});

describe("transferencias a una cuenta en el chat (solo se entiende el pedido)", () => {
  it("reconoce el tipo, el número y el monto", () => {
    expect(pedidoCuenta("transfiere 100 a la cuenta 00110200000002")).toEqual({ tipo: "TERCEROS", destino: "00110200000002", monto: 100 });
    expect(pedidoCuenta("quiero transferir a otra cuenta")).toEqual({ tipo: "TERCEROS", destino: null, monto: null });
    expect(pedidoCuenta("pasa 50 soles a mi otra cuenta")).toEqual({ tipo: "PROPIAS", destino: null, monto: 50 });
    expect(pedidoCuenta("transferir entre mis cuentas")).toEqual({ tipo: "PROPIAS", destino: null, monto: null });
    expect(pedidoCuenta("transferencia a otro banco de 200")).toEqual({ tipo: "INTERBANCARIA", destino: null, monto: 200 });
    expect(pedidoCuenta("envía 80 al CCI 00212345678901234567")).toEqual({ tipo: "INTERBANCARIA", destino: "00212345678901234567", monto: 80 });
  });

  it("no confunde envíos a contactos ni pedidos sin transferir", () => {
    expect(pedidoCuenta("yapéale 50 a Sergio")).toBeNull();
    expect(pedidoCuenta("quiero transferir")).toBeNull();
    expect(pedidoCuenta("ver mi cuenta")).toBeNull();
  });

  it("interpretar: cuenta antes que contacto", () => {
    expect(interpretar("transfiere 100 a la cuenta 00110200000002", [])).toMatchObject({ tipo: "TRANSFERIR", cuenta: { tipo: "TERCEROS" }, envio: null });
    expect(interpretar("yapea 20 a sergio", [])).toMatchObject({ tipo: "TRANSFERIR", cuenta: null, envio: { nombre: "sergio" } });
  });
});
