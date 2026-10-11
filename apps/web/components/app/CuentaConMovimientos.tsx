"use client";
// Cuenta de «Mis productos» que se toca para ver sus últimos movimientos (como en la app oficial al entrar a una cuenta).
import type { Cuenta, MovimientosRes } from "@cp/shared";
import { useState } from "react";
import { IcChevronArriba } from "./IconosApp";
import { ApiFallo, api } from "@/lib/api";
import { fechaHora, soles } from "@/lib/formato";
import { track } from "@/lib/track";

export function CuentaConMovimientos({ cuenta: c, grande }: { cuenta: Cuenta; grande?: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState<MovimientosRes | { error: string } | null>(null);

  const alternar = () => {
    track("inicio-cuenta", "tocar");
    const abrir = !abierta;
    setAbierta(abrir);
    if (abrir && !datos)
      api<MovimientosRes>(`/me/cuentas/${c.id}/movimientos`)
        .then(setDatos)
        .catch((e) => setDatos({ error: e instanceof ApiFallo ? e.message : "No pudimos cargar los movimientos." }));
  };

  return (
    <li className="overflow-hidden rounded-lg bg-superficie">
      <button type="button" onClick={alternar} aria-expanded={abierta} data-paso={`cuenta-${c.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex-1">
          <span className="block text-sm text-tenue">
            {c.tipo} · {c.numeroOculto}
          </span>
          <span className="block text-2xl font-bold">{soles(c.saldo)}</span>
          <span className="block text-xs text-tenue">{c.paraPagar ? "Saldo disponible" : "No se usa para pagar"}</span>
        </span>
        <span className={`flex items-center gap-1 font-bold text-marca ${grande ? "text-base" : "text-sm"}`}>
          {abierta ? "Ocultar" : "Movimientos"}
          <IcChevronArriba className={`h-4 w-4 transition-transform ${abierta ? "" : "rotate-180"}`} />
        </span>
      </button>
      {abierta && (
        <div className="anim-aparece border-t border-linea/70 px-4 py-2">
          {!datos ? (
            <p className="py-2 text-sm text-tenue">Buscando movimientos…</p>
          ) : "error" in datos ? (
            <p className="py-2 text-sm font-bold text-error">{datos.error}</p>
          ) : datos.movimientos.length === 0 ? (
            <p className="py-2 text-sm text-tenue">Aún no hay pagos desde esta cuenta. Cuando pagues desde la app, aparecerán aquí.</p>
          ) : (
            <ul className="flex flex-col">
              {datos.movimientos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-b border-linea/50 py-2 last:border-0">
                  <span className="flex-1">
                    <span className={`block font-medium leading-snug ${grande ? "text-base" : "text-sm"}`}>{m.descripcion}</span>
                    <span className="block text-xs text-tenue">
                      {fechaHora(m.fecha)}
                      {m.operacion && ` · Op. ${m.operacion}`}
                    </span>
                  </span>
                  <span className={`font-bold ${m.entrada ? "text-exito" : ""} ${grande ? "text-lg" : "text-base"}`}>
                    {m.entrada ? "+" : "-"} {soles(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
