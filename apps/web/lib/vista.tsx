"use client";
// F0. Vista activa (ASISTIDA | ESTANDAR). Pone <html data-vista> para escalar la interfaz.
// Uso: const { vista, setVista, asistida } = useVista();  (setVista solo cambia la UI; guardar con PUT /me/vista)
import type { Vista } from "@cp/shared";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { vista: Vista; asistida: boolean; setVista: (v: Vista) => void };
const VistaCtx = createContext<Ctx>({ vista: "ESTANDAR", asistida: false, setVista: () => {} });

export function VistaProvider({ children }: { children: React.ReactNode }) {
  const [vista, setVistaState] = useState<Vista>("ESTANDAR");

  useEffect(() => {
    try {
      const v = localStorage.getItem("cp_vista");
      if (v === "ASISTIDA" || v === "ESTANDAR") setVistaState(v);
    } catch {}
  }, []);

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
