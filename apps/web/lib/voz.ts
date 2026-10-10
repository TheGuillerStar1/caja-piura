"use client";
// F0. Lectura en voz alta (vista asistida). Usa la voz del navegador; no consume datos.

export function hablar(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
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
