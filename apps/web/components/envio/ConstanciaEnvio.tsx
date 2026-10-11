"use client";
// Constancia del envío a contacto, dentro del chat: check, monto, a quién, por dónde, operación y fecha,
// con el botón para compartirla como imagen (WhatsApp u otra app del celular).
import { BotonConstanciaWhatsApp } from "@/components/pago/ConstanciaWhatsApp";
import { IconoCheck } from "@/components/pago/Iconos";
import { fechaHora, soles } from "@/lib/formato";
import { NOMBRE_BILLETERA } from "./contactos";
import type { EnvioHecho } from "./EnvioEnChat";

export function ConstanciaEnvio({ envio }: { envio: EnvioHecho }) {
  const por = NOMBRE_BILLETERA[envio.billetera];
  const filas: [string, string][] = [
    ["Para", envio.contacto.nombre],
    ["Celular", envio.destinoMostrado],
    ["Por", por],
    ["Desde", `${envio.origen.tipo} ${envio.origen.numeroOculto}`],
    ["N.º de operación", envio.operacion],
    ["Fecha", fechaHora(envio.fecha)],
  ];
  return (
    <div className="ml-10 flex flex-col gap-3 rounded-2xl border-2 border-exito/40 bg-superficie p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <IconoCheck className="h-16 w-16 text-exito" />
        <p className="text-xl font-bold text-exito">¡Envío realizado!</p>
        <p className="text-4xl font-bold tracking-tight">{soles(envio.monto)}</p>
        {envio.repetida && <p className="text-tenue">Ya estaba hecho: no se envió otra vez.</p>}
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
          monto: envio.monto,
          descripcion: `Envío por ${por} a ${envio.contacto.nombre}`,
          destinatario: `${envio.contacto.nombre} · ${envio.destinoMostrado}`,
          operacion: envio.operacion,
          fecha: envio.fecha,
          transferencia: true,
        }}
      />
    </div>
  );
}
