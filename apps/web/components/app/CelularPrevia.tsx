"use client";
// Celular de muestra para la bienvenida: marco de celular recortado a la altura de "Pagar mi cuota",
// como un recorte de pantalla que se desvanece abajo. Es interactivo: tocar "Pagar" avanza a "Confirmar pago" y a
// "¡Pago realizado!", y vuelve solo al inicio. Así el cliente prueba la vista antes de elegirla, sin mover dinero.
// Medidas en px a propósito: la muestra se agranda en proporción al ancho de la columna, no con la vista asistida.
import type { Vista } from "@cp/shared";
import { useEffect, useRef, useState } from "react";
import { IcChevronArriba, IcCreditos, IcCuentas, IcTarjeta } from "./IconosApp";
import { Mascota } from "@/components/ui/Mascota";

type Paso = "inicio" | "confirmar" | "listo";
const ANCHO = 248;

function Manito({ className }: { className: string }) {
  return (
    <svg className={`anim-tap pointer-events-none absolute z-20 h-8 w-8 drop-shadow ${className}`} viewBox="0 0 64 64" fill="#fff" stroke="#14202e" strokeWidth="3" strokeLinejoin="round" aria-hidden>
      <path d="M24 34V12a5 5 0 0 1 10 0v16l3-1a5 5 0 0 1 6 3l1 1a5 5 0 0 1 6 4v1a5 5 0 0 1 6 5v8c0 8-6 14-14 14h-6c-5 0-9-2-12-6L14 44a5 5 0 0 1 7-7z" />
    </svg>
  );
}

function InicioAsistida({ pagar }: { pagar: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-2.5">
      <div className="rounded-lg border-l-[3px] border-acento bg-superficie p-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white p-px">
            <Mascota tamano={16} />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[11px] font-bold">Cuota de tu crédito</span>
            <span className="block text-[9px] font-bold text-aviso">Vence en 3 días</span>
          </span>
          <span className="text-[13px] font-bold">S/ 350</span>
        </div>
        <div className="relative mt-3.5">
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-acento px-2 text-[9px] font-bold leading-4 text-white">👇 Toca aquí</span>
          <button type="button" onClick={pagar} className="guia-toca flex min-h-9! w-full items-center justify-center rounded-md bg-marca text-[12px] font-bold text-white">
            Pagar S/ 350.00
          </button>
          <Manito className="-bottom-4 right-6" />
        </div>
      </div>
      <p className="mt-1 text-[12px] font-bold">¿Qué necesitas hacer hoy?</p>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-linea-fuerte/70 bg-superficie px-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-marca text-[11px] text-white">📅</span>
        <span className="text-[12px] font-bold">Pagar mi cuota</span>
      </div>
    </div>
  );
}

function InicioEstandar({ pagar }: { pagar: () => void }) {
  const fila = (I: (p: { className?: string }) => React.ReactNode, t: string) => (
    <div className="flex h-8 items-center gap-2 border-b border-linea/70 px-1">
      <I className="h-3.5 w-3.5 text-marca" />
      <span className="flex-1 text-[11px] font-medium">{t}</span>
      <IcChevronArriba className="h-3 w-3 text-marca" />
    </div>
  );
  return (
    <div className="flex flex-col p-2.5">
      <div className="relative mb-2 flex items-center justify-between rounded-md border-l-[3px] border-acento bg-superficie px-2 py-1.5">
        <span className="text-[10px]">
          <b>Cuota S/ 350</b> · vence en 3 días
        </span>
        <button type="button" onClick={pagar} className="min-h-6! rounded bg-marca px-2.5 text-[10px] font-bold text-white">
          Pagar
        </button>
        <Manito className="-bottom-5 right-0 scale-75" />
      </div>
      <p className="mb-0.5 text-[12px] font-bold">Mis productos</p>
      {fila(IcCuentas, "Cuentas (1)")}
      {fila(IcTarjeta, "Tarjetas (1)")}
      {fila(IcCreditos, "Créditos (1) · Pagar mi cuota")}
    </div>
  );
}

