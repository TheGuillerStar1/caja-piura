// Dueño: Agente C. Teclado numérico propio para escribir el código del recibo (no abre el teclado del celular).
type Props = { valor: string; largo: number; onCambio: (v: string) => void };

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "borrar"];

export function TecladoCodigo({ valor, largo, onCambio }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex min-h-16 items-center justify-center rounded-2xl border-2 border-marca bg-superficie px-3 text-3xl font-bold tracking-[0.2em] tabular-nums"
        aria-live="polite"
        aria-label={`Código: ${valor || "vacío"}. ${valor.length} de ${largo} números`}
      >
        {valor || <span className="text-xl font-normal tracking-normal text-tenue">Escribe el código</span>}
      </div>
      <p className="text-center text-tenue">
        {valor.length} de {largo} números
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
        {TECLAS.map((t, i) =>
          t === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={t !== "borrar" && valor.length >= largo}
              onClick={() => onCambio(t === "borrar" ? valor.slice(0, -1) : (valor + t).slice(0, largo))}
              aria-label={t === "borrar" ? "Borrar" : t}
              className="h-16 rounded-boton border-2 border-linea bg-superficie text-2xl font-bold text-tinta active:bg-marca-claro disabled:opacity-40"
            >
              {t === "borrar" ? "⌫" : t}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
