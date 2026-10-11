"use client";
// Constancia de una transferencia a cuenta hecha en el chat, con el botón para compartirla como imagen.
import { BotonConstanciaWhatsApp } from "@/components/pago/ConstanciaWhatsApp";
import { IconoCheck } from "@/components/pago/Iconos";
import { fechaHora, soles } from "@/lib/formato";
import { TITULO_TIPO, type TransferenciaHecha } from "./TransferenciaEnChat";

export function ConstanciaTransferencia({ t }: { t: TransferenciaHecha }) {
  const titulo = t.tipo === "CONTACTO" ? "Envío a contacto" : TITULO_TIPO[t.tipo];
  const filas: [string, string][] = [
    ["Para", t.nombreDestino],
    ["Cuenta", t.destinoMostrado],
    ["Desde", `${t.origen.tipo} ${t.origen.numeroOculto}`],
    ["N.º de operación", t.operacion],
    ["Fecha", fechaHora(t.fecha)],
  ];
  return (
    <div className="ml-10 flex flex-col gap-3 rounded-2xl border-2 border-exito/40 bg-superficie p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <IconoCheck className="h-16 w-16 text-exito" />
        <p className="text-xl font-bold text-exito">¡Transferencia realizada!</p>
        <p className="text-4xl font-bold tracking-tight">{soles(t.monto)}</p>
        <p className="text-tenue">{titulo}</p>
        {t.repetida && <p className="text-tenue">Ya estaba hecha: no se cobró otra vez.</p>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-linea pt-3">
        {filas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-tenue">{k}</dt>
            <dd className="text-right font-bold break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <BotonConstanciaWhatsApp
        datos={{
          monto: t.monto,
          descripcion: `Transferencia ${titulo.toLowerCase()}`,
          destinatario: `${t.nombreDestino} · ${t.destinoMostrado}`,
          operacion: t.operacion,
          fecha: t.fecha,
          transferencia: true,
        }}
      />
    </div>
  );
}
