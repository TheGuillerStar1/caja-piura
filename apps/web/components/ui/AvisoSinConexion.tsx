"use client";
// F3 (Agente F). Franja fija que aparece cuando el celular se queda sin red (eventos online/offline).
// Va debajo de la barra superior (no tapa "Volver"). Las llamadas a la API ya responden "Sin conexión".
import { useSyncExternalStore } from "react";

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
  if (enLinea) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-16 z-30 mx-auto max-w-app rounded-b-2xl bg-[#2b2f36] px-4 py-3 shadow-lg text-center text-lg font-bold text-white"
    >
      Sin conexión. No se cobró nada. Cuando vuelva la señal, inténtalo de nuevo.
    </div>
  );
}
