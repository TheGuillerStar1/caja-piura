// Fondo lila de las pantallas de acceso de la app oficial, con la ilustración de línea (mano, celular, tarjeta).
export function FondoAcceso({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col overflow-hidden text-white"
      style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--cp-login-light) 58%, var(--cp-app-blue)) 0%, color-mix(in srgb, var(--cp-login-light) 70%, var(--cp-app-blue)) 45%, color-mix(in srgb, var(--cp-login-light) 82%, var(--cp-app-blue)) 100%)" }}
    >
      <svg
        viewBox="0 0 300 420"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 w-[110%] -translate-x-1/2 opacity-60"
        fill="none"
        stroke="color-mix(in srgb, var(--cp-login-light) 45%, var(--cp-app-blue))"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* tarjeta */}
        <rect x="128" y="40" width="120" height="74" rx="10" />
        <path d="M128 62h120M146 92h22M174 92h22M202 92h22" />
        {/* celular */}
        <rect x="88" y="70" width="112" height="196" rx="16" />
        <rect x="102" y="96" width="84" height="40" rx="6" />
        <path d="M112 116h14M134 116h14M156 116h14" />
        <circle cx="124" cy="176" r="15" />
        <path d="M117 176l5 5 9-10" />
        <rect x="112" y="210" width="62" height="22" rx="11" />
        {/* moneda y pulgar */}
        <circle cx="52" cy="70" r="20" />
        <text x="52" y="77" fontSize="18" fill="color-mix(in srgb, var(--cp-login-light) 45%, var(--cp-app-blue))" stroke="none" textAnchor="middle" fontWeight="700">S/</text>
        <circle cx="262" cy="150" r="22" />
        <path d="M252 158v-14h5l6-10c3 0 4 2 3 5l-2 5h8c3 0 4 3 3 5l-3 9h-20z" />
        {/* mano */}
        <path d="M70 420c4-40 10-70 26-96l30-46c6-8 16-5 14 5l-12 40 18-36c4-8 14-6 13 3l-10 40 14-22c5-7 13-3 11 5l-10 30 12-14c5-5 12-1 10 6l-26 60c-8 20-12 25-14 25" />
        <path d="M160 270c6-14 12-34 14-52 2-12 14-12 14 0l-4 50" />
      </svg>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
