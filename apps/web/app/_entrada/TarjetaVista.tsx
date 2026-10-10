// Dueño: Agente A. Tarjeta que describe una vista (asistida o estándar) para elegirla.
import type { Vista } from "@cp/shared";

export const INFO_VISTA: Record<Vista, { titulo: string; puntos: string[] }> = {
  ASISTIDA: {
    titulo: "Vista asistida",
    puntos: ["Botones y letra grandes", "Te leemos los montos en voz alta", "Te guiamos con “toca aquí”"],
  },
  ESTANDAR: {
    titulo: "Vista estándar",
    puntos: ["Más opciones a la vista", "Letra normal", "Menos explicaciones"],
  },
};

type Props = { vista: Vista; elegida: boolean; recomendada?: boolean; onElegir: () => void };

export function TarjetaVista({ vista, elegida, recomendada, onElegir }: Props) {
  const info = INFO_VISTA[vista];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={`flex w-full flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-colors ${
        elegida ? "border-marca bg-marca-claro" : "border-linea bg-superficie"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${elegida ? "border-marca bg-marca" : "border-linea"}`}
        >
          {elegida && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
        </span>
        <span className="flex-1 text-xl font-bold">{info.titulo}</span>
        {recomendada && <span className="rounded-full bg-exito-claro px-2 py-0.5 text-sm font-bold text-exito">Recomendada</span>}
      </span>
      <ul className="flex flex-col gap-1 pl-8 text-tenue">
        {info.puntos.map((p) => (
          <li key={p} className="list-disc">
            {p}
          </li>
        ))}
      </ul>
    </button>
  );
}
