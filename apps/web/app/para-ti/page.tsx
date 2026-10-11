"use client";
// Sección "Para ti" de la app oficial. Además de sus tarjetas de siempre, aquí viven las dos de Pía:
// el progreso (cashback y avance) y sus ajustes (vista y recordatorios).
import { FilaParaTi } from "@/components/app/Lista";
import { IcAhorro, IcAjustesPia, IcBilletes, IcLibro, IcTrofeo } from "@/components/app/IconosApp";
import { Pantalla } from "@/components/ui";
import { track } from "@/lib/track";

const otro = (n: string) => `/servicio?n=${encodeURIComponent(n)}&v=/para-ti`;

export default function ParaTi() {
  return (
    <Pantalla titulo="Para ti" pestana="parati" plano>
      <div className="flex flex-col gap-2">
        <FilaParaTi destacada titulo="Mi progreso con Pía" texto="Mira tu cashback, cómo ganar más y cuánto te falta de tu crédito." ruta="/progreso" Icono={IcTrofeo} onClick={() => track("parati-progreso", "tocar")} />
        <FilaParaTi destacada titulo="Recordatorios y vista" texto="Elige cuándo te avisamos de tus pagos y cómo ver la app." ruta="/ajustes" Icono={IcAjustesPia} onClick={() => track("parati-ajustes", "tocar")} />
        <FilaParaTi titulo="LIBRO DE RECLAMACIONES" texto="En Caja Piura, tu opinión nos ayuda a mejorar." ruta={otro("Libro de reclamaciones")} Icono={IcLibro} />
        <FilaParaTi titulo="Cambiar soles y dólares" texto="Cambia los dólares que necesitas de manera rápida y segura." ruta={otro("Cambiar soles y dólares")} Icono={IcBilletes} />
        <FilaParaTi titulo="Cuenta de Ahorro" texto="Abre tu cuenta de ahorro e inicia tu experiencia en Caja Piura." ruta={otro("Cuenta de Ahorro")} Icono={IcAhorro} />
        <FilaParaTi titulo="Utiliza Yape" texto="Afíliate a Yape con tu tarjeta Piura Cash y realiza tus compras y pagos de manera rápida y segura." ruta={otro("Yape")} Icono={IcCelularYape} />
      </div>
    </Pantalla>
  );
}

function IcCelularYape({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="700" fontStyle="italic" fill="#00549f">yape</text>
    </svg>
  );
}
