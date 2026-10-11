"use client";
// Foco: la pantalla se oscurece y queda resaltado (y tocable) solo el elemento que hay que tocar.
// Se usa en la vista asistida (resalta «¿Necesitas ayuda?») y en la guía paso a paso de Pía («Guíame»).
// Las 4 franjas oscuras bloquean el resto de la pantalla; el hueco deja tocar el elemento real.
import { useEffect, useState } from "react";

type Rect = { top: number; left: number; width: number; height: number; radio: number };
type Props = {
  selector: string;
  mensaje: React.ReactNode;
  /** "Paso 2 de 5" */
  paso?: string;
  /** Botón para salir: siempre con texto (Manual visual: nada de íconos sin etiqueta). */
  textoSalir?: string;
  alSalir: () => void;
};

const MARGEN = 6;

export function Foco({ selector, mensaje, paso, textoSalir = "Cerrar", alSalir }: Props) {
  const [r, setR] = useState<Rect | null>(null);

  useEffect(() => {
    let vivo = true;
    let desplazado = false;
    const medir = () => {
      if (!vivo) return;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return setR(null);
      if (!desplazado) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        desplazado = true;
      }
      const b = el.getBoundingClientRect();
      if (!b.width) return setR(null);
      // El hueco copia la forma del elemento (p. ej. el botón redondo de Pía): sin esquinas que asomen.
      const radio = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.height / 2) + MARGEN;
      setR({ top: b.top - MARGEN, left: b.left - MARGEN, width: b.width + MARGEN * 2, height: b.height + MARGEN * 2, radio });
    };
    medir();
    // El contenido carga después y la página se mueve: se vuelve a medir.
    const t = setInterval(medir, 300);
    addEventListener("resize", medir);
    addEventListener("scroll", medir, true);
    return () => {
      vivo = false;
      clearInterval(t);
      removeEventListener("resize", medir);
      removeEventListener("scroll", medir, true);
    };
  }, [selector]);

  if (!r) return null;
  const abajo = r.top + r.height / 2 < window.innerHeight / 2; // el globo va del lado con más espacio
  // Las franjas solo bloquean los toques fuera del hueco; el oscurecido lo pone la sombra del hueco (respeta las curvas).
  const franja = "fixed z-[70]";
  return (
    <div aria-live="polite">
      <div className={franja} style={{ top: 0, left: 0, right: 0, height: Math.max(0, r.top) }} />
      <div className={franja} style={{ top: r.top + r.height, left: 0, right: 0, bottom: 0 }} />
      <div className={franja} style={{ top: r.top, left: 0, width: Math.max(0, r.left), height: r.height }} />
      <div className={franja} style={{ top: r.top, left: r.left + r.width, right: 0, height: r.height }} />
      <div
        aria-hidden
        className="pointer-events-none fixed z-[71]"
        style={{ top: r.top, left: r.left, width: r.width, height: r.height, borderRadius: r.radio, boxShadow: "inset 0 0 0 4px var(--color-acento), 0 0 0 200vmax rgb(0 0 0 / 0.65)" }}
      />
      <div
        role="dialog"
        aria-label="Guía de Pía"
        className="fixed inset-x-0 z-[72] mx-auto flex w-[min(92vw,26rem)] flex-col gap-3 rounded-2xl bg-superficie p-4 text-tinta shadow-2xl"
        style={abajo ? { top: r.top + r.height + 14 } : { bottom: window.innerHeight - r.top + 14 }}
      >
        {paso && <p className="text-sm font-bold uppercase tracking-wide text-tenue">{paso}</p>}
        <p className="text-lg font-bold leading-snug">{mensaje}</p>
        <button
          type="button"
          onClick={alSalir}
          className="flex min-h-12 items-center justify-center gap-2 self-start rounded-xl border-2 border-linea-fuerte px-4 text-base font-bold"
        >
          <span aria-hidden className="text-xl leading-none">
            ✕
          </span>
          {textoSalir}
        </button>
      </div>
    </div>
  );
}
