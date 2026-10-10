// Listas de la app oficial: panel oscuro con filas (ícono azul · texto · ›) y el chip "Mis operaciones frecuentes".
import Link from "next/link";
import { IcChevron, IcEstrella } from "./IconosApp";

type Icono = (p: { className?: string }) => React.ReactNode;
export type ItemLista = { texto: string; ruta: string; Icono: Icono; nuevo?: string; onClick?: () => void };

export function PanelLista({ items }: { items: ItemLista[] }) {
  return (
    <ul className="mx-3 overflow-hidden rounded-lg bg-superficie shadow-[0_1px_4px_rgb(0_0_0/0.35)]">
      {items.map(({ texto, ruta, Icono, nuevo, onClick }) => (
        <li key={texto} className="border-b border-linea/70 last:border-0">
          <Link href={ruta} onClick={onClick} className="flex min-h-15 items-center gap-4 px-5 text-[0.95rem] font-medium text-white active:bg-superficie-2 in-data-[vista=ASISTIDA]:min-h-17 in-data-[vista=ASISTIDA]:text-lg">
            <Icono className="h-6 w-6 shrink-0 text-marca in-data-[vista=ASISTIDA]:h-7 in-data-[vista=ASISTIDA]:w-7" />
            <span className="flex-1">
              {texto}
              {nuevo && <span className="ml-2 rounded-full bg-marca px-2 py-0.5 align-middle text-xs font-bold text-white">{nuevo}</span>}
            </span>
            <IcChevron className="h-5 w-5 shrink-0 text-marca" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ChipFrecuentes({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/pagar/frecuentes"
      onClick={onClick}
      className="mx-auto mt-4 flex min-h-12 items-center gap-3 rounded-full border-2 border-marca bg-fondo-hondo px-8 text-[0.95rem] font-medium text-white active:bg-superficie"
    >
      <IcEstrella className="h-6 w-6 text-marca" />
      Mis operaciones frecuentes
    </Link>
  );
}

/** Tarjeta de "Para ti": ícono a la izquierda, título azul y descripción. */
export function FilaParaTi({ titulo, texto, ruta, Icono, onClick, destacada }: { titulo: string; texto: string; ruta: string; Icono: Icono; onClick?: () => void; destacada?: boolean }) {
  return (
    <Link
      href={ruta}
      onClick={onClick}
      className={`mx-3 flex items-center gap-4 rounded-lg px-4 py-4 active:bg-superficie-2 ${destacada ? "bg-marca-claro ring-1 ring-marca/60" : "bg-superficie"}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-marca text-white">
        <Icono className="h-7 w-7" />
      </span>
      <span className="flex-1">
        <span className="block text-[1.05rem] font-medium text-marca">{titulo}</span>
        <span className="block text-sm leading-snug text-white/90">{texto}</span>
      </span>
      <IcChevron className="h-5 w-5 shrink-0 text-marca" />
    </Link>
  );
}
