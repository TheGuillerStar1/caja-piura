"use client";
// F3 (Agente F). Si una pantalla falla, mensaje claro y botón para reintentar (no deja la pantalla en blanco).
// Sin importar componentes ni lib/api: este archivo se descarga en todas las rutas, debe pesar casi nada.

export default function ErrorPantalla({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div role="alert" className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-fondo justify-center gap-5 px-4 py-8">
      <p className="text-2xl font-bold">{sinRed ? "Sin conexión." : "Algo no salió bien al abrir esta pantalla."}</p>
      <p className="text-lg">No se cobró nada. {sinRed ? "Cuando vuelva la señal, vuelve a intentar." : "Vuelve a intentar."}</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-boton bg-marca px-5 py-3 text-lg font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2"
      >
        Intentar de nuevo
      </button>
      <a href="/inicio" className="flex items-center justify-center rounded-boton border-2 border-marca px-5 py-3 text-lg font-bold text-marca">
        Ir al inicio
      </a>
    </div>
  );
}
