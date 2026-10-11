"use client";
// Enviar a un contacto, paso a paso, dentro del chat de Pía (o en Transferencias › A contacto):
// 1) conectar contactos · 2) "¿cuál Sergio?" · 3) monto y Yape / Plin / otros · 4) "Revisar envío" → /transferir/confirmar.
// Aquí NUNCA se envía dinero: el envío solo sale si el cliente toca "Confirmar envío" y pone su huella en la pantalla siguiente.
import type { Billetera } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Boton } from "@/components/ui";
import { soles } from "@/lib/formato";
import { iniciarFlujo, marcarAyuda, track } from "@/lib/track";
import {
  LIMITE_TRANSFERENCIA,
  NOMBRE_BILLETERA,
  buscarContactos,
  conectarDelCelular,
  conectarPrueba,
  formatoCelular,
  guardarBorrador,
  hayAgendaDelCelular,
  leerAgenda,
  olvidarAgenda,
  type Agenda,
  type Contacto,
} from "./contactos";

type Props = {
  /** Lo que entendió Pía (puede faltar todo). */
  nombre: string | null;
  monto: number | null;
  billetera: Billetera | null;
  /** true si viene del chat (marca ayuda en la telemetría). */
  desdeChat?: boolean;
  guia?: boolean;
};

const PRINCIPALES: Billetera[] = ["YAPE", "PLIN"];
const OTRAS: Billetera[] = ["BIM", "DALE", "SIP"];
const COLOR: Record<Billetera, string> = { YAPE: "#742284", PLIN: "#00a19a", BIM: "#e4002b", DALE: "#ec111a", SIP: "#2d6cdf" };
const RAPIDOS = [10, 20, 50, 100];

