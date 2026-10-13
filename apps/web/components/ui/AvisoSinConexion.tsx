"use client";
// F3 (Agente F). Franja fija que aparece cuando el celular se queda sin red (eventos online/offline).
// Va debajo de la barra superior (no tapa "Volver"). Las llamadas a la API ya responden "Sin conexión".
import { useEffect, useSyncExternalStore } from "react";
import { track } from "@/lib/track";

function suscribir(avisar: () => void) {
  addEventListener("online", avisar);
  addEventListener("offline", avisar);
  return () => {
    removeEventListener("online", avisar);
    removeEventListener("offline", avisar);
  };
}

export function AvisoSinConexion() {
  const enLinea = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
  // Se registra para el panel: cuántas veces se corta la señal en medio de la app.
  useEffect(() => {
    if (!enLinea) track("sin-conexion", "error");
  }, [enLinea]);
  if (enLinea) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-16 z-30 mx-auto max-w-app rounded-b-2xl bg-[var(--cp-surface-dark)] px-4 py-3 shadow-lg text-center text-lg font-bold text-white"
    >
      Sin conexión. Lo que estabas haciendo se guarda y ningún pago se cobra dos veces. Cuando vuelva la señal, sigue donde te quedaste.
    </div>
  );
}
