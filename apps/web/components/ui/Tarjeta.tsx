// F0. Contenedor con borde. tono cambia el color de fondo (avisos, éxito, error).
type Tono = "normal" | "marca" | "exito" | "aviso" | "error";
const tonos: Record<Tono, string> = {
  normal: "bg-superficie border-linea",
  marca: "bg-marca-claro border-marca/40",
  exito: "bg-exito-claro border-exito/40",
  aviso: "bg-aviso-claro border-aviso/40",
  error: "bg-error-claro border-error/40",
};

export function Tarjeta({ tono = "normal", className = "", children }: { tono?: Tono; className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border-2 p-4 ${tonos[tono]} ${className}`}>{children}</div>;
}
