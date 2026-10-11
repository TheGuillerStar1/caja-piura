"use client";
// Celular de muestra para la bienvenida (solo se mira, no se toca). Muestra el inicio de siempre de la app:
// - Vista estándar: tal cual.
// - Vista asistida: el mismo inicio, con letra más grande, la pantalla oscurecida y solo «¿Necesitas ayuda?» resaltado.
// Medidas en px: la muestra se agranda en proporción al ancho de la columna, no con la vista asistida.
import { Menu } from "lucide-react";
import type { Vista } from "@cp/shared";
import { useEffect, useRef, useState } from "react";
import { IcChevronArriba, IcCreditos, IcCuentas, IcEstrella, IcPagos, IcParaTi, IcProductos, IcTarjeta, IcTransferencias } from "./IconosApp";
import { Mascota } from "@/components/ui/Mascota";

const ANCHO = 248;
const PESTANAS = [
  { t: "Mis productos", I: IcProductos },
  { t: "Transferencias", I: IcTransferencias },
  { t: "Pagos", I: IcPagos },
  { t: "Frecuentes", I: IcEstrella },
  { t: "Para ti", I: IcParaTi },
];

export function CelularPrevia({ vista, nombre = "Rosa", cuentas = 2 }: { vista: Vista; nombre?: string; cuentas?: number }) {
  const asistida = vista === "ASISTIDA";
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(Math.max(1, el.clientWidth / ANCHO));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const t = asistida ? "text-[12.5px]" : "text-[11px]";
  const fila = (I: (p: { className?: string }) => React.ReactNode, texto: string) => (
    <div className={`flex ${asistida ? "h-10" : "h-8"} items-center gap-2 border-b border-linea/70 px-1`}>
      <I className="h-3.5 w-3.5 text-marca" />
      <span className={`flex-1 font-medium ${t}`}>{texto}</span>
      <IcChevronArriba className="h-3 w-3 text-marca" />
    </div>
  );

  return (
    <div ref={caja} className="w-full" aria-hidden>
      <div
        style={{ zoom: escala }}
        className="pointer-events-none mx-auto w-[248px] select-none rounded-[1.6rem] bg-[var(--cp-surface-dark)] p-[5px] ring-1 ring-white/15"
      >
        <div key={vista} className="anim-previa relative isolate flex h-[250px] flex-col overflow-hidden rounded-[1.25rem] bg-fondo">
          <div className="bg-marca px-3 pb-2 pt-2.5 text-white">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <Menu className="h-4 w-4" aria-hidden /> Hola, {nombre}
            </div>
            <p className="mt-0.5 text-center text-[8px] opacity-90">Tipo de cambio ref. Compra: 3.30 Venta: 3.60</p>
          </div>
          <div className="flex flex-1 flex-col p-2.5">
            <p className={`mb-0.5 font-bold ${asistida ? "text-[14px]" : "text-[12px]"}`}>Mis productos</p>
            {fila(IcCuentas, `Cuentas (${cuentas})`)}
            {fila(IcTarjeta, "Tarjetas (1)")}
            {fila(IcCreditos, "Créditos (1)")}
            <p className={`mb-1 mt-2.5 font-bold ${asistida ? "text-[14px]" : "text-[12px]"}`}>Mis servicios</p>
            <span className={`w-20 font-bold leading-tight text-marca ${asistida ? "text-[11px]" : "text-[9px]"}`}>Transferencias a contacto</span>
          </div>

          {/* Vista asistida: todo se oscurece menos «¿Necesitas ayuda?» */}
          {asistida && (
            <>
              <div className="absolute inset-0 z-10 bg-black/60" />
              <div className="absolute inset-x-3 bottom-[86px] z-20 rounded-lg bg-superficie p-2 text-[10.5px] font-bold leading-snug text-tinta shadow-lg">
                ¿Necesitas ayuda? Toca aquí para que te acompañemos.
              </div>
            </>
          )}
          <div
            className={`absolute bottom-[54px] right-2 z-20 flex items-center gap-1 rounded-full bg-marca py-0.5 pl-0.5 pr-2 font-bold text-white shadow-lg ${
              asistida ? "text-[10.5px] ring-[3px] ring-acento" : "text-[9px]"
            }`}
          >
            <span className="rounded-full bg-white p-px">
              <Mascota tamano={asistida ? 16 : 14} />
            </span>
            ¿Necesitas ayuda?
          </div>

          <div className="flex h-[46px] items-stretch border-t border-linea bg-fondo-hondo">
            {PESTANAS.map(({ t: texto, I }, i) => (
              <span key={texto} className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[6.5px] leading-none ${i === 0 ? "text-marca" : "text-tinta/85"}`}>
                <I className="h-3.5 w-3.5" />
                {texto}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
