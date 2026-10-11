"use client";
// Teclado de la app oficial: números en orden aleatorio (seguridad ante miradas), "Borrar" gris y "Listo" naranja.
// No abre el teclado del celular.
import { useEffect, useState } from "react";

type Props = { onDigito: (d: string) => void; onBorrar: () => void; onListo: () => void; listoActivo?: boolean; deshabilitado?: boolean };

const ORDEN_FIJO = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function barajar(a: string[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function Teclado({ onDigito, onBorrar, onListo, listoActivo = true, deshabilitado }: Props) {
  // Se baraja después de montar: el HTML del servidor y el primer render del cliente coinciden.
  const [orden, setOrden] = useState(ORDEN_FIJO);
  useEffect(() => setOrden(barajar(ORDEN_FIJO)), []);

  const tecla = "flex h-14 items-center justify-center rounded-md text-xl font-medium text-white disabled:opacity-50";
  const digito = (d: string) => (
    <button key={d} type="button" disabled={deshabilitado} onClick={() => onDigito(d)} className={`${tecla} bg-[#1c1f24] active:bg-[#30353d]`}>
      {d}
    </button>
  );
  return (
    <div className="grid grid-cols-3 gap-1.5 bg-[#4a4d55] p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]" role="group" aria-label="Teclado numérico">
      {orden.slice(0, 9).map(digito)}
      <button type="button" disabled={deshabilitado} onClick={onBorrar} className={`${tecla} bg-[#6b6e75] active:bg-[#7c7f86]`}>
        Borrar
      </button>
      {digito(orden[9])}
      <button
        type="button"
        disabled={deshabilitado || !listoActivo}
        onClick={onListo}
        className={`${tecla} bg-acento active:bg-[#c95414] disabled:bg-acento/50`}
      >
        Listo
      </button>
    </div>
  );
}

/** Barra negra con candado y círculos de la clave (se rellenan sin mostrar los números). */
export function BarraClave({ largo, total = 6, error }: { largo: number; total?: number; error?: boolean }) {
  return (
    <div className={`flex h-14 items-center rounded-lg bg-[#1c1f24] px-4 ${error ? "ring-2 ring-error" : ""}`} aria-label={`${largo} de ${total} números escritos`}>
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="10" rx="2" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </svg>
      <div className="flex flex-1 justify-center gap-3.5">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-white ${i < largo ? "bg-white" : ""}`} />
        ))}
      </div>
    </div>
  );
}
