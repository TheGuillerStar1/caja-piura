// Piezas de marca compartidas por /gestion (Centro de mando) y /panel (Panel del jurado), según el Manual visual
// «Caja Piura Contigo»: cabecera azul institucional → azul app con el logo blanco, ilustración de línea lila,
// tarjetas blancas con sombra azulada y el naranja de acción para lo que hay que mirar o tocar.
import type { LucideIcon } from "lucide-react";
import { Coins } from "lucide-react";
import Link from "next/link";
import { LogoCajaPiura } from "@/app/_entrada/Logo";
import { DEGRADADO_BARRA, DEGRADADO_MARCA, TARJETA } from "./formato";

export type Seccion = { href: string; texto: string; icono: LucideIcon };

/** Cabecera azul de marca. El contenido de la página se monta encima de su borde inferior (-mt-20). */
export function Portada({
  etiqueta,
  titulo,
  texto,
  secciones,
  insignia,
  enlace,
  actualizado,
  error,
}: {
  etiqueta: string;
  titulo: string;
  texto: string;
  secciones: Seccion[];
  insignia?: string;
  enlace: { href: string; texto: string };
  actualizado: Date | null;
  error: boolean;
}) {
  return (
    <header className="relative overflow-hidden text-white" style={{ background: DEGRADADO_MARCA }}>
      <Ilustracion />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-44 pt-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoCajaPiura variante="blanco" className="h-9 sm:h-10" />
            <span className="h-8 w-px bg-white/35" aria-hidden />
            <span className="text-sm font-bold uppercase tracking-wider text-white/90">{etiqueta}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p className="flex min-h-9 items-center gap-2 rounded-full bg-white/15 px-3 font-medium backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                {!error && <span className="absolute inset-0 animate-ping rounded-full bg-[#6ee7a8] opacity-70" />}
                <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${error ? "bg-[#ffb4a8]" : "bg-[#6ee7a8]"}`} />
              </span>
              {error ? "Sin conexión, reintentando…" : actualizado ? `En vivo · ${actualizado.toLocaleTimeString("es-PE")}` : "Conectando…"}
            </p>
            <Link href={enlace.href} className="flex min-h-9 items-center rounded-full bg-white px-4 font-bold text-[var(--cp-brand)] shadow-sm hover:bg-[var(--cp-login-light)]">
              {enlace.texto}
            </Link>
          </div>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight [text-shadow:0_1px_3px_rgb(0_30_80/0.35)] sm:text-[2.6rem]">{titulo}</h1>
          <p className="mt-2 text-base text-white/90 sm:text-lg">{texto}</p>
        </div>

        <nav aria-label="Secciones" className="flex flex-wrap gap-2 text-sm font-bold">
          {secciones.map(({ href, texto: t, icono: I }) => (
            <a key={href} href={href} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 backdrop-blur-sm transition-colors hover:bg-white/25">
              <I className="h-4 w-4" aria-hidden />
              {t}
            </a>
          ))}
          {insignia && <span className="flex min-h-10 items-center rounded-full bg-acento px-4 text-white shadow-sm">{insignia}</span>}
        </nav>
      </div>
    </header>
  );
}

/** Trazos de línea: pin del mapa, barras, moneda y celular. Decorativo. */
function Ilustracion() {
  return (
    <svg
      viewBox="0 0 600 260"
      aria-hidden
      className="pointer-events-none absolute -right-10 top-0 h-full w-[46rem] max-w-none opacity-25"
      fill="none"
      stroke="var(--cp-login-light)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M120 40c-26 0-46 20-46 45 0 34 46 80 46 80s46-46 46-80c0-25-20-45-46-45z" />
      <circle cx="120" cy="86" r="16" />
      <path d="M40 210c40-30 80 10 120-20s70-40 110-10 60 30 100 0" strokeDasharray="6 8" />
      <path d="M300 200v-50M335 200v-80M370 200v-110M405 200v-70" strokeWidth="14" />
      <path d="M285 200h135" />
      <circle cx="500" cy="70" r="30" />
      <text x="500" y="79" fontSize="24" fill="var(--cp-login-light)" stroke="none" textAnchor="middle" fontWeight="700">
        S/
      </text>
      <rect x="470" y="130" width="70" height="120" rx="12" />
      <path d="M490 150h30M488 225h34" />
      <path d="M210 70l30-22 30 14 34-30" />
      <path d="M296 32h10v10" />
    </svg>
  );
}

export function Encabezado({
  icono: I,
  id,
  antetitulo,
  titulo,
  texto,
  sobreAzul,
  children,
}: {
  icono: LucideIcon;
  id: string;
  antetitulo: string;
  titulo: string;
  texto: string;
  /** Para la primera sección, que se monta sobre la cabecera azul: texto blanco. */
  sobreAzul?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md ${sobreAzul ? "bg-white/20 ring-1 ring-white/40 backdrop-blur-sm" : ""}`}
          style={sobreAzul ? undefined : { background: DEGRADADO_MARCA }}
          aria-hidden
        >
          <I className="h-6 w-6" />
        </span>
        <div className={sobreAzul ? "text-white" : ""}>
          <p className={`text-xs font-bold uppercase tracking-wider ${sobreAzul ? "text-white/80" : "text-marca"}`}>{antetitulo}</p>
          <h2 id={id} className={`text-2xl font-bold leading-tight ${sobreAzul ? "[text-shadow:0_1px_3px_rgb(0_30_80/0.35)]" : ""}`}>
            {titulo}
          </h2>
          <p className={`text-sm ${sobreAzul ? "text-white/85" : "text-tenue"}`}>{texto}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Tarjeta de indicador. `destacado`: en azul de marca con la etiqueta naranja. */
export function Tile({
  icono: I,
  titulo,
  valor,
  nota,
  barra,
  destacado,
  etiqueta = "Oportunidad",
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  nota: string;
  barra?: number;
  destacado?: boolean;
  etiqueta?: string;
  children?: React.ReactNode;
}) {
  if (destacado)
    return (
      <div className="relative flex flex-col gap-1 overflow-hidden rounded-2xl p-5 text-white shadow-[0_14px_32px_-12px_rgb(0_84_159/0.6)]" style={{ background: DEGRADADO_MARCA }}>
        <Coins className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 text-white/10" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white/90">{titulo}</h3>
          <span className="rounded-full bg-acento px-2.5 py-0.5 text-xs font-bold">{etiqueta}</span>
        </div>
        <p className="text-4xl font-bold tabular-nums">{valor}</p>
        <p className="relative text-sm leading-snug text-white/85">{nota}</p>
        {children}
      </div>
    );
  return (
    <div className={`${TARJETA} flex flex-col gap-1 p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-tenue">{titulo}</h3>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-marca-claro text-marca" aria-hidden>
          <I className="h-5 w-5" />
        </span>
      </div>
      <p className="text-4xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm leading-snug text-tenue">{nota}</p>
      {barra != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-fondo" aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, barra) * 100}%`, background: DEGRADADO_BARRA }} />
        </div>
      )}
      {children}
    </div>
  );
}

export function PieMarca({ children }: { children: React.ReactNode }) {
  return (
    <footer className="border-t border-linea bg-superficie">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-start sm:px-8 lg:px-12">
        <LogoCajaPiura className="h-10 shrink-0" />
        <div className="text-xs leading-relaxed text-tenue">{children}</div>
      </div>
    </footer>
  );
}
