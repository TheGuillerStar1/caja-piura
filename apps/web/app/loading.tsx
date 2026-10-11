// F3 (Agente F). Se muestra al instante mientras llega la siguiente pantalla (red lenta en el campo).
import { Cargando } from "@/components/ui";

export default function CargandoPantalla() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-fondo justify-center px-4">
      <Cargando texto="Un momento, ya casi…" />
    </div>
  );
}
