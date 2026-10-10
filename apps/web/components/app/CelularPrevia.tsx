// Celular de muestra para la bienvenida: marco realista (isla, barra de estado, indicador de inicio) y, adentro, la
// pantalla de inicio de cada vista con la barra azul, la barra inferior y el botón de Pía de la app real.
// Medidas en px a propósito: la muestra no crece con la vista asistida (lo que crece es la app de verdad).
// Solo decorativo (aria-hidden): lo importante se dice en los chips de la bienvenida.
import type { Vista } from "@cp/shared";
import { IcChevronArriba, IcCreditos, IcCuentas, IcEstrella, IcPagos, IcParaTi, IcProductos, IcTarjeta, IcTransferencias } from "./IconosApp";
import { Mascota } from "@/components/ui/Mascota";

const PESTANAS = [
  { t: "Mis productos", I: IcProductos },
  { t: "Transferencias", I: IcTransferencias },
  { t: "Pagos", I: IcPagos },
  { t: "Frecuentes", I: IcEstrella },
  { t: "Para ti", I: IcParaTi },
];

function BarraEstado() {
  return (
    <div className="flex h-7 items-center justify-between bg-marca px-5 text-[10px] font-semibold text-white">
      <span>9:41</span>
      <span className="flex items-center gap-1">
        {/* señal */}
        <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor">
          <rect x="0" y="6" width="2.4" height="3" rx=".6" />
          <rect x="3.8" y="4" width="2.4" height="5" rx=".6" />
          <rect x="7.6" y="2" width="2.4" height="7" rx=".6" />
          <rect x="11.4" y="0" width="2.4" height="9" rx=".6" />
        </svg>
        {/* batería */}
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor">
          <rect x=".5" y=".5" width="16" height="9" rx="2.2" opacity=".6" />
          <rect x="2" y="2" width="10" height="6" rx="1.2" fill="currentColor" stroke="none" />
          <path d="M18.3 3.5v3" strokeLinecap="round" opacity=".6" />
        </svg>
      </span>
    </div>
  );
}

function Asistida() {
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
          <div className="guia-toca flex h-9 items-center justify-center rounded-md bg-marca text-[12px] font-bold text-white">Pagar S/ 350.00</div>
          {/* Manito que toca */}
          <svg className="anim-tap absolute -bottom-4 right-6 z-20 h-8 w-8 drop-shadow" viewBox="0 0 64 64" fill="#fff" stroke="#14202e" strokeWidth="3" strokeLinejoin="round">
            <path d="M24 34V12a5 5 0 0 1 10 0v16l3-1a5 5 0 0 1 6 3l1 1a5 5 0 0 1 6 4v1a5 5 0 0 1 6 5v8c0 8-6 14-14 14h-6c-5 0-9-2-12-6L14 44a5 5 0 0 1 7-7z" />
          </svg>
        </div>
      </div>
      <p className="mt-1 text-[12px] font-bold">¿Qué necesitas hacer hoy?</p>
      {["Pagar mi cuota", "Mis pagos frecuentes", "Pagar un recibo"].map((t, i) => (
        <div key={t} className="flex h-10 items-center gap-2 rounded-lg border border-linea-fuerte/70 bg-superficie px-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-marca text-[11px] text-white">{["📅", "⭐", "🧾"][i]}</span>
          <span className="text-[12px] font-bold">{t}</span>
        </div>
      ))}
    </div>
  );
}

function Estandar() {
  const fila = (I: (p: { className?: string }) => React.ReactNode, t: string) => (
    <div className="flex h-9 items-center gap-2 border-b border-linea/70 px-1">
      <I className="h-3.5 w-3.5 text-marca" />
      <span className="flex-1 text-[11px] font-medium">{t}</span>
      <IcChevronArriba className="h-3 w-3 text-marca" />
    </div>
  );
  return (
    <div className="flex flex-col p-2.5">
      <div className="mb-2 flex items-center justify-between rounded-md border-l-[3px] border-acento bg-superficie px-2 py-1.5">
        <span className="text-[10px]">
          <b>Cuota</b> · vence en 3 días
        </span>
        <span className="rounded bg-marca px-2 py-0.5 text-[10px] font-bold text-white">Pagar</span>
      </div>
      <p className="mb-0.5 text-[12px] font-bold">Mis productos</p>
      {fila(IcCuentas, "Cuentas (1)")}
      {fila(IcTarjeta, "Tarjetas (1)")}
      {fila(IcCreditos, "Créditos (1)")}
      <p className="mb-1 mt-2.5 text-[12px] font-bold">Mis servicios</p>
      <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-bold text-marca">
        {["Transferir", "Pagar recibo", "Frecuentes"].map((t) => (
          <span key={t} className="rounded bg-superficie px-1 py-2">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CelularPrevia({ vista }: { vista: Vista }) {
  return (
    <div aria-hidden className="mx-auto w-[248px] rounded-[2.6rem] bg-[#0a0b0d] p-[7px] shadow-[0_18px_40px_rgb(0_0_0/0.45)] ring-1 ring-white/15">
      <div className="relative flex h-[440px] flex-col overflow-hidden rounded-[2.1rem] bg-fondo">
        {/* Isla */}
        <span className="absolute left-1/2 top-1.5 z-30 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-[#0a0b0d]" />
        <BarraEstado />
        <div className="bg-marca px-3 pb-2 text-white">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <span className="text-[15px] leading-none">☰</span> Hola, Rosa
          </div>
          <p className="mt-0.5 text-center text-[8px] opacity-90">Tipo de cambio ref. Compra: 3.30 Venta: 3.60</p>
        </div>

        <div key={vista} className="anim-previa flex-1 overflow-hidden">
          {vista === "ASISTIDA" ? <Asistida /> : <Estandar />}
        </div>

        {/* Botón de Pía */}
        <div className="absolute bottom-[54px] right-2 z-20 flex items-center gap-1 rounded-full bg-marca py-0.5 pl-0.5 pr-2 text-[9px] font-bold text-white shadow-lg">
          <span className="rounded-full bg-white p-px">
            <Mascota tamano={14} />
          </span>
          ¿Necesitas ayuda?
        </div>

        {/* Barra inferior */}
        <div className="flex h-[46px] items-stretch border-t border-linea bg-fondo-hondo">
          {PESTANAS.map(({ t, I }, i) => (
            <span key={t} className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[6.5px] leading-none ${i === 0 ? "text-marca" : "text-tinta/85"}`}>
              <I className="h-3.5 w-3.5" />
              {t}
            </span>
          ))}
        </div>
        {/* Indicador de inicio */}
        <span className="absolute bottom-1 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-tinta/40" />
      </div>
    </div>
  );
}
