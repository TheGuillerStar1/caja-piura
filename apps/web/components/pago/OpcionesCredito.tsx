"use client";
// Operaciones de un crédito, como en «Pago de créditos propios» de la app oficial: cuota, solo interés, adelantar cuotas
// o amortizar con el monto que elija. Se usa en la pantalla de pasos y dentro del chat de Pía.
import type { OperacionCredito } from "@cp/shared";
import { soles } from "@/lib/formato";

export type DatosCredito = { interes: number; maxAdelanto: number; deuda: number; amortizacionMinima: number; montoCuota: number };
export type EleccionCredito = { operacion: OperacionCredito; cantidad?: number };

export const NOMBRE_OPERACION: Record<OperacionCredito, string> = {
  CUOTA: "Pago de cuota",
  INTERES: "Pago interés",
  ADELANTO: "Adelanto de cuotas",
  AMORTIZACION: "Amortización",
};

/** Parámetros para la URL de confirmación: &op=…&cant=… */
export const paramsCredito = (e: EleccionCredito) => `&op=${e.operacion}${e.cantidad ? `&cant=${e.cantidad}` : ""}`;

type Props = { datos?: DatosCredito; valor: EleccionCredito | null; onCambio: (e: EleccionCredito) => void; compacto?: boolean };

export function OpcionesCredito({ datos, valor, onCambio, compacto }: Props) {
  const detalle: Record<OperacionCredito, string> = {
    CUOTA: datos ? `${soles(datos.montoCuota)} · la cuota de este mes` : "La cuota de este mes",
    INTERES: datos ? `${soles(datos.interes)} · solo el interés (estimado)` : "Solo el interés",
    ADELANTO: "Pagas la de este mes y las siguientes",
    AMORTIZACION: datos ? `Bajas tu deuda (pendiente: ${soles(datos.deuda)})` : "Bajas tu deuda con el monto que elijas",
  };
  const ops: OperacionCredito[] = ["CUOTA", "INTERES", "ADELANTO", "AMORTIZACION"];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`mb-1 font-bold text-marca ${compacto ? "text-sm" : "text-sm"}`}>Operación</legend>
      {ops.map((op) => {
        const on = valor?.operacion === op;
        return (
          <div key={op} className={`rounded-xl border-2 ${on ? "border-marca bg-marca-claro" : "border-linea bg-superficie"}`}>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">
              <input
                type="radio"
                name="operacion-credito"
                className="h-5 w-5 shrink-0 accent-marca"
                checked={on}
                onChange={() =>
                  onCambio({ operacion: op, cantidad: op === "ADELANTO" ? 1 : op === "AMORTIZACION" ? datos?.amortizacionMinima ?? 50 : undefined })
                }
              />
              <span className="flex flex-col">
                <span className="text-lg font-bold">{NOMBRE_OPERACION[op]}</span>
                <span className="text-sm text-tenue">{detalle[op]}</span>
              </span>
            </label>
            {on && op === "ADELANTO" && datos && (
              <div className="flex flex-wrap gap-2 px-3 pb-3" role="radiogroup" aria-label="Cuántas cuotas">
                {Array.from({ length: datos.maxAdelanto }, (_, k) => k + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={valor?.cantidad === n}
                    onClick={() => onCambio({ operacion: op, cantidad: n })}
                    className={`min-h-11 rounded-lg border-2 px-3 font-bold ${valor?.cantidad === n ? "border-marca bg-marca text-white" : "border-linea bg-superficie"}`}
                  >
                    {n} cuota{n === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
            )}
            {on && op === "AMORTIZACION" && (
              <label className="flex flex-col gap-1 px-3 pb-3">
                <span className="text-sm text-tenue">¿Cuánto quieres pagar? (mínimo {soles(datos?.amortizacionMinima ?? 50)})</span>
                <span className="flex items-center gap-2 rounded-lg border-2 border-linea-fuerte bg-superficie px-3">
                  <span className="font-bold">S/</span>
                  <input
                    inputMode="decimal"
                    value={valor?.cantidad ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
                      onCambio({ operacion: op, cantidad: Number.isFinite(n) ? n : undefined });
                    }}
                    className="min-h-12 w-full bg-transparent text-lg font-bold focus:outline-none"
                    aria-label="Monto a amortizar en soles"
                  />
                </span>
              </label>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
