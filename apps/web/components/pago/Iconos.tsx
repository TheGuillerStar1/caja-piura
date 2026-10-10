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
export const IconoCheck = ({ className = "h-20 w-20" }: P) => (
  <svg viewBox="0 0 52 52" className={className} aria-hidden>
    <circle cx="26" cy="26" r="25" fill="var(--color-exito)" />
    <path d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="anim-trazo" />
  </svg>
);
export const IconoX = ({ className = "h-20 w-20" }: P) => (
  <svg viewBox="0 0 52 52" className={className} aria-hidden>
    <circle cx="26" cy="26" r="25" fill="var(--color-error)" />
    <path d="M18 18l16 16M34 18L18 34" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
