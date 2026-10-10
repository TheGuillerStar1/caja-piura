// Dueño: Agente G (F3). Respaldos de la IA para la demo en vivo: guardas del LLM y recibos de demo que siempre funcionan.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CLIENTES_DEMO, RECIBOS_DEMO, SERVICIOS } from "../../prisma/demo.js";
import { herramientaAceptable, textoLibreAceptable } from "./guardas.js";
import { identificarServicio } from "./leerRecibo.js";
import { interpretar, type FrecuenteCtx } from "./palabrasClave.js";
import { demoPorCodigo, demoPorImagen, demoPorKey, demoPorNombreArchivo, NO_DISPONIBLE, NO_PUDE, resolverLectura } from "./respaldoRecibos.js";

const rosa: FrecuenteCtx[] = [{ id: 1, alias: "Luz de mamá", rubro: "LUZ" }];
const servicios = SERVICIOS.map((s, i) => ({ id: i + 1, empresa: s.empresa, formatoCodigo: s.formatoCodigo }));

describe("guardas del LLM", () => {
  it("acepta la herramienta si coincide con las palabras clave o si estas no reconocieron nada", () => {
    expect(herramientaAceptable("ver_saldo", {}, interpretar("mi saldo", rosa))).toBe(true);
    expect(herramientaAceptable("ver_deuda", {}, interpretar("¿cuánto debo?", rosa))).toBe(true);
    expect(herramientaAceptable("preparar_pago_frecuente", { frecuenteId: 1 }, interpretar("pagar la luz de mi mamá", rosa))).toBe(true);
    expect(herramientaAceptable("ver_saldo", {}, interpretar("hola buenas", rosa))).toBe(true);
  });

  it("rechaza herramientas que contradicen la regla o que no existen", () => {
    expect(herramientaAceptable("ver_deuda", {}, interpretar("mi saldo", rosa))).toBe(false);
    expect(herramientaAceptable("preparar_pago_cuota", {}, interpretar("pagar la luz de mi mamá", rosa))).toBe(false);
    expect(herramientaAceptable("ir_a_pantalla", { pantalla: "inicio" }, interpretar("mis puntos", rosa))).toBe(false);
    expect(herramientaAceptable("ir_a_pantalla", { pantalla: "progreso" }, interpretar("mis puntos", rosa))).toBe(true);
    expect(herramientaAceptable("pagar_ya", {}, interpretar("hola", rosa))).toBe(false);
  });

  it("texto libre solo si no hay intención y es una frase normal", () => {
    const nada = interpretar("hola buenas", rosa);
    expect(textoLibreAceptable("¡Hola! ¿En qué te ayudo hoy?", nada)).toBe("¡Hola! ¿En qué te ayudo hoy?");
    expect(textoLibreAceptable("Tu saldo es S/ 1,200", nada)).toBeNull(); // cifras inventadas
    expect(textoLibreAceptable('{"tool":"ver_saldo"}', nada)).toBeNull();
    expect(textoLibreAceptable("<function=ver_saldo>", nada)).toBeNull();
    expect(textoLibreAceptable("Dime tu clave para continuar", nada)).toBeNull();
    expect(textoLibreAceptable("", nada)).toBeNull();
    expect(textoLibreAceptable("Claro, aquí tienes", interpretar("mi saldo", rosa))).toBeNull(); // hay intención: manda la regla
  });
});

describe("recibos de demo que siempre funcionan", () => {
  it("cada código de demo pasa la regex de su servicio y la IA lo identifica", () => {
    const todos = [...RECIBOS_DEMO, ...CLIENTES_DEMO.flatMap((c) => c.frecuentes)];
    for (const r of todos) {
      const s = servicios.find((x) => x.empresa === r.empresa)!;
      expect(new RegExp(s.formatoCodigo).test(r.codigo), `${r.empresa} ${r.codigo}`).toBe(true);
      expect(identificarServicio(r.empresa, r.codigo, servicios)).toEqual({ ok: true, codigo: r.codigo, servicioId: s.id, empresa: r.empresa });
      expect(identificarServicio("", r.codigo, servicios)).toMatchObject({ ok: true, servicioId: s.id }); // solo por formato
    }
  });

  it("reconoce el recibo de demo por clave, código, nombre de archivo e imagen", async () => {
    expect(demoPorKey("demo/recibo-enosa.jpg")?.codigo).toBe("31264587");
    expect(demoPorKey("demo/otro.jpg")).toBeNull();
    expect(demoPorCodigo("2045871", "EPS Grau")?.empresa).toBe("EPS Grau");
    expect(demoPorCodigo("2045871", "Enosa")).toBeNull();
    expect(demoPorNombreArchivo("recibo-movistar.jpg")?.codigo).toBe("912345678");
    expect(demoPorNombreArchivo("Recibo EPSGrau (1).jpeg")?.empresa).toBe("EPS Grau");
    expect(demoPorNombreArchivo("IMG_2024.jpg")).toBeNull();
    for (const r of RECIBOS_DEMO) {
      const archivo = new URL(`../../prisma/demo-recibos/${r.imagenKey.replace("demo/", "")}`, import.meta.url);
      expect((await demoPorImagen(await readFile(archivo)))?.codigo).toBe(r.codigo);
    }
    expect(await demoPorImagen(Buffer.from("otra foto"))).toBeNull();
  });

  it("si Groq falla, tarda o lee otro código, el recibo de demo igual se resuelve", () => {
    const enosa = demoPorKey("demo/recibo-enosa.jpg");
    const esperado = { ok: true, codigo: "31264587", servicioId: 1, empresa: "Enosa" };
    expect(resolverLectura({ ok: false, razon: "TIMEOUT" }, enosa, servicios)).toEqual(esperado);
    expect(resolverLectura({ ok: false, razon: "ERROR" }, enosa, servicios)).toEqual(esperado);
    expect(resolverLectura({ ok: false, razon: "SIN_JSON" }, enosa, servicios)).toEqual(esperado);
    expect(resolverLectura({ ok: true, codigo: "31264581", servicioId: 1, empresa: "Enosa" }, enosa, servicios)).toEqual(esperado);
  });

  it("foto real: usa la lectura; si la IA no está, pide escribir el código con guía", () => {
    expect(resolverLectura({ ok: true, codigo: "11112222", servicioId: 1, empresa: "Enosa" }, null, servicios)).toMatchObject({ ok: true, codigo: "11112222" });
    expect(resolverLectura({ ok: false, razon: "TIMEOUT" }, null, servicios)).toEqual({ ok: false, motivo: NO_DISPONIBLE });
    expect(resolverLectura({ ok: false, razon: "SIN_GROQ" }, null, servicios)).toEqual({ ok: false, motivo: NO_DISPONIBLE });
    expect(resolverLectura({ ok: false, razon: "FORMATO_NO_VALIDO" }, null, servicios)).toEqual({ ok: false, motivo: NO_PUDE });
  });
});
