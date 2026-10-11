// Indicador de pasos de la app oficial (1 · 2 · 3 con línea, el paso hecho con ✓) y la tarjeta blanca de "Ingresa tus datos".
import { Check } from "lucide-react";

export function PasosApp({ total, actual }: { total: number; actual: number }) {
  return (
    <ol aria-label={`Paso ${actual} de ${total}`} className="mx-auto flex w-full max-w-64 items-center">
      {Array.from({ length: total }, (_, k) => {
        const n = k + 1;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <li key={n} className={`flex items-center ${n < total ? "flex-1" : ""}`}>
            <span
              aria-current={activo ? "step" : undefined}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                hecho || activo ? "border-[var(--cp-action-focus)] bg-[var(--cp-action-focus)] text-[var(--cp-surface-dark)]" : "border-[var(--cp-action-focus)] bg-superficie text-tinta"
              }`}
            >
              {hecho ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : n}
            </span>
            {n < total && <span aria-hidden className="h-0.5 flex-1 bg-[var(--cp-action-focus)]" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Campo con etiqueta azul, como en la app oficial. */
export function CampoApp({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-bold text-marca">
        {etiqueta}
        {ayuda && (
          <span title={ayuda} aria-label={ayuda} className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cp-action-focus)] text-xs text-[var(--cp-surface-dark)]">
            ?
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export const claseSelect =
  "min-h-13 w-full rounded-lg border-2 border-linea-fuerte bg-superficie px-3 text-base text-tinta focus:border-marca focus:outline-none in-data-[vista=ASISTIDA]:text-lg";
