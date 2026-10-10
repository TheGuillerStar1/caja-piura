// Dueño: Agente A. Teclado numérico grande en pantalla (para la clave: no abre el teclado del celular).
type Props = { onDigito: (d: string) => void; onBorrar: () => void; deshabilitado?: boolean };

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "borrar"];

export function Teclado({ onDigito, onBorrar, deshabilitado }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
      {TECLAS.map((t, i) =>
        t === "" ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            disabled={deshabilitado}
            onClick={() => (t === "borrar" ? onBorrar() : onDigito(t))}
            aria-label={t === "borrar" ? "Borrar" : t}
            className="h-16 rounded-boton border-2 border-linea bg-superficie text-2xl font-bold text-tinta active:bg-marca-claro disabled:opacity-50"
          >
            {t === "borrar" ? "⌫" : t}
          </button>
        ),
      )}
    </div>
  );
}

/** Puntos que muestran cuántos dígitos se escribieron, sin mostrarlos. */
export function PuntosClave({ largo, total = 6, error }: { largo: number; total?: number; error?: boolean }) {
  return (
    <div className="flex justify-center gap-3" aria-label={`${largo} de ${total} números escritos`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-5 w-5 rounded-full border-2 ${error ? "border-error" : "border-marca"} ${i < largo ? (error ? "bg-error" : "bg-marca") : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
