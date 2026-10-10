// Dueño: Agente B. Punto de entrada común a la confirmación de pagos.
import { Suspense } from "react";
import { Pantalla, Cargando } from "@/components/ui";
import { Confirmar } from "@/components/pago/Confirmar";

export default function Page() {
  return (
    <Suspense
      fallback={
        <Pantalla titulo="Confirmar pago">
          <Cargando texto="Preparando tu pago…" />
        </Pantalla>
      }
    >
      <Confirmar />
    </Suspense>
  );
}
