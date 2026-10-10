"use client";
// Dueño: Agente C. Ayuda con Pía: chat simple. Pía prepara y lleva a la pantalla; nunca paga ni pide la clave.
import type { AccionUI, AsistenteRes, MeRes, Tono } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton, Mascota, Pantalla } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { iniciarFlujo, marcarAyuda, track } from "@/lib/track";
import { hablar } from "@/lib/voz";

type Mensaje = { id: number; de: "pia" | "yo"; texto: string; accion?: AccionUI };

const SALUDOS: Record<Tono, (n: string) => string> = {
  CALIDO: (n) => `Hola, ${n}. Soy Pía y estoy aquí para ayudarte, con calma. ¿Qué quieres hacer?`,
  CORTO: (n) => `Hola, ${n}. ¿Qué necesitas?`,
  DIRECTO: (n) => `Hola, ${n}. ¿En qué te ayudo?`,
};
const EXTRAS = ["¿Cuánto debo?", "Pagar la luz", "¿Se hizo mi pago?", "Me cobraron dos veces"];
/** Si el asistente no responde, estos accesos siempre funcionan. */
const OPCIONES_RESPALDO = [
  { texto: "Pagar mi cuota", ruta: "/pagar/cuota" },
  { texto: "Mis pagos frecuentes", ruta: "/pagar/frecuentes" },
  { texto: "Pagar un recibo", ruta: "/pagar/recibo" },
];

export default function Ayuda() {
  const router = useRouter();
  const [me, setMe] = useState<MeRes | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [llevando, setLlevando] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fin = useRef<HTMLDivElement>(null);
  const sigId = useRef(1);

  const tono: Tono = me?.recomendacion.tono ?? "CALIDO";
  const autoNavegar = tono === "CALIDO" || tono === "CORTO";

  useEffect(() => {
    iniciarFlujo("ASISTENTE");
    track("ayuda", "ver", { flujo: "ASISTENTE" });
    api<MeRes>("/me")
      .then((m) => {
        setMe(m);
        setMensajes([{ id: 0, de: "pia", texto: SALUDOS[m.recomendacion.tono](m.nombre.split(" ")[0]) }]);
      })
      .catch((e) => {
        if (esSinSesion(e)) router.replace("/entrar");
        else setMensajes([{ id: 0, de: "pia", texto: "Hola, soy Pía. ¿En qué te ayudo?" }]);
      });
    return () => clearTimeout(timer.current);
  }, [router]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, pensando, llevando]);

  function ir(ruta: string) {
    clearTimeout(timer.current);
    setLlevando(null);
    track("ayuda", "tocar", { flujo: "ASISTENTE" });
    router.push(ruta);
  }

  async function enviar(t: string) {
    const msg = t.trim().slice(0, 500);
    if (!msg || pensando) return;
    clearTimeout(timer.current);
    setLlevando(null);
    marcarAyuda();
    track("ayuda", "ayuda", { flujo: "ASISTENTE", ayudaUsada: true });
    setTexto("");
    setMensajes((m) => [...m, { id: sigId.current++, de: "yo", texto: msg }]);
    setPensando(true);
    try {
      const r = await api<AsistenteRes>("/asistente", { cuerpo: { mensaje: msg } });
      setMensajes((m) => [...m, { id: sigId.current++, de: "pia", texto: r.respuesta, accion: r.accion }]);
      if (r.accion.tipo === "NAVEGAR" && autoNavegar) {
        const ruta = r.accion.ruta;
        setLlevando(ruta);
        timer.current = setTimeout(() => ir(ruta), 1500);
      }
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      track("ayuda", "error", { flujo: "ASISTENTE" });
      // Nunca un error crudo: Pía ofrece los caminos principales, que funcionan sin asistente.
      const sinConexion = e instanceof ApiFallo && e.codigo === "SIN_CONEXION";
      setMensajes((m) => [
        ...m,
        {
          id: sigId.current++,
          de: "pia",
          texto: sinConexion
            ? "No hay conexión. Revisa tu internet y vuelve a intentar."
            : tono === "DIRECTO"
              ? "No pude responder. Elige una opción:"
              : "Perdona, ahora no pude responderte. ¿Te llevo a alguna de estas?",
          accion: sinConexion ? undefined : { tipo: "OPCIONES", opciones: OPCIONES_RESPALDO },
        },
      ]);
    } finally {
      setPensando(false);
    }
  }

  const sugerencias = [
    ...(me?.recomendacion.sugerencias.filter((s) => s.id !== "AYUDA").map((s) => s.texto) ?? []),
    ...EXTRAS,
  ].filter((s, i, a) => a.indexOf(s) === i);
  const ultimoPia = [...mensajes].reverse().find((m) => m.de === "pia");

  return (
    <Pantalla
      titulo="Pía · tu asistente"
      volver="/inicio"
      pie={
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <div className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              placeholder="Escribe aquí tu pregunta"
              aria-label="Escribe tu pregunta para Pía"
              enterKeyHint="send"
              className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-linea bg-superficie px-4 text-lg focus:border-marca focus:outline-none"
            />
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              aria-label="Enviar"
              className="flex min-h-14 w-16 items-center justify-center rounded-2xl bg-marca text-white disabled:bg-linea"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-sm text-tenue">🔒 Pía nunca te pedirá tu clave.</p>
        </form>
      }
    >
      <div className="flex flex-col gap-3" aria-live="polite">
        {mensajes.map((m) =>
          m.de === "yo" ? (
            <div key={m.id} className="ml-10 self-end rounded-2xl rounded-br-sm bg-marca px-4 py-3 text-lg text-white">
              {m.texto}
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <Mascota tamano={44} mensaje={m.texto} />
              {m.id !== 0 && (
                <button type="button" onClick={() => hablar(m.texto)} className="ml-14 self-start text-marca underline underline-offset-4">
                  Escuchar
                </button>
              )}
              {m.accion?.tipo === "NAVEGAR" && (
                <div className="ml-14 flex flex-col gap-2">
                  <Boton guia={m === ultimoPia} onClick={() => ir((m.accion as { ruta: string }).ruta)}>
                    Ir ahora
                  </Boton>
                  {m === ultimoPia && llevando && (
                    <div className="flex items-center justify-between gap-2 text-tenue">
                      <span>Te llevo…</span>
                      <button
                        type="button"
                        className="text-marca underline underline-offset-4"
                        onClick={() => {
                          clearTimeout(timer.current);
                          setLlevando(null);
                        }}
                      >
                        Quedarme aquí
                      </button>
                    </div>
                  )}
                </div>
              )}
              {m.accion?.tipo === "OPCIONES" && (
                <div className="ml-14 flex flex-col gap-2">
                  {m.accion.opciones.map((o) => (
                    <Boton key={o.ruta + o.texto} variante="secundario" onClick={() => ir(o.ruta)}>
                      {o.texto}
                    </Boton>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {pensando && <Mascota tamano={44} animada mensaje={<span className="text-tenue">Pía está pensando…</span>} />}
        <div ref={fin} />
      </div>

      {sugerencias.length > 0 && !pensando && (
        <div className="flex flex-wrap gap-2" aria-label="Sugerencias">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="rounded-full border-2 border-marca bg-superficie px-4 py-2 text-lg text-marca active:bg-marca-claro"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </Pantalla>
  );
}
