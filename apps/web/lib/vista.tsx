"use client";
// F0. Vista activa (ASISTIDA | ESTANDAR). Pone <html data-vista> para escalar la interfaz.
// Uso: const { vista, setVista, asistida } = useVista();  (setVista solo cambia la UI; guardar con PUT /me/vista)
import type { Vista } from "@cp/shared";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { vista: Vista; asistida: boolean; setVista: (v: Vista) => void };
const VistaCtx = createContext<Ctx>({ vista: "ESTANDAR", asistida: false, setVista: () => {} });

/** Vista ya conocida en el navegador (el script en línea de app/layout.tsx la pone en <html data-vista> antes de pintar). En el servidor: ESTANDAR. */
function vistaInicial(): Vista {
  if (typeof document === "undefined") return "ESTANDAR";
  return document.documentElement.dataset.vista === "ASISTIDA" ? "ASISTIDA" : "ESTANDAR";
}

export function VistaProvider({ children }: { children: React.ReactNode }) {
  // Se lee en el primer render del cliente: los efectos de las pantallas (p. ej. leer el monto en voz alta
  // en la pantalla de éxito) ya ven el valor correcto de `asistida` desde el inicio.
  const [vista, setVistaState] = useState<Vista>(vistaInicial);

  useEffect(() => {
    document.documentElement.dataset.vista = vista;
  }, [vista]);

  const setVista = useCallback((v: Vista) => {
    setVistaState(v);
    try {
      localStorage.setItem("cp_vista", v);
    } catch {}
  }, []);

  return <VistaCtx.Provider value={{ vista, asistida: vista === "ASISTIDA", setVista }}>{children}</VistaCtx.Provider>;
}

export const useVista = () => useContext(VistaCtx);
