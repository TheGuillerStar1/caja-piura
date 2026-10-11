"use client";
// Guía "👇 Toca aquí" encendida o apagada (Manual visual: guía contextual con «Omitir ayuda»).
// Pone <html data-guia="no"> cuando el cliente la omite; el script de app/layout.tsx lo fija antes de pintar.
import { useCallback, useEffect, useState } from "react";

export function useGuia() {
  const [activa, setActivaEstado] = useState(true);
  useEffect(() => setActivaEstado(document.documentElement.dataset.guia !== "no"), []);

  const setActiva = useCallback((v: boolean) => {
    if (v) delete document.documentElement.dataset.guia;
    else document.documentElement.dataset.guia = "no";
    setActivaEstado(v);
    try {
      localStorage.setItem("cp_guia", v ? "si" : "no");
    } catch {}
  }, []);

  return { activa, setActiva };
}
