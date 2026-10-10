"use client";
// F0. Telemetría: cada pantalla registra eventos para los 3 indicadores (éxito sin ayuda, tiempo, abandono).
// Uso: track("confirmar", "ver", { flujo: "CUOTA" }); iniciarFlujo("CUOTA") al empezar una operación.
import type { EventoIn } from "@cp/shared";

type Accion = EventoIn["accion"];
type Flujo = NonNullable<EventoIn["flujo"]>;

let cola: EventoIn[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function sesionId() {
  try {
    let id = sessionStorage.getItem("cp_sesion");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("cp_sesion", id);
    }
    return id;
  } catch {
    return "sin-storage";
  }
}

const inicios: Partial<Record<Flujo, number>> = {};
let ayudaEnFlujo = false;

/** Marca el inicio de una operación para medir su duración. */
export function iniciarFlujo(flujo: Flujo) {
  inicios[flujo] = Date.now();
  ayudaEnFlujo = false;
}

/** Marca que el cliente usó ayuda (asistente, "Enséñame paso a paso") en la operación actual. */
export function marcarAyuda() {
  ayudaEnFlujo = true;
}
export const usoAyuda = () => ayudaEnFlujo;

export function track(pantalla: string, accion: Accion, extra: { flujo?: Flujo; ayudaUsada?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const inicio = extra.flujo ? inicios[extra.flujo] : undefined;
  cola.push({
    sesionId: sesionId(),
    pantalla: pantalla.slice(0, 40),
    accion,
    flujo: extra.flujo,
    msDesdeInicio: inicio ? Date.now() - inicio : undefined,
    ayudaUsada: extra.ayudaUsada ?? ayudaEnFlujo,
  });
  if (cola.length >= 20) enviar();
  else if (!timer) timer = setTimeout(enviar, 4000);
}

function enviar() {
  clearTimeout(timer);
  timer = undefined;
  if (!cola.length) return;
  const cuerpo = JSON.stringify({ eventos: cola.splice(0, 50) });
  const blob = new Blob([cuerpo], { type: "text/plain" });
  if (!navigator.sendBeacon?.("/api/eventos", blob)) {
    fetch("/api/eventos", { method: "POST", body: cuerpo, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => {});
  }
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", enviar);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && enviar());
}
