"use client";
// F0. Lectura en voz alta (vista asistida). Usa la voz del navegador; no consume datos.

/** ¿La voz de Pía está encendida? Se apaga con el botón «Voz» de la barra azul y se recuerda en el celular. */
export function vozActiva() {
  try {
    return localStorage.getItem("cp_voz") !== "no";
  } catch {
    return true;
  }
}

export function ponerVoz(activa: boolean) {
  try {
    localStorage.setItem("cp_voz", activa ? "si" : "no");
  } catch {}
  if (!activa) callar();
  dispatchEvent(new Event("cp-voz"));
}

export function hablar(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !vozActiva()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-PE";
  const voz = speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
  if (voz) u.voice = voz;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

export function callar() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
}

/** 350.5 → "350 soles con 50 céntimos" */
export function montoHablado(monto: number) {
  const soles = Math.floor(monto);
  const cent = Math.round((monto - soles) * 100);
  return cent ? `${soles} soles con ${cent} céntimos` : `${soles} soles`;
}
