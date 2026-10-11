"use client";
// Guía paso a paso de Pía («Guíame»). Lee el paso actual (lib/guiaPasos.ts), oscurece la pantalla y resalta el elemento
// real con data-paso="…" de la app de siempre. Cuando el cliente lo toca (o elige una opción), pasa al siguiente.
import { CircleCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Foco } from "@/components/ui/Foco";
import { GUIAS, irAPaso, leerGuia, terminarGuia } from "@/lib/guiaPasos";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";

export function GuiaPasos() {
  const ruta = usePathname();
  // Asistida: pantalla oscura y solo resalta el paso. Estándar: la misma guía, sin oscurecer.
  const { asistida } = useVista();
  // Se lee después de cargar (el servidor no ve sessionStorage): evita el error de hidratación.
  const [g, setG] = useState<ReturnType<typeof leerGuia>>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const f = () => setG(leerGuia());
    f();
    addEventListener("cp-guia", f);
    return () => removeEventListener("cp-guia", f);
  }, [ruta]);

  const pasos = g ? GUIAS[g.id] : [];
  // Si el cliente ya avanzó por su cuenta a una pantalla posterior, la guía lo alcanza.
  let i = g?.paso ?? 0;
  if (g && pasos[i]?.ruta !== ruta) {
    const j = pasos.findIndex((p, k) => k >= i && p.ruta === ruta);
    if (j >= 0) i = j;
  }
  const paso = g ? pasos[i] : undefined;
  const enPantalla = Boolean(paso && paso.ruta === ruta);

  // Si el cliente se va a otra parte de la app (fuera de los pasos), la guía se cierra sola: nada de avisos «en pausa».
  // Se espera un momento porque, al tocar un paso, la guía avanza antes de que cambie la pantalla.
  // Al empezar desde el chat la primera pantalla todavía está cargando: si la guía aún no se mostró, se espera más.
  const mostrada = useRef(false);
  useEffect(() => {
    if (!g) mostrada.current = false;
    else if (enPantalla) mostrada.current = true;
  }, [g, enPantalla]);
  useEffect(() => {
    if (!g || !paso || enPantalla) return;
    const t = setTimeout(terminarGuia, mostrada.current ? 1500 : 5000);
    return () => clearTimeout(t);
  }, [g, paso, enPantalla]);

  useEffect(() => {
    if (!g || !paso || !enPantalla) return;
    let el: Element | null = null;
    const avanzar = () => {
      track("guia-pia", "tocar");
      if (i + 1 >= pasos.length) {
        terminarGuia();
        setListo(true);
        setTimeout(() => setListo(false), 3500);
      } else irAPaso(g.id, i + 1);
    };
    const evento = paso.evento ?? "click";
    const enganchar = () => {
      const nuevo = document.querySelector(`[data-paso="${paso.sel}"]`);
      if (nuevo === el) return;
      el?.removeEventListener(evento, avanzar);
      el = nuevo;
      el?.addEventListener(evento, avanzar);
    };
    enganchar();
    const t = setInterval(enganchar, 300);
    return () => {
      clearInterval(t);
      el?.removeEventListener(evento, avanzar);
    };
  }, [g, paso, enPantalla, i, pasos.length]);

  if (listo) {
    return (
      <div role="status" className="fixed inset-x-0 top-20 z-[72] mx-auto w-[min(92vw,26rem)] rounded-2xl bg-exito p-4 text-center text-lg font-bold text-white shadow-2xl">
        <CircleCheck className="mr-1 inline h-6 w-6 -translate-y-0.5" aria-hidden /> ¡Listo! Ya sabes hacerlo en la app.
      </div>
    );
  }
  if (!g || !paso) return null;
  if (!enPantalla) return null;
  return (
    <Foco
      selector={`[data-paso="${paso.sel}"]`}
      paso={`Pía te guía · Paso ${i + 1} de ${pasos.length}`}
      mensaje={paso.texto}
      textoSalir="Salir de la guía"
      alSalir={terminarGuia}
      suave={!asistida}
    />
  );
}
