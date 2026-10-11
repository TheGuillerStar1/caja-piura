"use client";
// Cuenta de origen en la confirmación: «Desde tu cuenta» con el enlace «Cambiar cuenta» al lado, y la tarjeta de la
// cuenta también se toca para cambiarla. Las dos cosas abren la lista de cuentas para elegir otra.
import type { Cuenta } from "@cp/shared";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { soles } from "@/lib/formato";
import { ElegirOpcion } from "./ElegirOpcion";

type Props = { cuentas: Cuenta[]; actual: Cuenta; onCambio: (id: number) => void; nombre: string; etiqueta?: string };

export function CuentaOrigen({ cuentas, actual, onCambio, nombre, etiqueta = "Desde tu cuenta" }: Props) {
  const [abierta, setAbierta] = useState(false);
  const puedeCambiar = cuentas.length > 1;
  // Abre la selección de cuentas (lista con las cuentas que sirven para pagar).
  const handleCambiarCuenta = () => {
    if (puedeCambiar) setAbierta(true);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tenue">{etiqueta}</span>
        {puedeCambiar && !abierta && (
          <button type="button" onClick={handleCambiarCuenta} className="min-h-10 cursor-pointer font-bold text-marca underline-offset-4 hover:underline">
            Cambiar cuenta
          </button>
        )}
      </div>
      {abierta ? (
        <div className="flex flex-col gap-2">
          <ElegirOpcion
            nombre={nombre}
            valor={String(actual.id)}
            onCambio={(v) => {
              setAbierta(false);
              if (v !== String(actual.id)) onCambio(Number(v));
            }}
            opciones={cuentas.map((k) => ({ valor: String(k.id), texto: `${k.tipo} ${k.numeroOculto}`, detalle: `Saldo ${soles(k.saldo)}` }))}
          />
          <button type="button" onClick={() => setAbierta(false)} className="min-h-11 cursor-pointer self-start font-bold text-marca underline underline-offset-4">
            Dejar la misma cuenta
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!puedeCambiar}
          onClick={handleCambiarCuenta}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-linea bg-superficie px-3 py-2 text-left transition-colors enabled:cursor-pointer enabled:hover:border-marca enabled:hover:bg-marca-claro enabled:active:bg-marca-claro"
          aria-label={puedeCambiar ? `Cuenta ${actual.tipo} ${actual.numeroOculto}. Toca para cambiar de cuenta` : undefined}
        >
          <span className="flex flex-1 flex-col">
            <span className="text-xl font-bold">
              {actual.tipo} {actual.numeroOculto}
            </span>
            <span className="text-tenue">Saldo disponible: {soles(actual.saldo)}</span>
          </span>
          {puedeCambiar && <ChevronRight className="h-6 w-6 shrink-0 text-marca" aria-hidden />}
        </button>
      )}
      {!puedeCambiar && <span className="text-sm text-tenue">Es tu única cuenta para pagar.</span>}
    </div>
  );
}
