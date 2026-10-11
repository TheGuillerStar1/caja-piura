"use client";
// Barra inferior idéntica a la app oficial de Caja Piura: Mis productos · Transferencias · Pagos · Frecuentes · Para ti.
// Lo único nuevo es Pía: un botón flotante "¿Necesitas ayuda?" encima de la barra (Manual visual: asistente / CTA).
import Link from "next/link";
import { IcEstrella, IcPagos, IcParaTi, IcProductos, IcTransferencias } from "@/components/app/IconosApp";
import { Mascota } from "@/components/ui/Mascota";
import { track } from "@/lib/track";

export type Pestana = "productos" | "transferencias" | "pagos" | "frecuentes" | "parati";

const PESTANAS: { id: Pestana; texto: string; ruta: string; Icono: (p: { className?: string }) => React.ReactNode }[] = [
  { id: "productos", texto: "Mis productos", ruta: "/inicio", Icono: IcProductos },
  { id: "transferencias", texto: "Transferencias", ruta: "/transferencias", Icono: IcTransferencias },
  { id: "pagos", texto: "Pagos", ruta: "/pagos", Icono: IcPagos },
  { id: "frecuentes", texto: "Frecuentes", ruta: "/pagar/frecuentes", Icono: IcEstrella },
  { id: "parati", texto: "Para ti", ruta: "/para-ti", Icono: IcParaTi },
];

export function BarraInferior({ activa, sinPia }: { activa?: Pestana; sinPia?: boolean }) {
  return (
    <>
      {/* Espacio para que la barra fija (y el botón de Pía) no tapen el final del contenido. */}
      <div aria-hidden="true" className={`${sinPia ? "h-16" : "h-32"} shrink-0`} />
      {!sinPia && (
        <Link
          href="/ayuda"
          onClick={() => track("barra-pia", "tocar")}
          aria-label="¿Necesitas ayuda? Habla con Pía, tu asistente"
          className="fixed bottom-[4.75rem] z-30 flex items-center gap-2 rounded-full bg-marca py-1.5 pl-1.5 pr-4 font-bold text-white shadow-[0_4px_14px_rgb(0_0_0/0.45)] ring-2 ring-white/15 active:bg-marca-oscuro"
          style={{ right: "max(1rem, calc((100vw - 35rem) / 2 + 1rem))" }}
        >
          <span className="rounded-full bg-white p-0.5 [&_svg]:size-[2.1rem]">
            <Mascota tamano={34} />
          </span>
          {/* La vista asistida agranda todo por rem (globals.css); aquí, además, el texto. Sin JS: no cambia el HTML del servidor. */}
          <span className="text-[0.95rem] leading-tight in-data-[vista=ASISTIDA]:text-lg">¿Necesitas ayuda?</span>
        </Link>
      )}
      <nav
        aria-label="Menú principal"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app items-stretch border-t border-linea bg-fondo-hondo pb-[env(safe-area-inset-bottom)]"
      >
        {PESTANAS.map(({ id, texto, ruta, Icono }) => {
          const on = id === activa;
          return (
            <Link
              key={id}
              href={ruta}
              aria-current={on ? "page" : undefined}
              onClick={() => track(`barra-${id}`, "tocar")}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-center text-[0.68rem] leading-tight ${
                on ? "font-medium text-marca" : "text-tinta/90"
              }`}
            >
              <Icono className={`h-6 w-6 ${on ? "" : "text-tinta"}`} />
              {texto}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
