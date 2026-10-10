"use client";
// Modo oscuro (el de la app oficial) o claro. Pone <html data-tema>; el script de app/layout.tsx lo fija antes de pintar.
// Uso: const { tema, setTema } = useTema();
import { useCallback, useEffect, useState } from "react";

export type Tema = "oscuro" | "claro";

function temaActual(): Tema {
  if (typeof document === "undefined") return "oscuro";
  return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

export function useTema() {
  const [tema, setEstado] = useState<Tema>("oscuro");
  useEffect(() => setEstado(temaActual()), []);

  const setTema = useCallback((t: Tema) => {
    document.documentElement.dataset.tema = t;
    setEstado(t);
    try {
      localStorage.setItem("cp_tema", t);
    } catch {}
  }, []);

  return { tema, setTema };
}
