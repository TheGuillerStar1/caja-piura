// F3 (Agente F). Página no encontrada, con salida clara.
import { Boton, Mascota } from "@/components/ui";

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-fondo justify-center gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">No encontramos esta pantalla</h1>
      <Mascota mensaje="Tranquilo, no pasó nada con tu dinero. Vuelve al inicio." />
      <Boton href="/inicio">Ir al inicio</Boton>
    </main>
  );
}
