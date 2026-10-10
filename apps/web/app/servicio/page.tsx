"use client";
// Opciones de la app oficial que esta demo no procesa (transferencias, cambio de moneda, etc.).
// Se dice con claridad y se ofrece lo que sí funciona: los pagos con Pía.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Boton, Mascota, Pantalla } from "@/components/ui";

function Contenido() {
  const q = useSearchParams();
  const nombre = q.get("n") || "Esta opción";
  const volver = q.get("v")?.startsWith("/") ? q.get("v")! : "/inicio";
  return (
    <Pantalla titulo={nombre} volver={volver}>
      <div className="rounded-lg bg-superficie p-4">
        <Mascota tamano={52} mensaje={<>«{nombre}» funciona igual que siempre en tu app Caja Piura. En esta demo te acompaño en tus <b>pagos</b>.</>} />
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <Boton href="/pagos">Ir a Pagos</Boton>
        <Boton href="/ayuda" variante="secundario">Preguntarle a Pía</Boton>
      </div>
    </Pantalla>
  );
}

export default function Servicio() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}
