"use client";
// «Omitir ayuda» (Manual visual, guía contextual): apaga el "👇 Toca aquí" en toda la app. Solo aparece en la vista
// asistida y mientras la guía está encendida; se vuelve a prender en Ajustes.
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useGuia } from "@/lib/guia";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";

export function OmitirAyuda() {
  const { asistida } = useVista();
  const { activa, setActiva } = useGuia();
  // Solo después de cargar: el servidor no sabe la vista ni si la guía está apagada (evita el error de hidratación).
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado || !asistida || !activa) return null;
  return (
    <button
      type="button"
      onClick={() => (track("omitir-ayuda", "tocar"), setActiva(false))}
      className="-mb-2 flex min-h-10! items-center gap-1 self-end rounded-full border border-linea px-3 text-sm font-bold text-tenue active:bg-superficie-2"
    >
      <X className="h-4 w-4" aria-hidden /> Omitir ayuda
    </button>
  );
}
