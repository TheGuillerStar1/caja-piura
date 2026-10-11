import { SegmentoCampana } from "@cp/shared";
import { describe, expect, it } from "vitest";
import { alcance, enSegmento, grupoDePago, pagosATiempo, pagosSinAyuda, type PerfilGestion, proyectarCampana, ubigeoDe, vuelvenAPagar } from "./logica.js";

const base: PerfilGestion = {
  id: 1,
  edad: 50,
  ocupacion: "AGRICULTOR",
  zona: "RURAL",
  distrito: "Tambogrande",
  opsPresencialesMes: 8,
  opsDigitalesMes: 2,
  gamaDispositivo: "MEDIA",
};
const seg = (s: Partial<SegmentoCampana> = {}) => SegmentoCampana.parse(s);

// 400 perfiles variados y reproducibles.
const perfiles: PerfilGestion[] = Array.from({ length: 400 }, (_, i) => ({
  ...base,
  id: i + 1,
  edad: 22 + (i % 50),
  ocupacion: (["COMERCIANTE", "AGRICULTOR", "TRANSPORTISTA", "OTRO"] as const)[i % 4],
  distrito: i % 2 ? "Tambogrande" : "Castilla",
  zona: i % 2 ? "RURAL" : "URBANA",
  opsPresencialesMes: 2 + (i % 9),
  opsDigitalesMes: i % 5,
  gamaDispositivo: (["BAJA", "MEDIA", "ALTA"] as const)[i % 3],
}));

describe("centro de mando: segmentos", () => {
  it("mapea los distritos de la base a ubigeos del GeoJSON", () => {
    expect(ubigeoDe("Tambogrande")).toBe("200114");
    expect(ubigeoDe("Veintiséis de Octubre")).toBe(ubigeoDe("Piura"));
    expect(ubigeoDe("Talara")).toBe("200701");
    expect(ubigeoDe("Lima")).toBeNull();
  });

  it("filtra por distrito, ocupación, gama, edad y uso de ventanilla", () => {
    expect(enSegmento(base, seg())).toBe(true);
    expect(enSegmento(base, seg({ distritos: ["200114"] }))).toBe(true);
    expect(enSegmento(base, seg({ distritos: ["200104"] }))).toBe(false);
    expect(enSegmento(base, seg({ ocupaciones: ["COMERCIANTE"] }))).toBe(false);
    expect(enSegmento(base, seg({ gamas: ["MEDIA", "ALTA"] }))).toBe(true);
    expect(enSegmento(base, seg({ edadMin: 51 }))).toBe(false);
    expect(enSegmento(base, seg({ soloVentanilla: true }))).toBe(true);
    expect(enSegmento({ ...base, opsDigitalesMes: 9 }, seg({ soloVentanilla: true }))).toBe(false);
  });

  it("el alcance separa quienes reciben el aviso en la app y por SMS", () => {
    const a = alcance(perfiles, seg());
    expect(a.clientes).toBe(400);
    expect(a.porApp + a.porSms).toBe(400);
    expect(a.porSms).toBe(80); // opsDigitalesMes = 0 en 1 de cada 5
  });
});

describe("centro de mando: proyección de campañas", () => {
  const campana = (dias: number, accion: "AVISO" | "RECORDATORIO_CUOTA" | "CASHBACK_DOBLE" = "AVISO") =>
    proyectarCampana({ accion, segmento: seg(), diasSimulados: dias }, perfiles);

  it("sin días simulados no hay resultados todavía", () => {
    const r = campana(0);
    expect(r.embudo).toEqual({ enviados: 0, abrieron: 0, pagaron: 0, siguenUsando: 0 });
    expect(r.alcance.clientes).toBe(400);
    expect(r.costo).toBe(0);
  });

  it("el embudo es decreciente y solo crece al simular más días", () => {
    const [d30, d60, d90] = [campana(30), campana(60), campana(90)];
    for (const r of [d30, d60, d90]) {
      expect(r.embudo.enviados).toBe(400);
      expect(r.embudo.abrieron).toBeLessThanOrEqual(r.embudo.enviados);
      expect(r.embudo.pagaron).toBeLessThanOrEqual(r.embudo.abrieron);
      expect(r.embudo.siguenUsando).toBeLessThanOrEqual(r.embudo.pagaron);
    }
    expect(d60.embudo.pagaron).toBeGreaterThanOrEqual(d30.embudo.pagaron);
    expect(d90.embudo.pagaron).toBeGreaterThanOrEqual(d60.embudo.pagaron);
    expect(d90.ahorroMes).toBeGreaterThan(0);
  });

  it("es determinista, sin «0 pagaron» por azar en segmentos chicos, y el cashback doble convierte más pero cuesta más", () => {
    const chico = proyectarCampana({ accion: "AVISO", segmento: seg(), diasSimulados: 60 }, perfiles.slice(0, 15));
    expect(chico.embudo.pagaron).toBeGreaterThan(0);
    expect(campana(60)).toEqual(campana(60));
    const aviso = campana(60, "AVISO");
    const doble = campana(60, "CASHBACK_DOBLE");
    expect(doble.embudo.pagaron).toBeGreaterThan(aviso.embudo.pagaron);
    expect(doble.costo).toBeGreaterThan(aviso.costo);
  });
});

