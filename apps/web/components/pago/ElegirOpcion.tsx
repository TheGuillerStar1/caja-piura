"use client";
// Lista de opciones con el diseño de la app (tarjetas que se tocan) en vez del <select> nativo, que en cada celular
// o computadora se dibuja distinto (en Mac sale gris con una franja de color). Con una sola opción, viene elegida.
import { useEffect } from "react";

export type Opcion = { valor: string; texto: string; detalle?: string };
type Props = { nombre: string; opciones: Opcion[]; valor: string; onCambio: (v: string) => void; paso?: string; vacio?: string };

export function ElegirOpcion({ nombre, opciones, valor, onCambio, paso, vacio = "No hay opciones." }: Props) {
  // Si hay una sola opción, se elige sola (un toque menos).
  useEffect(() => {
    if (opciones.length === 1 && valor !== opciones[0].valor) onCambio(opciones[0].valor);
  }, [opciones, valor, onCambio]);

  if (!opciones.length) return <p className="text-tenue">{vacio}</p>;
  return (
    <div role="radiogroup" data-paso={paso} className="flex flex-col gap-2">
      {opciones.map((o) => {
        const on = o.valor === valor;
        return (
          <label
            key={o.valor}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 ${on ? "border-marca bg-marca-claro" : "border-linea bg-superficie"}`}
          >
            <input type="radio" name={nombre} value={o.valor} checked={on} onChange={() => onCambio(o.valor)} className="h-5 w-5 shrink-0 accent-marca" />
            <span className="flex flex-col">
              <span className="text-lg font-bold">{o.texto}</span>
              {o.detalle && <span className="text-sm text-tenue">{o.detalle}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
