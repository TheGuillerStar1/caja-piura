// Dueño: Agente A. Logo simple de Caja Piura en SVG (sin imágenes).
export function LogoCajaPiura({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="Caja Piura">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill={claro ? "#fff" : "#0a4fa3"} />
        <path d="M11 27V13h8a5 5 0 0 1 0 10h-4" stroke={claro ? "#0a4fa3" : "#fff"} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle cx="29" cy="27" r="3.2" fill="#e30613" />
      </svg>
      <span className={`text-2xl font-bold tracking-tight ${claro ? "text-white" : "text-marca"}`}>Caja Piura</span>
    </div>
  );
}
