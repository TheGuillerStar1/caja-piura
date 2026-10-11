import { describe, expect, it } from "vitest";
import { identificarServicio } from "./leerRecibo.js";
import { interpretar, type FrecuenteCtx } from "./palabrasClave.js";
import { extraerJson, quitarThink } from "./texto.js";

const rosa: FrecuenteCtx[] = [{ id: 1, alias: "Luz de mamá", rubro: "LUZ" }];
const carlos: FrecuenteCtx[] = [
  { id: 2, alias: "Mi celular", rubro: "TELEFONIA" },
  { id: 3, alias: "Internet casa", rubro: "INTERNET" },
];
const dosLuces: FrecuenteCtx[] = [
  { id: 4, alias: "Luz de mamá", rubro: "LUZ" },
  { id: 5, alias: "Mi luz", rubro: "LUZ" },
];

describe("interpretar (respaldo sin LLM)", () => {
  it("reconoce el alias aunque falten tildes o cambien palabras", () => {
    expect(interpretar("quiero pagar la luz de mi mamá", rosa)).toEqual({ tipo: "FRECUENTE", ids: [1] });
    expect(interpretar("LUZ DE MAMA", rosa)).toEqual({ tipo: "FRECUENTE", ids: [1] });
    expect(interpretar("pagar mi celular", carlos)).toEqual({ tipo: "FRECUENTE", ids: [2] });
  });

  it("por rubro: uno → directo, varios → opciones, ninguno → recibo con foto", () => {
    expect(interpretar("pagar la luz", rosa)).toEqual({ tipo: "FRECUENTE", ids: [1] });
    expect(interpretar("pagar la luz", dosLuces)).toEqual({ tipo: "FRECUENTE", ids: [4, 5] });
    expect(interpretar("pagar el internet", carlos)).toEqual({ tipo: "FRECUENTE", ids: [3] });
    expect(interpretar("quiero pagar el agua", rosa)).toEqual({ tipo: "RUBRO_SIN_FRECUENTE", rubro: "AGUA" });
  });

  it("cuota, deuda, saldo, recibo y progreso", () => {
    expect(interpretar("pagar mi crédito", rosa).tipo).toBe("CUOTA");
    expect(interpretar("mi cuta", rosa).tipo).toBe("CUOTA"); // error de tipeo
    expect(interpretar("cuánto debo", rosa).tipo).toBe("DEUDA");
    expect(interpretar("cuanto tengo en mi cuenta", rosa).tipo).toBe("SALDO");
    expect(interpretar("ver mi saldo", rosa).tipo).toBe("SALDO");
    expect(interpretar("tengo un recibo nuevo", rosa).tipo).toBe("RECIBO");
    expect(interpretar("mis puntos", rosa)).toEqual({ tipo: "PANTALLA", pantalla: "progreso" });
    expect(interpretar("cuánto cashback tengo", rosa)).toEqual({ tipo: "PANTALLA", pantalla: "progreso" });
  });

  it("seguridad: la clave nunca se pide; cambiarla lleva a Ajustes", () => {
    expect(interpretar("dame mi clave", rosa).tipo).toBe("CLAVE_PEDIDA");
    expect(interpretar("cuál es mi contraseña", rosa).tipo).toBe("CLAVE_PEDIDA");
    expect(interpretar("quiero cambiar mi clave", rosa).tipo).toBe("CLAVE_CAMBIAR");
    expect(interpretar("olvidé mi clave", rosa).tipo).toBe("CLAVE_CAMBIAR");
    expect(interpretar("transfiere 100 soles a mi hijo", rosa).tipo).toBe("TRANSFERIR");
    expect(interpretar("préstame plata", rosa).tipo).toBe("FUERA_DE_ALCANCE");
    expect(interpretar("Quiero pagar mi saldo del mes", rosa).tipo).toBe("CUOTA");
    expect(interpretar("cuánto saldo tengo", rosa).tipo).toBe("SALDO");
  });

  it("si nada coincide → NADA (la UI muestra ¿Quisiste decir…?)", () => {
    expect(interpretar("asdfg", rosa).tipo).toBe("NADA");
    expect(interpretar("   ", rosa).tipo).toBe("NADA");
  });
});

