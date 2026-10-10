"use client";
// Dueño: Agente C. Ayuda con Pía: chat simple. Pía prepara y lleva a la pantalla; nunca paga ni pide la clave.
// Al abrir: saludo corto + 3 accesos grandes con ícono + preguntas rápidas. Cada botón dice lo que hace ("Revisar y pagar"),
// nunca "Ir ahora". Pía a la izquierda, tú a la derecha.
import type { AccionUI, AsistenteRes, MeRes, Sugerencia, Tono } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconoCuota, IconoFrecuente, IconoProgreso, IconoRecibo, IconoSaldo } from "@/components/pago/Iconos";
import { Boton, Mascota, Pantalla } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { iniciarFlujo, marcarAyuda, track } from "@/lib/track";
import { hablar } from "@/lib/voz";

type Mensaje = { id: number; de: "pia" | "yo"; texto: string; accion?: AccionUI };

const SALUDOS: Record<Tono, (n: string) => string> = {
  CALIDO: (n) => `Hola, ${n}. ¿Qué quieres hacer?`,
  CORTO: (n) => `Hola, ${n}. ¿Qué necesitas?`,
  DIRECTO: (n) => `Hola, ${n}. ¿Qué necesitas?`,
};

type Acceso = { texto: string; Icono: (p: { className?: string }) => React.ReactNode };
const ACCESOS: Partial<Record<Sugerencia["id"], Acceso>> = {
  PAGAR_CUOTA: { texto: "Pagar mi cuota", Icono: IconoCuota },
  PAGAR_RECIBO: { texto: "Pagar un recibo con foto", Icono: IconoRecibo },
  FRECUENTES: { texto: "Mis pagos de siempre", Icono: IconoFrecuente },
  VER_SALDO: { texto: "Ver mi saldo", Icono: IconoSaldo },
  PROGRESO: { texto: "Mis puntos", Icono: IconoProgreso },
};
const ACCESOS_BASE: Sugerencia["id"][] = ["PAGAR_CUOTA", "PAGAR_RECIBO", "FRECUENTES"];
const PREGUNTAS = ["¿Cuánto debo?", "¿Se hizo mi pago?", "Me cobraron dos veces"];

/** Si el asistente no responde, estos accesos siempre funcionan. */
const OPCIONES_RESPALDO = [
  { texto: "Pagar mi cuota", ruta: "/pagar/cuota" },
  { texto: "Mis pagos frecuentes", ruta: "/pagar/frecuentes" },
  { texto: "Pagar un recibo", ruta: "/pagar/recibo" },
];

/** El botón dice lo que va a pasar. */
function textoBoton(ruta: string) {
  if (ruta.startsWith("/pagar/confirmar")) return "Revisar y pagar";
  if (ruta.startsWith("/pagar/recibo")) return "Tomar foto del recibo";
  if (ruta.startsWith("/pagar/cuota")) return "Ver mi cuota";
  if (ruta.startsWith("/pagar/frecuentes")) return "Ver mis pagos de siempre";
  if (ruta.startsWith("/progreso")) return "Ver mis puntos";
  if (ruta.startsWith("/ajustes")) return "Abrir Ajustes";
  if (ruta.startsWith("/inicio")) return "Ir al inicio";
  return "Abrir";
}

