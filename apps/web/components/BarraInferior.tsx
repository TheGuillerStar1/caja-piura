"use client";
// Barra inferior con las mismas funciones de la app actual de Caja Piura (Mis productos · Transferencias · Pagos ·
// Frecuentes · Para ti) más el botón nuevo de Pía al centro, el más llamativo: el cambio es progresivo, no abrupto.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconoCuota, IconoFrecuente, IconoProgreso, IconoRecibo, IconoSaldo } from "@/components/pago/Iconos";
import { Mascota } from "@/components/ui";
import { track } from "@/lib/track";

const IconoTransferir = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 8h14l-4-4M20 16H6l4 4" />
  </svg>
);

type Hoja = "pagos" | "transferencias" | null;

export function BarraInferior() {
  const ruta = usePathname();
  const [hoja, setHoja] = useState<Hoja>(null);
  const tocar = (nombre: string) => track(`barra-${nombre}`, "tocar");
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[0.7rem] font-bold leading-tight";
  const activo = (r: string) => (ruta === r ? "text-marca" : "text-tenue");

  return (
    <>
      {/* Espacio para que la barra fija no tape el final del contenido. */}
      <div aria-hidden="true" className="h-20 shrink-0" />
      {hoja && (
        <div className="fixed inset-0 z-30 bg-tinta/40" onClick={() => setHoja(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="anim-aparece absolute inset-x-0 bottom-20 mx-auto flex max-w-md flex-col gap-2 rounded-t-3xl bg-superficie p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {hoja === "pagos" ? (
              <>
                <p className="text-lg font-bold">Pagos</p>
                <Link href="/pagar/cuota" onClick={() => tocar("pagos-cuota")} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-linea px-3 text-lg font-bold">
                  <IconoCuota className="h-8 w-8 text-marca" /> Pagar mi cuota
                </Link>
                <Link href="/pagar/recibo" onClick={() => tocar("pagos-recibo")} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-linea px-3 text-lg font-bold">
                  <IconoRecibo className="h-8 w-8 text-marca" /> Pagar un recibo (luz, agua…)
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">Transferencias</p>
                <p className="text-tenue">Funcionan igual que en tu app de siempre. Pía te acompaña por ahora en tus pagos.</p>
                <Link href="/ayuda" onClick={() => tocar("transferencias-pia")} className="flex min-h-12 items-center justify-center rounded-2xl bg-marca px-3 font-bold text-white">
                  Preguntarle a Pía
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      <nav aria-label="Menú principal" className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-end border-t border-linea bg-superficie px-1 pb-1 pt-1 shadow-[0_-2px_8px_rgb(0_0_0/0.06)]">
        <Link href="/inicio" onClick={() => tocar("mis-productos")} className={`${item} ${activo("/inicio")}`}>
          <IconoSaldo className="h-6 w-6" />
          Mis productos
        </Link>
        <button type="button" onClick={() => (tocar("transferencias"), setHoja(hoja === "transferencias" ? null : "transferencias"))} className={`${item} text-tenue`}>
          <IconoTransferir />
          Transferencias
        </button>
        <Link
          href="/ayuda"
          onClick={() => tocar("pia")}
          aria-label="Pía, tu asistente: te ayuda a pagar"
          className={`${item} -mt-6 text-marca`}
        >
          <span className="rounded-full bg-marca-claro p-1 ring-4 ring-marca shadow-lg">
            <Mascota tamano={44} />
          </span>
          Pía
        </Link>
        <button type="button" onClick={() => (tocar("pagos"), setHoja(hoja === "pagos" ? null : "pagos"))} className={`${item} text-tenue`}>
          <IconoCuota className="h-6 w-6" />
          Pagos
        </button>
        <Link href="/pagar/frecuentes" onClick={() => tocar("frecuentes")} className={`${item} ${activo("/pagar/frecuentes")}`}>
          <IconoFrecuente className="h-6 w-6" />
          Frecuentes
        </Link>
        <Link href="/progreso" onClick={() => tocar("para-ti")} className={`${item} ${activo("/progreso")}`}>
          <IconoProgreso className="h-6 w-6" />
          Para ti
        </Link>
      </nav>
    </>
  );
}
