"use client";
// Dueño: Agente D. Notificaciones "push" simuladas, estilo celular, que bajan desde arriba tras "Adelantar 30 días".

const ESTILOS = `
@keyframes cp-bajar { from { transform: translateY(-120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.cp-noti { animation: cp-bajar .45s ease-out both; }
@media (prefers-reduced-motion: reduce) { .cp-noti { animation: none; } }
`;

function IconoCaja() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="shrink-0">
      <rect width="36" height="36" rx="9" fill="#0a4fa3" />
      <path d="M9 18a9 9 0 0 1 15.6-6.1" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M24.6 24.1A9 9 0 0 1 9 18" stroke="#e30613" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="18" r="3" fill="#fff" />
    </svg>
  );
}

type Props = { mensajes: string[]; alTocar: () => void; alCerrar: () => void };

export function NotificacionesSimuladas({ mensajes, alTocar, alCerrar }: Props) {
  if (!mensajes.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-2 pt-2" aria-live="polite">
      <style>{ESTILOS}</style>
      {mensajes.map((m, i) => (
        <button
          key={m + i}
          type="button"
          onClick={alTocar}
          className="cp-noti pointer-events-auto flex w-full max-w-app items-start gap-3 rounded-2xl bg-white/95 p-3 text-left text-[#14233a] shadow-lg ring-1 ring-black/10 backdrop-blur"
          style={{ animationDelay: `${i * 350}ms` }}
        >
          <IconoCaja />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center justify-between gap-2 text-xs text-tenue">
              <span className="font-bold uppercase tracking-wide">Caja Piura</span>
              <span>ahora</span>
            </span>
            <span className="font-bold leading-snug">{m}</span>
            <span className="text-sm text-tenue">Toca para pagar desde tu celular</span>
          </span>
        </button>
      ))}
      <div className="pointer-events-auto flex w-full max-w-app items-center justify-between px-1">
        <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">Notificación simulada</span>
        <button type="button" onClick={alCerrar} className="min-w-12 rounded-full bg-black/70 px-3 text-sm text-white">
          Cerrar
        </button>
      </div>
    </div>
  );
}
