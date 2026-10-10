"use client";
// Dueño: Agente A. Pantalla principal (fase 1): logo, mascota Pía y un solo botón para ingresar.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Boton, Mascota } from "@/components/ui";
import { track } from "@/lib/track";
import { LogoCajaPiura } from "./_entrada/Logo";

export default function Principal() {
  const router = useRouter();
  useEffect(() => {
    track("principal", "ver");
    router.prefetch("/entrar");
  }, [router]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-marca text-white">
      <header className="px-5 pt-6">
        <LogoCajaPiura claro />
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 px-5">
        <h1 className="text-3xl font-bold leading-tight">Paga tu cuota y tus recibos desde tu celular</h1>
        <p className="text-lg text-white/85">Sin colas y con ayuda en cada paso.</p>
        <div className="rounded-3xl bg-superficie p-4 text-tinta">
          <Mascota animada tamano={84} mensaje={<>Hola, soy <b>Pía</b>. Te acompaño en cada pago. Toca aquí para ingresar.</>} />
        </div>
      </main>
      <footer className="flex flex-col gap-3 px-5 pb-8 pt-4">
        <Boton
          guia
          className="bg-superficie! text-marca! text-xl"
          onClick={() => {
            track("principal", "tocar");
            router.push("/entrar");
          }}
        >
          Ingresar
        </Boton>
        <p className="text-center text-sm text-white/80">Caja Piura nunca te pedirá tu clave por llamada ni mensaje.</p>
      </footer>
    </div>
  );
}