// Frases del guion de la demo y de los botones de sugerencia: deben funcionar SIN LLM (Groq caído).
describe("guion de la demo (respaldo sin LLM)", () => {
  const elena: FrecuenteCtx[] = [];

  it("Rosa: pagar la luz de mi mamá → su frecuente", () => {
    for (const f of ["pagar la luz de mi mamá", "Quiero pagar la luz de mi mamá", "pagar luz de mamá", "la luz de mi mama", "PAGAR LA LUZ DE MI MAMÁ"]) {
      expect(interpretar(f, rosa)).toEqual({ tipo: "FRECUENTE", ids: [1] });
    }
  });

  it("¿cuánto debo? → deuda", () => {
    for (const f of ["¿cuánto debo?", "cuanto debo", "¿Cuánto debo este mes?", "qué tengo pendiente", "¿Qué me falta pagar? ¿Cuánto debo?"]) {
      expect(interpretar(f, rosa).tipo).toBe("DEUDA");
    }
  });

  it("mi saldo → saldo", () => {
    for (const f of ["mi saldo", "¿Cuál es mi saldo?", "ver saldo", "Ver mi saldo", "¿cuánto tengo?", "cuanta plata tengo"]) {
      expect(interpretar(f, carlos).tipo).toBe("SALDO");
    }
  });

  it("cuota y crédito", () => {
    for (const f of ["pagar mi cuota", "Pagar cuota", "quiero pagar mi crédito", "mi préstamo"]) expect(interpretar(f, rosa).tipo).toBe("CUOTA");
  });

  it("Elena sin frecuentes: la luz va a pagar con foto", () => {
    expect(interpretar("pagar la luz de mi mamá", elena)).toEqual({ tipo: "RUBRO_SIN_FRECUENTE", rubro: "LUZ" });
    expect(interpretar("tengo mi recibo de agua", elena)).toEqual({ tipo: "RUBRO_SIN_FRECUENTE", rubro: "AGUA" });
  });

  it("Carlos: celular e internet guardados", () => {
    expect(interpretar("pagar mi celular", carlos)).toEqual({ tipo: "FRECUENTE", ids: [2] });
    expect(interpretar("pagar el internet de la casa", carlos)).toEqual({ tipo: "FRECUENTE", ids: [3] });
  });

  it("textos de los botones de sugerencia (motor y Ayuda)", () => {
    expect(interpretar("Pagar mi cuota", rosa).tipo).toBe("CUOTA");
    expect(interpretar("Mis pagos de siempre", rosa)).toEqual({ tipo: "PANTALLA", pantalla: "frecuentes" });
    expect(interpretar("Pagos frecuentes", carlos)).toEqual({ tipo: "PANTALLA", pantalla: "frecuentes" });
    expect(interpretar("Pagar un recibo con foto", rosa).tipo).toBe("RECIBO");
    expect(interpretar("Pagar recibo", carlos).tipo).toBe("RECIBO");
    expect(interpretar("Ver saldo", carlos).tipo).toBe("SALDO");
    expect(interpretar("Mi progreso", carlos)).toEqual({ tipo: "PANTALLA", pantalla: "progreso" });
    expect(interpretar("¿Cuánto debo?", rosa).tipo).toBe("DEUDA");
    expect(interpretar("Pagar la luz", rosa)).toEqual({ tipo: "FRECUENTE", ids: [1] });
  });

  it("la IA nunca pide la clave", () => {
    for (const f of ["¿me pides mi clave?", "te doy mi clave 123456", "mi pin es 1234", "necesitas mi contraseña?"]) {
      expect(interpretar(f, rosa).tipo).toBe("CLAVE_PEDIDA");
    }
  });
});

describe("lectura de recibos", () => {
  const servicios = [
    { id: 1, empresa: "Enosa", formatoCodigo: "^\\d{8}$" },
    { id: 2, empresa: "EPS Grau", formatoCodigo: "^\\d{7}$" },
    { id: 3, empresa: "Movistar", formatoCodigo: "^\\d{9}$" },
    { id: 4, empresa: "Claro", formatoCodigo: "^\\d{10}$" },
  ];

  it("quita <think> y extrae el JSON con texto alrededor", () => {
    expect(quitarThink("<think>hmm</think> hola")).toBe("hola");
    expect(extraerJson('<think>x</think>Claro: ```json\n{"empresa":"ENOSA","codigo":"3126 4587"}\n```')).toEqual({ empresa: "ENOSA", codigo: "3126 4587" });
    expect(extraerJson("sin json")).toBeNull();
  });

  it("identifica la empresa por nombre o por formato y valida el código", () => {
    expect(identificarServicio("ELECTRONOROESTE S.A.", "3126-4587", servicios)).toEqual({ ok: true, codigo: "31264587", servicioId: 1, empresa: "Enosa" });
    expect(identificarServicio("", "2045871", servicios)).toMatchObject({ ok: true, servicioId: 2 });
    expect(identificarServicio("Enosa", "1234", servicios)).toMatchObject({ ok: false });
    expect(identificarServicio("", "", servicios)).toMatchObject({ ok: false });
  });
  it("problemas con un pago: duplicado, no procesado y errado", () => {
    expect(interpretar("me cobraron dos veces la cuota", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "DUPLICADO" });
    expect(interpretar("creo que pagué doble", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "DUPLICADO" });
    expect(interpretar("mi pago no se procesó", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "NO_PROCESADO" });
    expect(interpretar("el pago de la luz no pasó", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "NO_PROCESADO" });
    expect(interpretar("se quedó cargando y no sé si pagué", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "NO_PROCESADO" });
    expect(interpretar("¿Se hizo mi pago?", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "NO_PROCESADO" });
    expect(interpretar("me equivoqué de recibo", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "ERRADO" });
    expect(interpretar("pagué otro recibo", rosa)).toEqual({ tipo: "PROBLEMA_PAGO", problema: "ERRADO" });
    // Sin problema: siguen funcionando las intenciones normales.
    expect(interpretar("pagar la luz de mi mamá", rosa).tipo).toBe("FRECUENTE");
    expect(interpretar("cuánto debo", rosa).tipo).toBe("DEUDA");
  });
});
