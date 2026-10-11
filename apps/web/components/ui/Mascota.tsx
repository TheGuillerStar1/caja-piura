// F0. Mascota "Pía" (SVG ligero) con globo de diálogo opcional.
type Props = { mensaje?: React.ReactNode; tamano?: number; animada?: boolean; className?: string };

export function Mascota({ mensaje, tamano = 72, animada, className = "" }: Props) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 80 80"
        role="img"
        aria-label="Pía, tu asistente de Caja Piura"
        className={`shrink-0 ${animada ? "anim-rebote" : ""}`}
      >
        <circle cx="40" cy="42" r="32" fill="#0b4ed4" />
        <circle cx="40" cy="40" r="25" fill="#ffffff" />
        <circle cx="31" cy="37" r="4" fill="#1c1f24" />
        <circle cx="49" cy="37" r="4" fill="#1c1f24" />
        <circle cx="32.5" cy="35.5" r="1.3" fill="#fff" />
        <circle cx="50.5" cy="35.5" r="1.3" fill="#fff" />
        <path d="M31 48c5 5 13 5 18 0" stroke="#1c1f24" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="25" cy="46" r="3.5" fill="#d97706" opacity=".28" />
        <circle cx="55" cy="46" r="3.5" fill="#d97706" opacity=".28" />
        <path d="M40 10v-6" stroke="#00549f" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="4" r="3.5" fill="#d97706" />
      </svg>
      {mensaje && (
        <div className="relative mb-3 flex-1 rounded-2xl rounded-bl-sm border-2 border-linea bg-superficie px-4 py-3 text-lg leading-snug">
          {mensaje}
        </div>
      )}
    </div>
  );
}
