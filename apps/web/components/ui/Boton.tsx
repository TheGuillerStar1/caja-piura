// F0. Botón base. Variantes: primario (acción principal, 1 por pantalla), secundario, fantasma, peligro.
// guia = true muestra el anillo pulsante y la etiqueta "Toca aquí" encima: la acción a tocar se ve, no se deduce.
import Link from "next/link";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";
type Props = {
  variante?: Variante;
  guia?: boolean;
  bloque?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const estilos: Record<Variante, string> = {
  primario: "bg-marca text-white hover:bg-marca-oscuro active:bg-marca-oscuro disabled:bg-linea disabled:text-tenue",
  secundario: "bg-superficie text-marca border-2 border-marca hover:bg-marca-claro",
  fantasma: "bg-transparent text-marca underline underline-offset-4",
  peligro: "bg-superficie text-error border-2 border-error hover:bg-error-claro",
};

export function Boton({ variante = "primario", guia, bloque = true, href, className = "", children, ...resto }: Props) {
  const clases = `inline-flex items-center justify-center gap-2 rounded-boton px-5 py-3 text-lg font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marca ${
    bloque ? "w-full" : ""
  } ${estilos[variante]} ${guia ? "guia-toca guia-etiqueta" : ""} ${className}`;
  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={clases} {...resto}>
      {children}
    </button>
  );
}