function Confirmar({ asistida, confirmar, volver }: { asistida: boolean; confirmar: () => void; volver: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-2.5">
      <div className="rounded-lg bg-superficie p-2 text-center">
        <p className="text-[10px] text-tenue">Vas a pagar</p>
        <p className={`${asistida ? "text-[24px]" : "text-[18px]"} font-bold leading-tight`}>S/ 350.00</p>
        <p className="text-[9px] text-tenue">Cuota 8 de 12 · desde Ahorro ****0001</p>
      </div>
      {asistida && <p className="text-center text-[10px] text-tenue">🔊 «Vas a pagar 350 soles»</p>}
      <div className="relative">
        <button type="button" onClick={confirmar} className="guia-toca flex min-h-9! w-full items-center justify-center rounded-md bg-marca text-[12px] font-bold text-white">
          Confirmar pago
        </button>
        <Manito className="-bottom-4 right-8" />
      </div>
      <button type="button" onClick={volver} className="min-h-6! text-[10px] font-bold text-marca underline">
        Cancelar
      </button>
    </div>
  );
}

function Listo() {
  return (
    <div className="flex flex-col items-center gap-1.5 p-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-exito text-[22px] font-bold text-white">✓</span>
      <p className="text-[14px] font-bold">¡Pago realizado!</p>
      <p className="text-[10px] text-tenue">Te ahorraste una visita a la agencia · +10 puntos</p>
    </div>
  );
}

export function CelularPrevia({ vista }: { vista: Vista }) {
  const [paso, setPaso] = useState<Paso>("inicio");
  const asistida = vista === "ASISTIDA";

  // Al cambiar de vista, vuelve al inicio. Después de "¡Pago realizado!", vuelve solo.
  useEffect(() => setPaso("inicio"), [vista]);
  useEffect(() => {
    if (paso !== "listo") return;
    const t = setTimeout(() => setPaso("inicio"), 2200);
    return () => clearTimeout(t);
  }, [paso]);

  // La muestra se diseña a 248 px y se agranda en proporción hasta llenar el ancho de la columna (sin espacios a los costados).
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

  return (
    <figure className="flex w-full flex-col items-center gap-1.5">
      <div ref={caja} className="w-full">
        <div
          role="group"
          aria-label={`Prueba de la vista ${asistida ? "asistida" : "estándar"}: toca Pagar. Es de muestra, no mueve dinero.`}
          style={{ zoom: escala }}
          className="mx-auto w-[248px] rounded-t-[1.6rem] bg-[#0a0b0d] px-[5px] pt-[5px] ring-1 ring-white/15 [mask-image:linear-gradient(to_bottom,#000_82%,transparent)]"
        >
          <div className="relative flex h-[262px] flex-col overflow-hidden rounded-t-[1.25rem] bg-fondo">
            <div className="bg-marca px-3 pb-2 pt-2.5 text-white">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <span className="text-[15px] leading-none" aria-hidden>
                  {paso === "inicio" ? "☰" : "‹"}
                </span>
                {paso === "inicio" ? "Hola, Rosa" : paso === "confirmar" ? "Confirmar pago" : "Pago realizado"}
              </div>
              {paso === "inicio" && <p className="mt-0.5 text-center text-[8px] opacity-90">Tipo de cambio ref. Compra: 3.30 Venta: 3.60</p>}
            </div>
            <div key={`${vista}-${paso}`} className="anim-previa flex-1">
              {paso === "inicio" &&
                (asistida ? <InicioAsistida pagar={() => setPaso("confirmar")} /> : <InicioEstandar pagar={() => setPaso("confirmar")} />)}
              {paso === "confirmar" && <Confirmar asistida={asistida} confirmar={() => setPaso("listo")} volver={() => setPaso("inicio")} />}
              {paso === "listo" && <Listo />}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-sm text-tenue">👆 Pruébalo: toca «Pagar». Es de muestra.</figcaption>
    </figure>
  );
}
