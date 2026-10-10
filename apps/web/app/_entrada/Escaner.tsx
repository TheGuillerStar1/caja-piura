// Dueño: Agente A. Animaciones CSS de biometría simulada (cara y huella). Sin librerías ni imágenes.
const CSS = `
@keyframes cp-barrido { 0% { transform: translateY(0); } 50% { transform: translateY(120px); } 100% { transform: translateY(0); } }
@keyframes cp-llenado { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
.cp-barrido { animation: cp-barrido 1.5s ease-in-out infinite; }
.cp-llenado { stroke-dasharray: 400; animation: cp-llenado 1.5s linear forwards; }
@media (prefers-reduced-motion: reduce) { .cp-barrido, .cp-llenado { animation: none; stroke-dashoffset: 0; } }
`;

export function Escaner({ tipo }: { tipo: "ROSTRO" | "HUELLA" }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status">
      <style>{CSS}</style>
      {tipo === "ROSTRO" ? (
        <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-marca bg-marca-claro">
          <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true">
            <ellipse cx="80" cy="76" rx="38" ry="48" fill="none" stroke="#0a4fa3" strokeWidth="4" />
            <circle cx="66" cy="70" r="4" fill="#0a4fa3" />
            <circle cx="94" cy="70" r="4" fill="#0a4fa3" />
            <path d="M66 96c8 7 20 7 28 0" stroke="#0a4fa3" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
          <span className="cp-barrido absolute left-0 right-0 top-4 h-1 bg-exito shadow-[0_0_12px_#15803d]" />
        </div>
      ) : (
        <svg viewBox="0 0 120 140" className="h-40 w-36" aria-hidden="true">
          <g fill="none" strokeWidth="5" strokeLinecap="round">
            <g stroke="#c9d4e3">
              <path d="M30 60a30 30 0 0 1 60 0v20" />
              <path d="M45 62a15 15 0 0 1 30 0v30c0 10-4 20-10 28" />
              <path d="M60 64v32c0 8-3 16-8 22" />
              <path d="M18 80V60a42 42 0 0 1 84 0v24" />
              <path d="M90 90c0 14-4 26-10 36" />
            </g>
            <g stroke="#0a4fa3" className="cp-llenado">
              <path d="M30 60a30 30 0 0 1 60 0v20" />
              <path d="M45 62a15 15 0 0 1 30 0v30c0 10-4 20-10 28" />
              <path d="M60 64v32c0 8-3 16-8 22" />
              <path d="M18 80V60a42 42 0 0 1 84 0v24" />
              <path d="M90 90c0 14-4 26-10 36" />
            </g>
          </g>
        </svg>
      )}
      <p className="text-xl font-bold">{tipo === "ROSTRO" ? "Mira a la cámara…" : "Apoya tu dedo en el lector…"}</p>
    </div>
  );
}
