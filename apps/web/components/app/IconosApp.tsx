// Íconos de la app oficial de Caja Piura (barra inferior, menú lateral y listas). SVG de trazo, sin librerías.
type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IcMenu = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} strokeWidth={2} className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const IcAtras = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} strokeWidth={2.2} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IcChevron = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} strokeWidth={1.6} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const IcChevronArriba = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} strokeWidth={1.6} className={className}>
    <path d="M5 15l7-7 7 7" />
  </svg>
);
/** Mis productos: billetera. */
export const IcProductos = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h10.2a1 1 0 0 1 .9 1.4L17 7h1.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 4 17.5zM6.5 6a.5.5 0 0 0 0 1h8.9l.4-1zM16 12.2a1.3 1.3 0 1 0 0 2.6h3v-2.6z" />
  </svg>
);
/** Transferencias: moneda con flechas. */
export const IcTransferencias = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="5" fill="currentColor" stroke="none" />
    <path d="M12 5.6v4.8M10.8 6.6h1.8a.9.9 0 0 1 0 1.8h-1.2a.9.9 0 0 0 0 1.8h1.8" stroke="#121417" strokeWidth="1.2" />
    <path d="M4 17h14l-3-3M20 20H6l3 3" />
  </svg>
);
/** Pagos: mano con moneda. */
export const IcPagos = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="13" cy="6.5" r="3.5" fill="currentColor" stroke="none" />
    <path d="M3 14h3l3.5-1.5h4a1.5 1.5 0 0 1 0 3H10m3.5 0 4.6-2.2a1.6 1.6 0 0 1 1.9 2.5L15 20H6l-3-1.5" />
  </svg>
);
export const IcEstrella = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
  </svg>
);
/** Para ti: mano con corazón. */
export const IcParaTi = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M14 3.5c1-1.3 3.4-1 3.4 1.1 0 1.6-2.3 3-3.4 3.9-1.1-.9-3.4-2.3-3.4-3.9 0-2.1 2.4-2.4 3.4-1.1z" fill="currentColor" />
    <path d="M3 14h3l3.5-1.5h4a1.5 1.5 0 0 1 0 3H10m3.5 0 4.6-2.2a1.6 1.6 0 0 1 1.9 2.5L15 20H6l-3-1.5" />
  </svg>
);
/** Cuentas: bolsa de dinero. */
export const IcCuentas = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M9 2.5h6l-1.6 3.2h-2.8zM10.4 7h3.2C17.5 9.2 20 13 20 16.5 20 20 17.4 21.5 12 21.5S4 20 4 16.5C4 13 6.5 9.2 10.4 7z" />
  </svg>
);
export const IcTarjeta = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5H3zM3 11h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm3 4v1.5h5V15z" />
  </svg>
);
export const IcCreditos = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M3 9h7v12H3zM12 4h9v17h-9zM5 11v2h3v-2zm0 4v2h3v-2zm9-9v2h5V6zm0 4v2h5v-2zm0 4v2h5v-2z" />
  </svg>
);
export const IcCelular = ({ className = "h-9 w-9" }: P) => (
  <svg {...base} className={className}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
    <path d="M10.5 18.5h3" />
  </svg>
);
export const IcCasa = ({ className = "h-7 w-7" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 3 2.5 11h2.5v9h5v-5.5h4V20h5v-9h2.5z" />
  </svg>
);
export const IcCambio = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M20 8a8 8 0 0 0-14.5-2.5M4 16a8 8 0 0 0 14.5 2.5" />
    <path d="M20 3v5h-5M4 21v-5h5" />
    <path d="M12 8v8M10.3 9.5h2.4a1.2 1.2 0 0 1 0 2.4h-1.4a1.2 1.2 0 0 0 0 2.4h2.4" strokeWidth="1.4" />
  </svg>
);
export const IcPlazoFijo = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="9" r="5" fill="currentColor" stroke="none" />
    <path d="M14 13.5h3l2.5-1.2a1.5 1.5 0 0 1 1.5 2.5L16.5 18H9l-3-1.5M6 14h3.5l3-1" />
  </svg>
);
export const IcMonedas = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <ellipse cx="9" cy="7" rx="6" ry="2.5" />
    <path d="M3 9v2c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V9c-1.3 1-3.5 1.5-6 1.5S4.3 10 3 9zM9 15c2.3 0 4.3-.5 5.5-1.3V16c0 1.4-2.5 2.5-5.5 2.5S3 17.4 3 16v-2.3C4.3 14.5 6.6 15 9 15z" />
    <ellipse cx="17.5" cy="15" rx="4" ry="1.8" />
    <path d="M13.5 17v1.5c0 1 1.8 1.8 4 1.8s4-.8 4-1.8V17c-.9.6-2.4 1-4 1s-3.1-.4-4-1z" />
  </svg>
);
export const IcCampana = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 3a6 6 0 0 0-6 6v4.5L4 17h16l-2-3.5V9a6 6 0 0 0-6-6zM9.5 19a2.5 2.5 0 0 0 5 0z" />
  </svg>
);
export const IcEngranaje = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M10.3 2h3.4l.5 2.6 1.6.9 2.5-.9 1.7 3-2 1.7v1.4l2 1.7-1.7 3-2.5-.9-1.6.9-.5 2.6h-3.4l-.5-2.6-1.6-.9-2.5.9-1.7-3 2-1.7V9.3l-2-1.7 1.7-3 2.5.9 1.6-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" transform="translate(0 1.5)" />
  </svg>
);
export const IcPreguntas = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M4 3h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M19 8h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3h-5a2 2 0 0 1-2-2v-1h7a3 3 0 0 0 3-3z" opacity=".7" />
  </svg>
);
export const IcSalir = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8" />
    <path d="M11 12h10M18 9l3 3-3 3" />
  </svg>
);
export const IcLapiz = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M15.5 4.5l4 4L9 19H5v-4zM17 3l1.5-1.5a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L21 7z" />
  </svg>
);
export const IcBanco = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M3 9.5 12 4l9 5.5M4 20h16M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
  </svg>
);
export const IcBilletera = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M21 10h-4.5a2 2 0 0 0 0 4H21" />
  </svg>
);
export const IcPersonas = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="7" r="2.5" />
    <circle cx="5" cy="9" r="2" />
    <circle cx="19" cy="9" r="2" />
    <path d="M7.5 19v-2.5a4.5 4.5 0 0 1 9 0V19M1.5 18v-1.5A3.5 3.5 0 0 1 6 13.2M22.5 18v-1.5a3.5 3.5 0 0 0-4.5-3.3" />
  </svg>
);
export const IcAgua = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3s5 5.5 5 9.5a5 5 0 0 1-10 0C7 8.5 12 3 12 3z" />
    <path d="M3 21h18" />
  </svg>
);
export const IcCreditoTerceros = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="7" r="3" />
    <path d="M3 18v-1a5 5 0 0 1 10 0v1" />
    <rect x="14" y="11" width="8" height="8" rx="1.5" />
    <path d="M16.5 15h3" />
  </svg>
);
export const IcTarjetaPago = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M3 13h3l3.5-1.5h4a1.5 1.5 0 0 1 0 3H10m3.5 0 4.6-2.2a1.6 1.6 0 0 1 1.9 2.5L15 19H6l-3-1.5" />
    <rect x="9" y="3" width="11" height="7" rx="1.2" />
    <path d="M9 5.5h11" />
  </svg>
);
export const IcLibro = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />
  </svg>
);
export const IcBilletes = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className}>
    <rect x="2.5" y="7" width="16" height="10" rx="1.5" />
    <path d="M5.5 4.5h16v10" />
    <circle cx="10.5" cy="12" r="2.2" />
  </svg>
);
export const IcAhorro = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className}>
    <rect x="5" y="2.5" width="10" height="17" rx="2" />
    <circle cx="10" cy="9.5" r="2.5" />
    <path d="M14 15.5h4.5l2.5 2.5-2.5 2.5H14" />
  </svg>
);
export const IcTrofeo = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7l-1-3h-5z" />
  </svg>
);
export const IcAjustesPia = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3a6 6 0 0 0-6 6v4.5L4 17h16l-2-3.5V9a6 6 0 0 0-6-6zM9.5 19.5a2.5 2.5 0 0 0 5 0" />
  </svg>
);
export const IcUsuario = ({ className = "h-9 w-9" }: P) => (
  <svg {...base} strokeWidth={1.6} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);
export const IcCandado = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} strokeWidth={2} className={className}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const IcUbicacion = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} strokeWidth={1.5} className={className}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const IcAuricular = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} strokeWidth={1.5} className={className}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="3" y="13.5" width="4" height="6" rx="1.5" />
    <rect x="17" y="13.5" width="4" height="6" rx="1.5" />
    <path d="M19 19.5c0 1.5-1.5 2.5-4 2.5h-2" />
  </svg>
);
export const IcToken = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} strokeWidth={1.5} className={className}>
    <path d="M6.5 18A4.5 4.5 0 0 1 6 9.1a6 6 0 0 1 11.6 1.4A3.8 3.8 0 0 1 17.5 18z" />
    <path d="M8 14.5h.01M10.7 14.5h.01M13.3 14.5h.01M16 14.5h.01" strokeWidth="2.4" />
  </svg>
);