const capitalizar = (s: string) => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const iniciales = (n: string) =>
  n
    .replace(/[^\p{L} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

/** "50", "50.5", "50,50" → número válido o null. */
function leerMonto(texto: string): number | null {
  const t = texto.replace(",", ".").trim();
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

export function EnviarAContacto({ nombre, monto, billetera, desdeChat, guia }: Props) {
  const router = useRouter();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [listo, setListo] = useState(false); // ya se leyó localStorage (evita parpadeo)
  const [conectando, setConectando] = useState(false);
  const [errorConectar, setErrorConectar] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState(nombre ?? "");
  const [elegido, setElegido] = useState<Contacto | null>(null);
  const [montoTxt, setMontoTxt] = useState(monto && monto <= LIMITE_TRANSFERENCIA ? String(monto) : "");
  const [destino, setDestino] = useState<Billetera | null>(billetera);
  const [nativo, setNativo] = useState(false);

  // Los contactos están en localStorage: se leen al montar (no existen en el servidor).
  const cargarAgenda = useCallback(() => {
    setAgenda(leerAgenda());
    setNativo(hayAgendaDelCelular());
    setListo(true);
  }, []);

  useEffect(() => {
    cargarAgenda();
    iniciarFlujo("TRANSFERENCIA");
    if (desdeChat) marcarAyuda();
    track("enviar-contacto", "ver", { flujo: "TRANSFERENCIA" });
  }, [cargarAgenda, desdeChat]);

  const resultados = useMemo(() => (agenda ? buscarContactos(agenda.contactos, busqueda) : []), [agenda, busqueda]);
  // Lo que pidió el cliente por chat, para el título ("¿A cuál Sergio?"); cambia si escribe otra búsqueda.
  const pedido = busqueda.trim();

  async function conectar(origen: "CELULAR" | "PRUEBA") {
    track("enviar-contacto", "tocar", { flujo: "TRANSFERENCIA" });
    setConectando(true);
    setErrorConectar(null);
    try {
      const a = origen === "CELULAR" ? await conectarDelCelular() : await conectarPrueba();
      if (a) setAgenda(a);
      else if (origen === "CELULAR") setErrorConectar("No elegiste contactos con celular. Puedes intentarlo otra vez.");
    } catch {
      setErrorConectar(origen === "CELULAR" ? "No pudimos abrir tus contactos." : "No pudimos cargar los contactos. Vuelve a intentar.");
    } finally {
      setConectando(false);
    }
  }

  if (!listo) return null;

  // ── 1. Conectar contactos ─────────────────────────
  if (!agenda) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-linea-fuerte bg-superficie p-4">
        <p className="text-lg font-bold">Conecta tus contactos</p>
        <p className="text-tenue">Así eliges a quién enviar sin escribir su número.</p>
        {nativo && (
          <Boton guia={guia} disabled={conectando} onClick={() => conectar("CELULAR")}>
            Elegir de mis contactos
          </Boton>
        )}
        <Boton guia={guia && !nativo} variante={nativo ? "secundario" : "primario"} disabled={conectando} onClick={() => conectar("PRUEBA")}>
          {conectando ? "Conectando…" : "Usar contactos de prueba"}
        </Boton>
        {errorConectar && <p className="text-error">{errorConectar}</p>}
        <p className="text-sm text-tenue">🔒 Tus contactos se quedan en tu celular. Tú eliges cuáles compartir; Pía no los guarda.</p>
      </div>
    );
  }

  // ── 2. ¿A quién? ──────────────────────────────────
  if (!elegido) {
    const titulo = !pedido
      ? "¿A quién le envías?"
      : resultados.length > 1
        ? `Tienes ${resultados.length} contactos «${capitalizar(pedido)}». ¿A cuál le envías?`
        : resultados.length === 1
          ? `¿Es este contacto?`
          : `No encontré «${capitalizar(pedido)}» en tus contactos.`;
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-linea-fuerte bg-superficie p-4">
        <p className="text-lg font-bold">{titulo}</p>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o número"
          aria-label="Buscar contacto"
          className="min-h-12 rounded-full border-2 border-linea bg-fondo px-4 text-lg focus:border-marca focus:outline-none"
        />
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto" aria-label="Contactos">
          {(resultados.length ? resultados : buscarContactos(agenda.contactos, "")).map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  track("enviar-contacto", "tocar", { flujo: "TRANSFERENCIA" });
                  setElegido(c);
                }}
                className={`${guia && i === 0 && resultados.length ? "guia-toca " : ""}flex min-h-16 w-full items-center gap-3 rounded-xl border border-linea bg-fondo px-3 text-left active:bg-superficie-2`}
              >
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca text-lg font-bold text-white">
                  {iniciales(c.nombre)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-lg font-bold">{c.nombre}</span>
                  <span className="text-tenue">{formatoCelular(c.telefono)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-between gap-2 text-base">
          {nativo && (
            <button type="button" className="font-bold text-marca-texto underline underline-offset-4" onClick={() => conectar("CELULAR")}>
              Agregar contactos
            </button>
          )}
          <button
            type="button"
            className="text-tenue underline underline-offset-4"
            onClick={() => {
              olvidarAgenda();
              setAgenda(null);
            }}
          >
            Desconectar contactos
          </button>
        </div>
      </div>
    );
  }

  // ── 3. Monto y por dónde ──────────────────────────
  const n = leerMonto(montoTxt);
  const excede = n !== null && n > LIMITE_TRANSFERENCIA;
  const valido = n !== null && !excede && destino !== null;

  function revisar() {
    if (!valido || !elegido || !destino || n === null) return;
    track("enviar-contacto", "tocar", { flujo: "TRANSFERENCIA" });
    guardarBorrador({ contacto: elegido, monto: n, billetera: destino });
    router.push("/transferir/confirmar");
  }

  const botonBilletera = (b: Billetera, grande: boolean) => (
    <button
      key={b}
      type="button"
      aria-pressed={destino === b}
      onClick={() => setDestino(b)}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 font-bold ${grande ? "min-h-14 text-xl" : "min-h-12 text-lg"} ${
        destino === b ? "border-marca bg-marca-claro" : "border-linea bg-fondo"
      }`}
    >
      <span aria-hidden className="h-4 w-4 rounded-full" style={{ background: COLOR[b] }} />
      {NOMBRE_BILLETERA[b]}
      {destino === b && <span aria-hidden>✓</span>}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-linea-fuerte bg-superficie p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca text-lg font-bold text-white">
          {iniciales(elegido.nombre)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-bold">{elegido.nombre}</span>
          <span className="text-tenue">{formatoCelular(elegido.telefono)}</span>
        </span>
        <button type="button" className="font-bold text-marca-texto underline underline-offset-4" onClick={() => setElegido(null)}>
          Cambiar
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-bold">¿Cuánto le envías?</span>
        <span className="flex items-center gap-2 rounded-xl border-2 border-linea bg-fondo px-4 focus-within:border-marca">
          <span className="text-2xl font-bold text-tenue">S/</span>
          <input
            value={montoTxt}
            onChange={(e) => setMontoTxt(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto en soles"
            className="min-h-14 min-w-0 flex-1 bg-transparent text-3xl font-bold focus:outline-none"
          />
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {RAPIDOS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setMontoTxt(String(r))}
            className="min-h-11! rounded-full border border-marca bg-superficie px-4 text-base text-marca-texto active:bg-marca-claro"
          >
            S/ {r}
          </button>
        ))}
      </div>
      {excede && <p className="text-error">El máximo por envío es {soles(LIMITE_TRANSFERENCIA)}.</p>}
      {montoTxt && n === null && <p className="text-error">Escribe un monto válido, por ejemplo 50 o 20.50.</p>}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">¿Por dónde le envías?</legend>
        <div className="grid grid-cols-2 gap-2">{PRINCIPALES.map((b) => botonBilletera(b, true))}</div>
        <p className="mt-1 text-sm text-tenue">Otras billeteras</p>
        <div className="grid grid-cols-3 gap-2">{OTRAS.map((b) => botonBilletera(b, false))}</div>
      </fieldset>

      <Boton guia={guia && valido} disabled={!valido} onClick={revisar}>
        {valido && n !== null ? `Revisar envío de ${soles(n)}` : "Revisar envío"}
      </Boton>
      <p className="text-center text-sm text-tenue">Aún no se envía nada. En el siguiente paso revisas y confirmas tú.</p>
    </div>
  );
}
