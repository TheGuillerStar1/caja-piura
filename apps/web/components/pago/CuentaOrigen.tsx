"use client";
// Cuenta de origen en la confirmación: se ve la elegida y, si tiene más, «Cambiar» abre las demás para elegir.
import type { Cuenta } from "@cp/shared";
import { useState } from "react";
import { soles } from "@/lib/formato";
import { ElegirOpcion } from "./ElegirOpcion";

type Props = { cuentas: Cuenta[]; actual: Cuenta; onCambio: (id: number) => void; nombre: string };

export function CuentaOrigen({ cuentas, actual, onCambio, nombre }: Props) {
  const [abierta, setAbierta] = useState(false);
  const puedeCambiar = cuentas.length > 1;
  if (abierta) {
    return (
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
        <button type="button" onClick={() => setAbierta(false)} className="min-h-11 self-start font-bold text-marca underline underline-offset-4">
          Dejar la misma cuenta
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={!puedeCambiar}
      onClick={() => setAbierta(true)}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-linea bg-superficie px-3 py-2 text-left enabled:active:bg-marca-claro"
      aria-label={puedeCambiar ? `Cuenta ${actual.tipo} ${actual.numeroOculto}. Toca para cambiar de cuenta` : undefined}
    >
      <span className="flex flex-1 flex-col">
        <span className="text-xl font-bold">
          {actual.tipo} {actual.numeroOculto}
        </span>
        <span className="text-tenue">Saldo disponible: {soles(actual.saldo)}</span>
      </span>
      {puedeCambiar && <span className="shrink-0 rounded-lg bg-marca px-3 py-2 text-base font-bold text-white">Cambiar</span>}
    </button>
  );
}
