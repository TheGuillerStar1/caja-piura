// F0. Estados de carga y error reutilizables.
import { Boton } from "./Boton";

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10 text-tenue">
      <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-marca-claro border-t-marca" />
      <span className="text-lg">{texto}</span>
    </div>
  );
}

export function MensajeError({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-error/40 bg-error-claro p-4">
      <p className="text-lg text-error">{mensaje}</p>
      {reintentar && (
        <Boton variante="secundario" onClick={reintentar}>
          Intentar de nuevo
        </Boton>
      )}
    </div>
  );
}