function IcParlante({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function Burbuja({ texto, escuchar }: { texto: React.ReactNode; escuchar?: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 shrink-0 rounded-full bg-white p-0.5">
        <Mascota tamano={30} />
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2 rounded-2xl rounded-tl-sm border border-linea bg-superficie py-3 pl-4 pr-2 text-lg leading-snug">
        <p className="flex-1 whitespace-pre-line">{texto}</p>
        {escuchar && (
          <button
            type="button"
            onClick={escuchar}
            aria-label="Escuchar este mensaje"
            className="-my-2 flex min-h-11! w-11 shrink-0 items-center justify-center rounded-full text-marca active:bg-marca-claro"
          >
            <IcParlante />
          </button>
        )}
      </div>
    </div>
  );
}

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
        else setMensajes([{ id: 0, de: "pia", texto: "Hola, soy Pía. ¿Qué necesitas?" }]);
      });
    return () => clearTimeout(timer.current);
  }, [router]);

  useEffect(() => {
    if (mensajes.length > 1 || pensando) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
        timer.current = setTimeout(() => ir(ruta), 2500);
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
          texto: sinConexion ? "No hay internet. Revisa tu conexión y vuelve a intentar." : "No pude responder. Elige una opción:",
          accion: sinConexion ? undefined : { tipo: "OPCIONES", opciones: OPCIONES_RESPALDO },
        },
      ]);
    } finally {
      setPensando(false);
    }
  }

  const inicio = mensajes.length <= 1;
  const sugeridos = (me?.recomendacion.sugerencias ?? []).map((s) => s.id).filter((id) => ACCESOS[id]);
  const accesos = [...new Set([...sugeridos, ...ACCESOS_BASE])].slice(0, 3);
  const ultimoPia = [...mensajes].reverse().find((m) => m.de === "pia");
  const chips = [...accesos.map((id) => ACCESOS[id]!.texto), ...PREGUNTAS];

  return (
    <Pantalla
      titulo="Pía · Ayuda"
      subtitulo="Asistente virtual de Caja Piura · no es una persona"
      volver="/inicio"
      pie={
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          {!inicio && !pensando && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Atajos">
              {chips.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="min-h-10! shrink-0 rounded-full border border-marca bg-superficie px-3 text-base whitespace-nowrap text-marca active:bg-marca-claro"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              placeholder="Escribe tu pregunta"
              aria-label="Escribe tu pregunta para Pía"
              enterKeyHint="send"
              className="min-h-14 min-w-0 flex-1 rounded-full border-2 border-linea bg-superficie px-5 text-lg focus:border-marca focus:outline-none"
            />
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              aria-label="Enviar"
              className="flex min-h-14 w-14 shrink-0 items-center justify-center rounded-full bg-marca text-white disabled:bg-linea disabled:text-tenue"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-sm text-tenue">🔒 Pía nunca te pide tu clave.</p>
        </form>
      }
    >
      <div className="flex flex-col gap-4" aria-live="polite">
        {mensajes.map((m) =>
          m.de === "yo" ? (
            <p key={m.id} className="ml-12 self-end rounded-2xl rounded-tr-sm bg-marca px-4 py-3 text-lg text-white">
              {m.texto}
            </p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <Burbuja texto={m.texto} escuchar={() => hablar(m.texto)} />
              {m.accion?.tipo === "NAVEGAR" && (
                <div className="ml-10 flex flex-col gap-2">
                  <Boton guia={m === ultimoPia} onClick={() => ir((m.accion as { ruta: string }).ruta)}>
                    {textoBoton(m.accion.ruta)}
                  </Boton>
                  {m === ultimoPia && llevando && (
                    <p className="flex items-center justify-between gap-2 text-tenue">
                      <span>Te llevo en 2 segundos…</span>
                      <button
                        type="button"
                        className="font-bold text-marca underline underline-offset-4"
                        onClick={() => {
                          clearTimeout(timer.current);
                          setLlevando(null);
                        }}
                      >
                        Quedarme aquí
                      </button>
                    </p>
                  )}
                </div>
              )}
              {m.accion?.tipo === "OPCIONES" && (
                <div className="ml-10 flex flex-col gap-2">
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

        {inicio && me && (
          <>
            <section aria-label="Lo más pedido" className="ml-10 flex flex-col gap-2">
              {accesos.map((id, i) => {
                const a = ACCESOS[id]!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => enviar(a.texto)}
                    className={`${i === 0 ? "guia-toca " : ""}flex min-h-16 items-center gap-3 rounded-xl border border-linea-fuerte bg-superficie px-3 text-left active:bg-superficie-2`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-marca text-white">
                      <a.Icono className="h-6 w-6" />
                    </span>
                    <span className="flex-1 text-lg font-bold">{a.texto}</span>
                  </button>
                );
              })}
            </section>
            <section aria-labelledby="preguntas" className="ml-10 flex flex-col gap-2">
              <h2 id="preguntas" className="text-sm font-bold tracking-wide text-tenue uppercase">
                Preguntas rápidas
              </h2>
              <div className="flex flex-wrap gap-2">
                {PREGUNTAS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => enviar(p)}
                    className="min-h-11! rounded-full border border-marca bg-superficie px-4 text-base text-marca active:bg-marca-claro"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {pensando && (
          <Burbuja
            texto={
              <span className="flex h-7 items-center gap-1.5" role="status">
                <span className="sr-only">Pía está respondiendo</span>
                {[0, 1, 2].map((i) => (
                  <span key={i} aria-hidden className="h-2.5 w-2.5 rounded-full bg-tenue anim-punto" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            }
          />
        )}
        <div ref={fin} />
      </div>
    </Pantalla>
  );
}
