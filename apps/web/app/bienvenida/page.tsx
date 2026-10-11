"use client";
// Dueño: Agente A. Bienvenida y elección de vista (fase 3), solo en el primer ingreso. El motor recomienda según el uso
// (nunca por edad ni zona); el cliente decide entre las dos vistas.
// Interactiva: un interruptor Asistida | Estándar y una vista previa en vivo que cambia al tocar (además, toda la pantalla
// crece o se achica porque setVista cambia <html data-vista>). Poco texto: el "por qué" va plegado.
import type { MeRes, Vista } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CelularPrevia } from "@/components/app/CelularPrevia";
import { Boton, Cargando, Mascota, MensajeError, Pantalla } from "@/components/ui";
import { api, esSinSesion } from "@/lib/api";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { hablar } from "@/lib/voz";

const P = "bienvenida";

const CHIPS: Record<Vista, { icono: string; texto: string }[]> = {
  ASISTIDA: [
    { icono: "🔠", texto: "Letra grande" },
    { icono: "🔊", texto: "Te leemos los montos" },
    { icono: "👆", texto: "Te guiamos paso a paso" },
  ],
  ESTANDAR: [
    { icono: "📋", texto: "Todo a la vista" },
    { icono: "⚡", texto: "Menos pasos" },
    { icono: "🔤", texto: "Letra normal" },
  ],
};

export default function Bienvenida() {
  const router = useRouter();
  const { setVista } = useVista();
  const [me, setMe] = useState<MeRes | null>(null);
  const [previa, setPrevia] = useState<Vista>("ASISTIDA");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setError("");
    api<MeRes>("/me")
      .then((m) => {
        setMe(m);
        setPrevia(m.recomendacion.vista);
        setVista(m.recomendacion.vista);
      })
      .catch((e) => (esSinSesion(e) ? router.replace("/entrar") : setError(e.message)));
  }, [router, setVista]);

  useEffect(() => {
    track(P, "ver");
    cargar();
  }, [cargar]);

  function previsualizar(v: Vista) {
    if (v === previa) return;
    track(P, "tocar");
    setPrevia(v);
    setVista(v);
  }

  async function elegir(v: Vista) {
    track(P, "tocar");
    setGuardando(true);
    try {
      await api("/me/vista", { metodo: "PUT", cuerpo: { vista: v } });
      setVista(v);
      track(P, "completar");
      router.replace("/inicio");
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      track(P, "error");
      setError(e instanceof Error ? e.message : "No pudimos guardar tu elección. Vuelve a intentar.");
      setGuardando(false);
    }
  }

  if (!me) {
    return <Pantalla titulo="Elige cómo ver tu app">{error ? <MensajeError mensaje={error} reintentar={cargar} /> : <Cargando />}</Pantalla>;
  }

  const rec = me.recomendacion.vista;
  const nombre = me.nombre.split(" ")[0];
  // Microcopy del manual visual («Bienvenida inicial»).
  const saludo = `Hola, ${nombre}. Ahora puedes elegir cómo usar Caja Piura: Vista estándar o Vista asistida.`;

  return (
    <Pantalla
      titulo="Elige cómo ver tu app"
      pie={
        <div className="flex flex-col gap-1">
          <Boton guia disabled={guardando} onClick={() => elegir(previa)}>
            {guardando ? "Guardando…" : previa === "ASISTIDA" ? "Usar la vista asistida" : "Usar la vista estándar"}
          </Boton>
          <p className="text-center text-sm text-tenue">Puedes cambiarla cuando quieras en Ajustes.</p>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-full bg-white p-0.5">
          <Mascota tamano={44} animada />
        </span>
        <p className="flex-1 text-lg font-bold leading-snug">{saludo}</p>
        <button
          type="button"
          onClick={() => hablar(`${saludo} Te recomendamos la vista ${rec === "ASISTIDA" ? "asistida" : "estándar"}.`)}
          aria-label="Escuchar"
          className="flex w-12 shrink-0 items-center justify-center rounded-full text-2xl text-marca active:bg-marca-claro"
        >
          🔊
        </button>
      </div>

      {error && <MensajeError mensaje={error} />}

      {/* Interruptor: el fondo azul se desliza hacia la opción elegida. */}
      <div role="radiogroup" aria-label="Cómo ver la app" className="relative grid grid-cols-2 rounded-2xl border-2 border-linea bg-superficie p-1">
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-marca transition-transform duration-300 ease-out ${previa === "ESTANDAR" ? "translate-x-full" : ""}`}
        />
        {(["ASISTIDA", "ESTANDAR"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={previa === v}
            onClick={() => previsualizar(v)}
            className={`relative z-10 flex min-h-16 flex-col items-center justify-center rounded-xl px-2 font-bold transition-colors ${previa === v ? "text-white" : "text-tinta"}`}
          >
            <span className="text-lg">{v === "ASISTIDA" ? "Asistida" : "Estándar"}</span>
            {v === rec && (
              <span className={`text-xs font-bold ${previa === v ? "text-white/90" : "text-exito"}`}>★ Recomendada</span>
            )}
          </button>
        ))}
      </div>

      <CelularPrevia vista={previa} />

      <ul key={previa} className="anim-previa grid grid-cols-3 gap-2" aria-live="polite">
        {CHIPS[previa].map((c) => (
          <li key={c.texto} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-linea bg-superficie px-1.5 py-2 text-center text-sm font-bold leading-tight">
            <span aria-hidden className="text-xl leading-none">
              {c.icono}
            </span>
            {c.texto}
          </li>
        ))}
      </ul>

      <details className="group rounded-2xl border border-linea bg-superficie px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-marca">
          ¿Por qué te recomendamos la {rec === "ASISTIDA" ? "asistida" : "estándar"}?
          <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <ul className="flex flex-col gap-1 pb-3">
          {me.recomendacion.razones.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="text-exito">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </details>
    </Pantalla>
  );
}
