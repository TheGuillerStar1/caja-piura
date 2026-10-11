"use client";
// Tutorial del chat de Pía: aparece una sola vez, la primera vez que se abre /ayuda (se guarda en el celular).
// Ilumina las partes reales de la pantalla (marcadas con data-tutorial="...") y explica cada una en 1–2 frases.
// Si un paso no encuentra su parte (p. ej. sin datos aún), se muestra centrado: el tutorial nunca se traba.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { Boton, Mascota } from "@/components/ui";
import { track } from "@/lib/track";

const CLAVE = "cp_tutorial_pia_v1";

type Paso = { objetivo?: string; titulo: string; texto: string };
const PASOS: Paso[] = [
  { titulo: "Te enseño a usar el chat", texto: "Son 5 pasos cortos. Pía te ayuda a pagar y a encontrar lo que buscas." },
  { objetivo: "accesos", titulo: "1. Toca lo que quieres hacer", texto: "Estos botones grandes son lo más pedido. Un toque y Pía te lleva." },
  { objetivo: "preguntas", titulo: "2. O toca una pregunta", texto: "Si no sabes qué escribir, elige una de estas preguntas." },
  { objetivo: "escribir", titulo: "3. También puedes escribir", texto: "Escribe con tus palabras, por ejemplo «¿cuánto debo?», y toca la flecha para enviar." },
  { objetivo: "escuchar", titulo: "4. Escucha los mensajes", texto: "Toca el parlante y Pía te lee el mensaje en voz alta." },
  { objetivo: "seguridad", titulo: "5. Tú siempre confirmas", texto: "Pía prepara el pago, pero tú lo revisas y lo confirmas. Nunca te pide tu clave." },
];

export function tutorialVisto() {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return true; // sin almacenamiento: mejor no insistir en cada visita
  }
}

type Caja = { top: number; left: number; width: number; height: number };

function medir(objetivo?: string): Caja | null {
  if (!objetivo) return null;
  const el = document.querySelector<HTMLElement>(`[data-tutorial="${objetivo}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const m = 6;
  return { top: r.top - m, left: r.left - m, width: r.width + m * 2, height: r.height + m * 2 };
}

export function TutorialPia({ alCerrar }: { alCerrar: () => void }) {
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [altoTarjeta, setAltoTarjeta] = useState(300);
  const tarjeta = useRef<HTMLDivElement>(null);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  const recalcular = useCallback(() => setCaja(medir(paso.objetivo)), [paso.objetivo]);

  useLayoutEffect(() => {
    const el = paso.objetivo ? document.querySelector<HTMLElement>(`[data-tutorial="${paso.objetivo}"]`) : null;
    el?.scrollIntoView({ block: "center" });
    recalcular();
    if (tarjeta.current) setAltoTarjeta(tarjeta.current.offsetHeight);
  }, [paso.objetivo, recalcular]);

  useEffect(() => {
    window.addEventListener("resize", recalcular);
    window.addEventListener("scroll", recalcular, true);
    return () => {
      window.removeEventListener("resize", recalcular);
      window.removeEventListener("scroll", recalcular, true);
    };
  }, [recalcular]);

  useEffect(() => {
    track("tutorial-pia", "ver");
  }, []);

  function cerrar(completo: boolean) {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    track("tutorial-pia", completo ? "completar" : "abandonar");
    alCerrar();
  }

  // La tarjeta va del lado con más espacio: debajo si lo iluminado está arriba, encima si está abajo.
  const alto = typeof window !== "undefined" ? window.innerHeight : 800;
  const abajo = caja ? caja.top + caja.height / 2 < alto / 2 : false;
  // Si no cabe del todo, se pega al borde (puede tapar un poco lo iluminado, pero nunca se corta).
  const posTarjeta: React.CSSProperties = !caja
    ? { top: "50%", transform: "translateY(-50%)" }
    : abajo
      ? { top: Math.max(12, Math.min(caja.top + caja.height + 12, alto - altoTarjeta - 12)) }
      : { bottom: Math.max(12, Math.min(alto - caja.top + 12, alto - altoTarjeta - 12)) };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo">
      <EstilosPago />
      {caja ? (
        // Agujero iluminado: la sombra gigante oscurece todo lo demás.
        <div
          aria-hidden
          className="guia-toca pointer-events-none fixed rounded-2xl transition-all duration-300"
          style={{ ...caja, position: "fixed", boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.7)" }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/70" />
      )}
      {/* Captura los toques fuera de la tarjeta: lo iluminado se mira, no se toca, durante el tutorial. */}
      <div className="fixed inset-0 z-10" />

      <div ref={tarjeta} className="fixed inset-x-0 z-20 mx-auto w-full max-w-app px-4" style={posTarjeta}>
        <div key={i} className="anim-aparece flex flex-col gap-3 rounded-2xl bg-superficie p-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-full bg-white p-1">
              <Mascota tamano={i === 0 ? 52 : 36} />
            </span>
            <h2 id="tutorial-titulo" className="text-xl font-bold leading-tight">
              {paso.titulo}
            </h2>
          </div>
          <p className="text-lg leading-snug" aria-live="polite">
            {paso.texto}
          </p>
          <div className="flex justify-center gap-1.5" aria-label={`Paso ${i + 1} de ${PASOS.length}`}>
            {PASOS.map((_, n) => (
              <span key={n} aria-hidden className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-marca" : "w-2 bg-linea-fuerte"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <Boton variante="secundario" bloque={false} className="flex-1" onClick={() => setI(i - 1)}>
                Atrás
              </Boton>
            )}
            <Boton className="flex-1" bloque={false} onClick={() => (ultimo ? cerrar(true) : setI(i + 1))}>
              {i === 0 ? "Empezar" : ultimo ? "¡Listo, a probar!" : "Siguiente"}
            </Boton>
          </div>
          {!ultimo && (
            <button type="button" onClick={() => cerrar(false)} className="min-h-11 self-center font-bold text-marca underline underline-offset-4">
              Saltar tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