describe("¿está funcionando?: vuelven a pagar y pagan a tiempo", () => {
  const d = (s: string) => new Date(`${s}T15:00:00Z`);

  it("vuelven a pagar: solo cuenta a quien ya tuvo tiempo de repetir, y exige otro pago ≥ 20 días después", () => {
    const r = vuelvenAPagar([
      { hoy: d("2026-11-12"), pagos: [d("2026-10-12"), d("2026-11-11")] }, // repitió al mes siguiente
      { hoy: d("2026-11-12"), pagos: [d("2026-10-12"), d("2026-10-13")] }, // dos pagos el mismo mes: no repitió
      { hoy: d("2026-11-12"), pagos: [d("2026-10-12")] }, // un solo pago hace un mes: no repitió
      { hoy: d("2026-10-20"), pagos: [d("2026-10-12")] }, // pagó hace 8 días: aún no tuvo oportunidad
      { hoy: d("2026-11-12"), pagos: [] },
    ]);
    expect(r).toEqual({ elegibles: 3, repitieron: 1, tasa: 1 / 3 });
    expect(vuelvenAPagar([{ hoy: d("2026-10-13"), pagos: [d("2026-10-12")] }]).tasa).toBeNull();
  });

  it("pagan a tiempo: el mismo día del vencimiento cuenta como a tiempo", () => {
    const r = pagosATiempo([
      { pagado: d("2026-10-10"), vencimiento: d("2026-10-15") }, // 5 días antes
      { pagado: d("2026-10-15"), vencimiento: d("2026-10-15") }, // el mismo día
      { pagado: d("2026-10-18"), vencimiento: d("2026-10-15") }, // tarde
    ]);
    expect(r).toEqual({ cuotas: 3, aTiempo: 2, tasa: 2 / 3, diasAnticipacion: 1.7 });
    expect(pagosATiempo([])).toEqual({ cuotas: 0, aTiempo: 0, tasa: null, diasAnticipacion: null });
    // Adelantar una cuota de dentro de 3 meses cuenta como a tiempo, pero su anticipación se limita a 31 días.
    expect(pagosATiempo([{ pagado: d("2026-10-10"), vencimiento: d("2027-01-21") }]).diasAnticipacion).toBe(31);
  });
});

describe("¿está funcionando?: desglose por tipo de operación", () => {
  it("pagan solos: crédito, servicios (frecuentes + recibos) y yapeo; los abandonos cuentan como intentos de su tipo", () => {
    const r = pagosSinAyuda({
      pagos: [
        { tipo: "CUOTA", registrados: 4, sinAyuda: 3 },
        { tipo: "FRECUENTE", registrados: 2, sinAyuda: 1 },
        { tipo: "RECIBO", registrados: 2, sinAyuda: 2 },
      ],
      abandonos: [
        { flujo: "CUOTA", n: 2 },
        { flujo: null, n: 1 }, // abandono sin tipo: solo cuenta en el total
      ],
      yapeos: { total: 5, sinAyuda: 4 },
    });
    expect(r.desglose).toEqual([
      { id: "CREDITO", tasa: 0.5, logrados: 3, total: 6 },
      { id: "SERVICIOS", tasa: 0.75, logrados: 3, total: 4 },
      { id: "YAPEO", tasa: 0.8, logrados: 4, total: 5 },
    ]);
    expect(r).toMatchObject({ exitososSinAyuda: 10, intentos: 16, tasa: 0.625 });
  });

  it("sin intentos de un tipo, su tasa es null (aún sin datos)", () => {
    const r = pagosSinAyuda({ pagos: [], abandonos: [], yapeos: { total: 0, sinAyuda: 0 } });
    expect(r.tasa).toBe(0);
    expect(r.desglose.map((f) => f.tasa)).toEqual([null, null, null]);
    expect(grupoDePago("RECIBO")).toBe("SERVICIOS");
    expect(grupoDePago("LOGIN")).toBeNull();
  });
});
