import { describe, expect, it } from "vitest";
import { armarRecorridos, pasoDe, type EventoRecorrido } from "./logica.js";

const ev = (sesionId: string, flujo: string, pantalla: string, accion: string, ayudaUsada = false): EventoRecorrido => ({ sesionId, flujo, pantalla, accion, ayudaUsada });

describe("armarRecorridos", () => {
  const eventos: EventoRecorrido[] = [
    // a: paga la cuota sola
    ev("a", "CUOTA", "pagar-creditos", "ver"), ev("a", "CUOTA", "confirmar", "ver"), ev("a", "CUOTA", "exito", "completar"),
    // b: paga la cuota con ayuda de Pía
    ev("b", "CUOTA", "confirmar", "ver"), ev("b", "CUOTA", "confirmar", "ayuda", true), ev("b", "CUOTA", "exito", "completar"),
    // c: se queda eligiendo qué pagar
    ev("c", "CUOTA", "pagar-creditos", "ver"),
    // d: recibo con un error (código mal escrito) y aun así paga
    ev("d", "RECIBO", "pagar-servicios", "ver"), ev("d", "RECIBO", "pagar-servicios", "error"), ev("d", "RECIBO", "confirmar", "ver"), ev("d", "RECIBO", "exito", "completar"),
    // e: llega a confirmar el recibo y no paga
    ev("e", "RECIBO", "pagar-servicios", "ver"), ev("e", "RECIBO", "confirmar", "ver"),
    // f: frecuente pagado desde el chat
    ev("f", "FRECUENTE", "pago-chat", "completar"),
    // eventos de otros flujos no cuentan
    ev("g", "LOGIN", "entrar", "completar"),
  ];
  const r = Object.fromEntries(armarRecorridos(eventos).map((x) => [x.tramite, x]));

  it("cuenta cuántos empezaron, llegaron a confirmar y pagaron (solos)", () => {
    expect(r.CUOTA).toMatchObject({ empezaron: 3, llegaronAConfirmar: 2, pagaron: 2, pagaronSinAyuda: 1 });
    expect(r.RECIBO).toMatchObject({ empezaron: 2, llegaronAConfirmar: 2, pagaron: 1, pagaronSinAyuda: 1 });
    expect(r.FRECUENTE).toMatchObject({ empezaron: 1, pagaron: 1, llegaronAConfirmar: 1 });
  });
  it("mide la recuperación de errores", () => {
    expect(r.RECIBO).toMatchObject({ conError: 1, seRecuperaron: 1 });
    expect(r.CUOTA.conError).toBe(0);
  });
  it("dice en qué paso se quedó quien no pagó", () => {
    expect(r.CUOTA.seQuedaron).toEqual([{ paso: "Elegir qué pagar", n: 1 }]);
    expect(r.RECIBO.seQuedaron).toEqual([{ paso: "Confirmar el pago", n: 1 }]);
  });
  it("traduce pantallas a pasos", () => {
    expect(pasoDe("pagar-servicios")).toBe("Buscar el recibo");
    expect(pasoDe("pago-fallido")).toBe("Confirmar el pago");
    expect(pasoDe("pagos")).toBe("Entrar al trámite");
  });
});
