import { SegmentoCampana } from "@cp/shared";
import { describe, expect, it } from "vitest";
import { alcance, enSegmento, type PerfilGestion, proyectarCampana, ubigeoDe } from "./logica.js";

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
