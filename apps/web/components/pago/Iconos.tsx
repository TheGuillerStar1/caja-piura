// Dueño: Agente B. Íconos SVG simples (trazo grueso, sin librerías).
type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconoCuota = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M12 13v5M10 14.5c0-.8.9-1.5 2-1.5s2 .6 2 1.3-.9 1.2-2 1.2-2 .6-2 1.3.9 1.2 2 1.2 2-.6 2-1.4" />
  </svg>
);
export const IconoFrecuente = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
);
export const IconoRecibo = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
    <path d="M9 7h6M9 11h6M9 15h4" />
  </svg>
);
export const IconoAyuda = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 4M12 17h.01" />
  </svg>
);
export const IconoSaldo = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20M16 15h2" />
  </svg>
);
export const IconoProgreso = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconoAjustes = ({ className = "h-10 w-10" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);
export const IconoHuella = ({ className = "h-14 w-14" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 11v3a8 8 0 01-1.5 4.5M8 8.5A5 5 0 0117 11v1.5M7 12v1a12 12 0 01-1 4.5M14 13.5a14 14 0 01-1 6M17 15.5a17 17 0 01-.5 3M4.5 9A8.5 8.5 0 0120 10.5" />
  </svg>
);
export const IconoRostro = ({ className = "h-14 w-14" }: P) => (
  <svg {...base} className={className}>
    <path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" />
    <path d="M9 9.5v1M15 9.5v1M12 10v3h-1M9 16c1.7 1.3 4.3 1.3 6 0" />
  </svg>
);
export const IconoCheck = ({ className = "h-20 w-20", color = "var(--color-exito)" }: P & { color?: string }) => (
  <svg viewBox="0 0 52 52" className={className} aria-hidden>
    <circle cx="26" cy="26" r="25" fill={color} />
    <path d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="anim-trazo" />
  </svg>
);
export const IconoX = ({ className = "h-20 w-20" }: P) => (
  <svg viewBox="0 0 52 52" className={className} aria-hidden>
    <circle cx="26" cy="26" r="25" fill="var(--color-error)" />
    <path d="M18 18l16 16M34 18L18 34" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
/** Logo oficial de WhatsApp (Simple Icons), relleno con el color del texto. */
export const IconoWhatsApp = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
