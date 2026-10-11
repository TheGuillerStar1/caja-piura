"use client";
// Dueño: Agente C. Ayuda con Pía: chat simple. Pía prepara y lleva a la pantalla; nunca paga ni pide la clave.
// Al abrir: saludo corto + 3 accesos grandes con ícono + preguntas rápidas. Cada botón dice lo que hace ("Revisar y pagar"),
// nunca "Ir ahora". Pía a la izquierda, tú a la derecha.
import { ChevronRight, Mic, SendHorizontal, Volume2 } from "lucide-react";
import { Lock, MessageCircle } from "lucide-react";
import type { AccionUI, AsistenteRes, MeRes, ReciboRes, Sugerencia, TipoPago, Tono } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconoCuota, IconoFrecuente, IconoProgreso, IconoRecibo, IconoSaldo } from "@/components/pago/Iconos";
import { ReciboEnChat } from "@/components/ia/ReciboEnChat";
import { guardarResultado, type ResultadoPago } from "@/components/pago/almacen";
import { BotonConstanciaWhatsApp } from "@/components/pago/ConstanciaWhatsApp";
import { PagoEnChat } from "@/components/pago/PagoEnChat";
import { Boton, Mascota, Pantalla } from "@/components/ui";
import { fechaCorta, soles } from "@/lib/formato";
import { useVista } from "@/lib/vista";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { iniciarFlujo, marcarAyuda, track } from "@/lib/track";
import { empezarGuia, type IdGuia } from "@/lib/guiaPasos";
import { hablar } from "@/lib/voz";

/** Además de lo que responde la API, el chat tiene acciones propias: el recibo con foto y el pago se hacen aquí mismo. */
type AccionChat =
  | AccionUI
  | { tipo: "RECIBO_FOTO" }
  | { tipo: "PAGO_CHAT"; pago: TipoPago; ref: number }
  | { tipo: "CONSTANCIA"; resultado: ResultadoPago };
type Mensaje = { id: number; de: "pia" | "yo"; texto: string; accion?: AccionChat };

/** El tono sigue a la vista elegida (si ya eligió); si no, al que recomienda el motor. */
const tonoDe = (m: MeRes): Tono => (m.vistaPreferida ? (m.vistaPreferida === "ASISTIDA" ? "CALIDO" : "DIRECTO") : m.recomendacion.tono);

/** "/pagar/confirmar?tipo=CUOTA&ref=12" → { pago: "CUOTA", ref: 12 } */
function pagoDe(ruta: string): { pago: TipoPago; ref: number } | null {
  if (!ruta.startsWith("/pagar/confirmar")) return null;
  const q = new URLSearchParams(ruta.split("?")[1] ?? "");
  const pago = q.get("tipo") as TipoPago | null;
  const ref = Number(q.get("ref"));
  return pago && ref ? { pago, ref } : null;
}

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
  if (ruta.startsWith("/pagar/confirmar")) return "Sí, prepáralo tú";
  if (ruta.startsWith("/pagar/recibo")) return "Tomar foto del recibo";
  if (ruta.startsWith("/pagar/cuota")) return "Ver mi cuota";
  if (ruta.startsWith("/pagar/frecuentes")) return "Ver mis pagos de siempre";
  if (ruta.startsWith("/progreso")) return "Ver mis puntos";
  if (ruta.startsWith("/ajustes")) return "Abrir Ajustes";
  if (ruta.startsWith("/inicio")) return "Ir al inicio";
  return "Abrir";
}

/** Qué guía paso a paso corresponde a cada pago (lib/guiaPasos.ts). */
function guiaDe(ruta: string): IdGuia | null {
  if (ruta.includes("tipo=CUOTA") || ruta.startsWith("/pagar/cuota")) return "CUOTA";
  if (ruta.includes("tipo=FRECUENTE") || ruta.startsWith("/pagar/frecuentes")) return "FRECUENTE";
  if (ruta.includes("tipo=RECIBO") || ruta.startsWith("/pagar/recibo")) return "RECIBO";
  return null;
}

