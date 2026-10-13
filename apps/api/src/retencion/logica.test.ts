import { describe, expect, it } from "vitest";
import {
  armarEmbudo,
  calcularNotificaciones,
  debeSugerirEstandar,
  diasHastaDiaHabitual,
  msASeg,
  siguienteRecibo,
  sumarMes,
  tasaExitoSinAyuda,
} from "./logica.js";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("siguienteRecibo", () => {
  const base = { servicioId: 1, codigo: "45781236", titular: "MARIA PEREZ", monto: 85.4, vencimiento: d("2026-10-15") };
  it("mismo servicio, código y titular; vence un mes después", () => {
    const s = siguienteRecibo(base, () => 0.5);
    expect(s).toMatchObject({ servicioId: 1, codigo: "45781236", titular: "MARIA PEREZ", monto: 85.4 });
    expect(s.vencimiento.toISOString().slice(0, 10)).toBe("2026-11-15");
  });
  it("monto dentro de ±10 %", () => {
    expect(siguienteRecibo(base, () => 0).monto).toBe(76.86);
    expect(siguienteRecibo(base, () => 0.9999999).monto).toBeCloseTo(93.94, 1);
  });
  it("31 de enero → fin de febrero", () => {
    expect(sumarMes(d("2027-01-31")).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

describe("calcularNotificaciones", () => {
  const hoy = d("2026-11-09");
  it("redacta cuota y frecuente que vencen pronto", () => {
    const n = calcularNotificaciones(hoy, 20, [
      { tipo: "FRECUENTE", alias: "Luz de mamá", monto: 87.1, vencimiento: d("2026-11-11") },
      { tipo: "CUOTA", monto: 350, vencimiento: d("2026-11-12") },
    ]);
    expect(n).toEqual(["Luz de mamá · S/ 87.10 · vence el 11", "Tu cuota de S/ 350.00 vence en 3 días"]);
  });
  it("si nada vence en ≤ 3 días, muestra el más próximo", () => {
    const n = calcularNotificaciones(hoy, 28, [
      { tipo: "CUOTA", monto: 350, vencimiento: d("2026-11-20") },
      { tipo: "FRECUENTE", alias: "Agua", monto: 30, vencimiento: d("2026-11-18") },
    ]);
    expect(n).toEqual(["Agua · S/ 30.00 · vence el 18"]);
  });
  it("cerca del día de pago habitual, avisa todo lo del mes", () => {
    const n = calcularNotificaciones(hoy, 10, [
      { tipo: "CUOTA", monto: 350, vencimiento: d("2026-11-20") },
      { tipo: "FRECUENTE", alias: "Agua", monto: 30, vencimiento: d("2026-11-18") },
    ]);
    expect(n).toHaveLength(2);
  });
  it("hoy, mañana y vencido", () => {
    expect(calcularNotificaciones(hoy, 1, [{ tipo: "CUOTA", monto: 350, vencimiento: hoy }])).toEqual(["Tu cuota de S/ 350.00 vence hoy"]);
    expect(calcularNotificaciones(hoy, 1, [{ tipo: "CUOTA", monto: 350, vencimiento: d("2026-11-06") }])).toEqual([
      "Tu cuota de S/ 350.00 venció hace 3 días",
    ]);
  });
  it("sin pendientes, sin avisos", () => {
    expect(calcularNotificaciones(hoy, 1, [])).toEqual([]);
  });
  it("días hasta el día habitual cruza de mes", () => {
    expect(diasHastaDiaHabitual(d("2026-11-29"), 2)).toBe(3);
    expect(diasHastaDiaHabitual(d("2026-11-09"), 12)).toBe(3);
  });
});

describe("KPIs", () => {
  it("tasa de éxito sin ayuda", () => {
    expect(tasaExitoSinAyuda(6, 8, 2)).toBe(0.6);
    expect(tasaExitoSinAyuda(0, 0, 0)).toBe(0);
  });
  it("embudo en orden del flujo y agrega otras pantallas con abandonos", () => {
    const e = armarEmbudo([
      { pantalla: "confirmar", accion: "ver", n: 5 },
      { pantalla: "confirmar", accion: "abandonar", n: 1 },
      { pantalla: "inicio", accion: "ver", n: 9 },
      { pantalla: "ayuda", accion: "abandonar", n: 2 },
      { pantalla: "progreso", accion: "ver", n: 3 },
    ]);
    expect(e.map((f) => f.pantalla)).toEqual(["inicio", "pagar-creditos", "pagar-servicios", "pagar-frecuentes", "confirmar", "exito", "ayuda"]);
    expect(e[4]).toEqual({ pantalla: "confirmar", vistas: 5, abandonos: 1 });
  });
  it("ms a segundos", () => {
    expect(msASeg(45678)).toBe(45.7);
    expect(msASeg(null)).toBeNull();
  });
  it("sugerir vista estándar solo con asistida y ≥ 3 pagos sin ayuda", () => {
    expect(debeSugerirEstandar("ASISTIDA", 3)).toBe(true);
    expect(debeSugerirEstandar("ASISTIDA", 2)).toBe(false);
    expect(debeSugerirEstandar("ESTANDAR", 5)).toBe(false);
  });
});
