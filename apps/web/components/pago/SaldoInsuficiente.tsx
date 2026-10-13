"use client";
// Cuando no alcanza el saldo: en vez de solo avisar, ofrece la salida en un toque.
// 1) Pagar con otra cuenta que sí alcanza. 2) Pasar plata desde otra cuenta propia. 3) Depositar en agencia o agente.
import type { Cuenta } from "@cp/shared";
import { ArrowLeftRight, Wallet } from "lucide-react";
import Link from "next/link";
import { soles } from "@/lib/formato";

type Props = { monto: number; actual: Cuenta; cuentas: Cuenta[]; onUsarCuenta: (id: number) => void; grande?: boolean };

export function SaldoInsuficiente({ monto, actual, cuentas, onUsarCuenta, grande }: Props) {
  const falta = Math.max(0, monto - actual.saldo);
  const alcanza = cuentas.filter((k) => k.id !== actual.id && k.saldo >= monto).sort((a, b) => b.saldo - a.saldo);
  const otraConSaldo = cuentas.some((k) => k.id !== actual.id && k.saldo > 0);
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-aviso bg-aviso-claro p-4">
      <p className={`${grande ? "text-xl" : "text-lg"} font-bold`}>A tu {actual.tipo} le faltan {soles(falta)}</p>
      <p className="text-tenue">No se movió dinero. Elige cómo seguir:</p>
      {alcanza.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onUsarCuenta(k.id)}
          className="flex min-h-14 items-center gap-3 rounded-xl bg-marca px-4 text-left font-bold text-white active:opacity-90"
        >
          <Wallet className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">
            Pagar con {k.tipo} {k.numeroOculto}
            <span className="block text-sm font-normal text-white/85">Saldo {soles(k.saldo)}</span>
          </span>
        </button>
      ))}
      {!alcanza.length && otraConSaldo && (
        <Link href="/transferir/propias" className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-marca bg-superficie px-4 font-bold text-marca">
          <ArrowLeftRight className="h-5 w-5 shrink-0" aria-hidden /> Pasar dinero desde otra cuenta tuya
        </Link>
      )}
      <p className="text-sm">También puedes depositar en cualquier agencia o agente Caja Piura y volver aquí: el pago te espera.</p>
    </div>
  );
}