function IcParlante({ className = "h-5 w-5" }: { className?: string }) {
  return <Volume2 className={className} aria-hidden />;
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
            className="-my-2 flex min-h-11! shrink-0 flex-col items-center justify-center rounded-lg px-1.5 text-marca active:bg-marca-claro"
          >
            <IcParlante />
            <span className="text-[0.7rem] font-bold leading-none">Escuchar</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Ayuda() {
  const router = useRouter();
  const { asistida } = useVista();
  const decirPia = (texto: string, accion?: AccionChat) => setMensajes((m) => [...m, { id: sigId.current++, de: "pia", texto, accion }]);
  const [me, setMe] = useState<MeRes | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const sigId = useRef(1);

  const [hayVoz, setHayVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocedor = useRef<{ stop: () => void } | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const [dictado, setDictado] = useState(false);
  // La caja crece con el texto (hasta ~5 líneas; después hace scroll) y baja al final mientras dictas.
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 4}px`;
    el.scrollTop = el.scrollHeight;
  }, [texto]);

  const tono: Tono = me ? tonoDe(me) : "CALIDO";

  useEffect(() => {
    iniciarFlujo("ASISTENTE");
    track("ayuda", "ver", { flujo: "ASISTENTE" });
    api<MeRes>("/me")
      .then((m) => {
        setMe(m);
        setMensajes([{ id: 0, de: "pia", texto: SALUDOS[tonoDe(m)](m.nombre.split(" ")[0]) }]);
      })
      .catch((e) => {
        if (esSinSesion(e)) router.replace("/entrar");
        else setMensajes([{ id: 0, de: "pia", texto: "Hola, soy Pía. ¿Qué necesitas?" }]);
      });
  }, [router]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setHayVoz(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => reconocedor.current?.stop();
  }, []);

  useEffect(() => {
    if (mensajes.length > 1 || pensando) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, pensando]);

  /** «Guíame»: en vez de pagar desde el chat, Pía lleva al inicio y señala cada paso en la app de siempre. */
  function guiarme(id: IdGuia) {
    track("ayuda", "tocar", { flujo: "ASISTENTE" });
    empezarGuia(id);
    router.push("/inicio");
  }

  function ir(ruta: string) {
    track("ayuda", "tocar", { flujo: "ASISTENTE" });
    router.push(ruta);
  }

  async function enviar(t: string) {
    const msg = t.trim().slice(0, 500);
    if (!msg || pensando) return;
    marcarAyuda();
    track("ayuda", "ayuda", { flujo: "ASISTENTE", ayudaUsada: true });
    setTexto("");
    setDictado(false);
    setMensajes((m) => [...m, { id: sigId.current++, de: "yo", texto: msg }]);
    setPensando(true);
    try {
      const r = await api<AsistenteRes>("/asistente", { cuerpo: { mensaje: msg } });
      const accion: AccionChat = r.accion.tipo === "NAVEGAR" && r.accion.ruta.startsWith("/pagar/recibo") ? { tipo: "RECIBO_FOTO" } : r.accion;
      setMensajes((m) => [...m, { id: sigId.current++, de: "pia", texto: r.respuesta, accion }]);
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

  // Dictado: lo que dices se va escribiendo en la caja de texto; no se envía solo. Al parar, lo revisas (puedes
  // corregirlo) y tocas «Enviar».
  function hablarAPia() {
    if (escuchando) return reconocedor.current?.stop();
    type Resultados = { length: number; [i: number]: { [j: number]: { transcript: string } } };
    const w = window as unknown as Record<string, new () => {
      lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; start: () => void; stop: () => void;
      onresult: (e: { results: Resultados }) => void; onend: () => void; onerror: () => void;
    }>;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "es-PE";
    r.interimResults = true;
    // En Android el modo continuo repite lo ya dicho: ahí se dicta por tramos (cada toque agrega al texto).
    r.continuous = !/android/i.test(navigator.userAgent);
    r.maxAlternatives = 1;
    const antes = texto.trim() ? `${texto.trim()} ` : "";
    r.onresult = (e) => {
      const partes: string[] = [];
      for (let i = 0; i < e.results.length; i++) partes.push((e.results[i]?.[0]?.transcript ?? "").trim());
      const dicho = partes.filter(Boolean).join(" ");
      setTexto((antes + dicho.charAt(0).toUpperCase() + dicho.slice(1)).slice(0, 500));
    };
    r.onend = () => {
      setEscuchando(false);
      setDictado(true);
      campo.current?.focus();
    };
    r.onerror = () => setEscuchando(false);
    reconocedor.current = r;
    track("ayuda", "tocar", { flujo: "ASISTENTE" });
    setDictado(false);
    setEscuchando(true);
    r.start();
  }

  const inicio = mensajes.length <= 1;
  const sugeridos = (me?.recomendacion.sugerencias ?? []).map((s) => s.id).filter((id) => ACCESOS[id]);
  const accesos = [...new Set([...sugeridos, ...ACCESOS_BASE])].slice(0, 3);
  const ultimoPia = [...mensajes].reverse().find((m) => m.de === "pia");
  const chips = [...accesos.map((id) => ACCESOS[id]!.texto), ...PREGUNTAS];

  return (
    <Pantalla
      titulo={
        <span className="flex items-center gap-2.5">
          <span className="shrink-0 rounded-full bg-white p-0.5">
            <Mascota tamano={30} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold">Pía</span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-white/85">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--cp-success)] ring-2 ring-white" />
              En línea · asistente virtual
            </span>
          </span>
        </span>
      }
      volver="/inicio"
      omitirAyuda
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
          <div className="flex items-end gap-2">
            {/* Varias líneas: lo que dictas o escribes baja como párrafo en vez de cortarse. Enter envía; Shift+Enter, nueva línea. */}
            <textarea
              ref={campo}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              placeholder={escuchando ? "Te escucho… habla ahora" : hayVoz ? "Escribe o toca el micrófono" : "Escribe tu pregunta"}
              aria-label="Escribe tu pregunta para Pía"
              enterKeyHint="send"
              className="max-h-40 min-h-14 min-w-0 flex-1 resize-none overflow-y-auto rounded-3xl border-2 border-linea bg-superficie px-5 py-3 text-lg leading-snug focus:border-marca focus:outline-none"
            />
            {escuchando || (!texto.trim() && hayVoz) ? (
              <button
                type="button"
                onClick={hablarAPia}
                disabled={pensando}
                aria-label={escuchando ? "Dejar de escuchar" : "Hablarle a Pía"}
                aria-pressed={escuchando}
                className={`relative flex min-h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-white disabled:bg-linea ${escuchando ? "bg-error guia-toca" : "bg-marca"}`}
              >
                <Mic className="h-[22px] w-[22px]" aria-hidden />
                <span className="text-[0.7rem] font-bold leading-none">{escuchando ? "Parar" : "Hablar"}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!texto.trim() || pensando}
                aria-label="Enviar"
                className="flex min-h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-marca text-white disabled:bg-linea disabled:text-tenue"
              >
                <SendHorizontal className="h-[22px] w-[22px]" aria-hidden />
                <span className="text-[0.7rem] font-bold leading-none">Enviar</span>
              </button>
            )}
          </div>
          {escuchando ? (
            <p role="status" className="text-center text-sm font-bold text-marca">Te escucho: lo que digas aparece arriba. Toca «Parar» cuando termines.</p>
          ) : dictado && texto.trim() ? (
            <p role="status" className="text-center text-sm font-bold text-marca">Revisa el texto (puedes corregirlo) y toca «Enviar».</p>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-sm text-tenue"><Lock className="h-4 w-4" aria-hidden /> Pía nunca te pide tu clave.</p>
          )}
        </form>
      }
    >
      <div className="flex flex-col gap-4" aria-live="polite">
        {inicio && me ? (
          <section className="flex flex-col items-center gap-2 pt-2 text-center">
            <span className="rounded-full bg-white p-1 shadow-lg">
              <Mascota tamano={72} animada />
            </span>
            <p className="text-2xl font-bold">Hola, {me.nombre.split(" ")[0]}</p>
            <p className="flex items-center gap-1 text-lg text-tenue">
              ¿En qué te ayudo?
              <button
                type="button"
                onClick={() => hablar(mensajes[0]?.texto ?? "")}
                className="flex min-h-10! items-center gap-1 rounded-full px-2 text-base font-bold text-marca active:bg-marca-claro"
              >
                <IcParlante />
                Escuchar
              </button>
            </p>
          </section>
        ) : (
          mensajes.map((m) =>
          m.de === "yo" ? (
            <p key={m.id} className="ml-12 self-end rounded-2xl rounded-tr-sm bg-marca px-4 py-3 text-lg text-white">
              {m.texto}
            </p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <Burbuja texto={m.texto} escuchar={() => hablar(m.texto)} />
              {m.accion?.tipo === "RECIBO_FOTO" && (
                <>
                  <ReciboEnChat
                    alLeer={(r: ReciboRes) =>
                      decirPia(
                        `Leí tu recibo de ${r.empresa}: ${r.titularOculto}, ${soles(r.monto)}, vence el ${fechaCorta(r.vencimiento)}. El monto lo da la empresa, no la foto.`,
                        { tipo: "NAVEGAR", ruta: `/pagar/confirmar?tipo=RECIBO&ref=${r.id}` },
                      )
                    }
                    alSinDeuda={() => decirPia("Ese recibo no tiene deuda pendiente. ¿Quieres probar con otro?", { tipo: "RECIBO_FOTO" })}
                    alNoLeer={(motivo) => decirPia(`${motivo} Prueba otra foto con más luz, o te guío en la app para escribir el código.`, { tipo: "RECIBO_FOTO" })}
                  />
                  <div className="ml-10">
                    <Boton variante="secundario" onClick={() => guiarme("RECIBO")}>
                      Guíame paso a paso en la app
                    </Boton>
                  </div>
                </>
              )}
              {m.accion?.tipo === "PAGO_CHAT" && (
                <PagoEnChat
                  tipo={m.accion.pago}
                  refId={m.accion.ref}
                  asistida={asistida}
                  alPagar={(r) =>
                    decirPia(`¡Pago realizado! ${r.descripcion}: ${soles(r.monto)}. N.º de operación ${r.operacion}. Hoy no hiciste cola.`, {
                      tipo: "CONSTANCIA",
                      resultado: r,
                    })
                  }
                />
              )}
              {m.accion?.tipo === "CONSTANCIA" && (
                <div className="ml-10">
                  <Boton
                    variante="secundario"
                    onClick={() => {
                      guardarResultado((m.accion as { resultado: ResultadoPago }).resultado);
                      router.push("/pagar/exito");
                    }}
                  >
                    Ver mi constancia
                  </Boton>
                  <BotonConstanciaWhatsApp className="mt-2" datos={(m.accion as { resultado: ResultadoPago }).resultado} />
                </div>
              )}
              {m.accion?.tipo === "NAVEGAR" && (() => {
                const ruta = m.accion.ruta;
                const guia = guiaDe(ruta);
                const directo = (
                  <Boton
                    key="directo"
                    variante={asistida && guia ? "secundario" : "primario"}
                    onClick={() => {
                      const pago = pagoDe(ruta);
                      // «Sí, prepáralo tú»: el pago se confirma aquí mismo, sin salir del chat.
                      if (pago) decirPia("Listo. Elige qué pagar y confirma aquí mismo:", { tipo: "PAGO_CHAT", ...pago });
                      else ir(ruta);
                    }}
                  >
                    {textoBoton(ruta)}
                  </Boton>
                );
                const guiame = guia && (
                  <Boton key="guia" variante={asistida ? "primario" : "secundario"} onClick={() => guiarme(guia)}>
                    Guíame paso a paso en la app
                  </Boton>
                );
                // Asistida: lo principal es que Pía te guíe en la app. Estándar: pagar directo en el chat.
                return <div className="ml-10 flex flex-col gap-2">{asistida ? [guiame, directo] : [directo, guiame]}</div>;
              })()}
              {m.accion?.tipo === "OPCIONES" && (
                <div className="ml-10 flex flex-col gap-2">
                  {m.accion.opciones.map((o) => (
                    <button
                      key={o.ruta + o.texto}
                      type="button"
                      onClick={() => {
                        const pago = pagoDe(o.ruta);
                        if (pago) decirPia("Listo. Revisa y confirma aquí mismo:", { tipo: "PAGO_CHAT", ...pago });
                        else if (o.ruta.startsWith("/pagar/recibo")) decirPia("Tómale una foto a tu recibo y yo leo el código:", { tipo: "RECIBO_FOTO" });
                        else ir(o.ruta);
                      }}
                      className="flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 border-marca bg-superficie px-4 text-left text-lg font-bold text-marca active:bg-marca-claro"
                    >
                      {o.texto}
                      <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
                    </button>
                  ))}
                  {guiaDe(m.accion.opciones[0]?.ruta ?? "") && (
                    <button
                      type="button"
                      onClick={() => guiarme(guiaDe(m.accion?.tipo === "OPCIONES" ? m.accion.opciones[0].ruta : "")!)}
                      className="min-h-12 font-bold text-marca underline underline-offset-4"
                    >
                      Prefiero que me guíes en la app
                    </button>
                  )}
                </div>
              )}
            </div>
          ),
          )
        )}

        {inicio && me && (
          <>
            <section aria-label="Lo más pedido" className="grid grid-cols-3 gap-2">
              {accesos.map((id, i) => {
                const acc = ACCESOS[id]!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => enviar(acc.texto)}
                    className={`${i === 0 ? "guia-toca " : ""}flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-linea-fuerte bg-superficie px-2 py-3 text-center active:bg-superficie-2`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca text-white">
                      <acc.Icono className="h-6 w-6" />
                    </span>
                    <span className="text-base font-bold leading-tight">{acc.texto}</span>
                  </button>
                );
              })}
            </section>
            <section aria-labelledby="preguntas" className="flex flex-col items-center gap-2">
              <h2 id="preguntas" className="text-sm font-bold tracking-wide text-tenue uppercase">
                Preguntas rápidas
              </h2>
              <div className="flex flex-wrap justify-center gap-2">
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
