"use client";
// Envío a un contacto DENTRO del chat de Pía («yapéale 50 a Sergio»), sin ir a otra pantalla:
// ¿cuál Sergio? (toque) → monto y Yape/Plin/otros ya llenos → «Confirmar envío» → huella, rostro o clave.
// La IA nunca envía: el dinero solo se mueve cuando la persona toca «Confirmar envío» y se autentica.
// Usa las mismas rutas que Transferencias › A contacto; la key de idempotencia hace que reintentar no envíe dos veces.
import type { ConfirmarTransferenciaRes, Cuenta, PrepararTransferenciaRes } from "@cp/shared";
import { Smartphone, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CuentaOrigen } from "@/components/pago/CuentaOrigen";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "@/components/pago/HojaAutenticacion";
import { Boton } from "@/components/ui";
import { ApiFallo, api } from "@/lib/api";
import { cargarCliente } from "@/lib/cliente";
import { soles } from "@/lib/formato";
import { track } from "@/lib/track";
import {
  NOMBRE_BILLETERA,
  TOPE_ENVIO,
  buscar,
  conectarDelCelular,
  formatoCelular,
  hayAgendaDelCelular,
  leerAgenda,
  olvidarAgenda,
  usarAgendaPrueba,
  type Billetera,
  type Contacto,
} from "./contactos";

export type EnvioHecho = ConfirmarTransferenciaRes & { contacto: Contacto; billetera: Billetera };
type Props = {
  nombre: string | null;
  monto: number | null;
  billetera: Billetera | null;
  asistida: boolean;
  /** true solo en el último mensaje de Pía: marca con «Toca aquí» lo que hay que tocar. */
  activo: boolean;
  alEnviar: (r: EnvioHecho) => void;
};
type Fase = "listo" | "preparando" | "auth" | "procesando" | "incierto" | "cancelado" | "hecho";

const BILLETERAS: Billetera[] = ["YAPE", "PLIN", "BIM", "DALE", "SIP"];
const COLOR: Record<Billetera, string> = { YAPE: "#742284", PLIN: "#00a19a", BIM: "#e4002b", DALE: "#ec111a", SIP: "#2d6cdf" };
const RAPIDOS = [10, 20, 50, 100];

const mayus = (s: string) => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const iniciales = (n: string) =>
  n
    .replace(/[^\p{L} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

/** "50", "20.5", "20,50" → número; null si no es un monto válido. */
function leerMonto(t: string): number | null {
  const s = t.replace(",", ".").trim();
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca text-lg font-bold text-white">
      {iniciales(nombre)}
    </span>
  );
}

export function EnvioEnChat({ nombre, monto, billetera, asistida, activo, alEnviar }: Props) {
  const [agenda, setAgenda] = useState<Contacto[] | null>(null);
  const [leida, setLeida] = useState(false);
  const [nativo, setNativo] = useState(false);
  const [busqueda, setBusqueda] = useState(nombre ?? "");
  const [elegido, setElegido] = useState<Contacto | null>(null);
  const [montoTxt, setMontoTxt] = useState(monto && monto <= TOPE_ENVIO ? String(monto) : "");
  const [destino, setDestino] = useState<Billetera | null>(billetera);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<PrepararTransferenciaRes | null>(null);
  const [fase, setFase] = useState<Fase>("listo");
  const [aviso, setAviso] = useState("");

  // Los contactos están en localStorage: se leen al montar. Si el nombre dicho coincide con uno solo, queda elegido.
  const cargar = useCallback(() => {
    const a = leerAgenda();
    setAgenda(a);
    setNativo(hayAgendaDelCelular());
    setLeida(true);
    if (a && nombre) {
      const r = buscar(a, nombre);
      if (r.length === 1) setElegido(r[0]);
    }
  }, [nombre]);

  useEffect(() => {
    cargar();
    track("envio-chat", "ver");
    cargarCliente().then(
      (m) => {
        const c = m.cuentas.filter((k) => k.paraPagar);
        setCuentas(c);
        setCuentaId((id) => id ?? c[0]?.id ?? null);
      },
      () => {},
    );
  }, [cargar]);

  const resultados = useMemo(() => (agenda ? buscar(agenda, busqueda) : []), [agenda, busqueda]);
  const cuenta = cuentas.find((k) => k.id === cuentaId) ?? null;
  const n = leerMonto(montoTxt);
  const excede = n !== null && n > TOPE_ENVIO;
  const sinSaldo = n !== null && cuenta !== null && n > cuenta.saldo;
  const valido = Boolean(elegido && n !== null && !excede && !sinSaldo && destino && cuenta);

  // Cualquier cambio en el envío invalida el resumen anterior (y su key): se prepara de nuevo al confirmar.
  // Mientras se verifica un envío sin respuesta no se cambia nada: una key nueva podría enviar dos veces.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    if (fase === "incierto") return;
    set(v);
    setResumen(null);
    setAviso("");
  };

  function conectar(origen: "CELULAR" | "PRUEBA") {
    track("envio-chat", "tocar");
    const fijar = (a: Contacto[] | null) => {
      if (!a) return setAviso("No elegiste contactos con celular. Puedes intentarlo otra vez.");
      setAviso("");
      setAgenda(a);
      if (nombre) {
        const r = buscar(a, nombre);
        if (r.length === 1) setElegido(r[0]);
      }
    };
    if (origen === "PRUEBA") return fijar(usarAgendaPrueba());
    conectarDelCelular().then(fijar, () => setAviso("No pudimos abrir tus contactos."));
  }

  const cuerpo = () => ({
    tipo: "CONTACTO" as const,
    cuentaOrigenId: cuenta!.id,
    destino: elegido!.telefono,
    monto: n!,
    glosa: `${NOMBRE_BILLETERA[destino!]} · ${elegido!.nombre}`.slice(0, 100),
  });

  /** «Confirmar envío»: arma el resumen (no mueve dinero) y pide huella, rostro o clave. */
  async function pedirConfirmacion() {
    if (!valido) return;
    track("envio-chat", "tocar");
    if (resumen) return setFase("auth");
    setFase("preparando");
    try {
      const r = await api<PrepararTransferenciaRes>("/transferencias/preparar", { cuerpo: cuerpo() });
      setResumen(r);
      if (!r.saldoSuficiente) {
        setAviso("Tu cuenta no tiene saldo suficiente. Elige otra cuenta o un monto menor. No se movió dinero.");
        return setFase("listo");
      }
      setFase("auth");
    } catch (e) {
      setAviso(e instanceof ApiFallo ? e.message : "No pude preparar el envío. Vuelve a intentar.");
      setFase("listo");
    }
  }

  async function confirmar(metodo: MetodoAuth) {
    if (!resumen) return;
    setFase("procesando");
    try {
      const r = await api<ConfirmarTransferenciaRes>("/transferencias/confirmar", {
        cuerpo: { ...cuerpo(), idempotencyKey: resumen.idempotencyKey, autenticacion: metodo },
      });
      setFase("hecho");
      track("envio-chat", "completar", { ayudaUsada: true });
      alEnviar({ ...r, contacto: elegido!, billetera: destino! });
    } catch (e) {
      const f = e instanceof ApiFallo ? e : null;
      if (f?.codigo === "SALDO_INSUFICIENTE") {
        setAviso(f.message);
        setResumen(null);
        return setFase("listo");
      }
      // Sin respuesta: no sabemos si salió. La key se conserva; «Revisar el envío» no envía dos veces.
      track("envio-chat", "error");
      setFase("incierto");
    }
  }

  const caja = "ml-10 flex flex-col gap-3 rounded-2xl border-2 border-marca/40 bg-superficie p-4";
  if (!leida || fase === "hecho") return null;
  if (fase === "cancelado")
    return <p className="ml-10 rounded-xl bg-superficie p-3 font-bold">Cancelaste el envío. No se movió dinero de tu cuenta.</p>;

  // ── 1. Conectar contactos (solo la primera vez) ───
  if (!agenda) {
    return (
      <div className={caja}>
        <p className="flex items-center gap-2 text-lg font-bold">
          <UsersRound className="h-6 w-6 text-marca" aria-hidden /> Conecta tus contactos
        </p>
        <p className="text-tenue">Así eliges a quién enviar sin escribir su número.</p>
        {nativo && (
          <Boton guia={activo} onClick={() => conectar("CELULAR")}>
            Elegir de mis contactos
          </Boton>
        )}
        <Boton guia={activo && !nativo} variante={nativo ? "secundario" : "primario"} onClick={() => conectar("PRUEBA")}>
          Usar contactos de prueba
        </Boton>
        {aviso && <p className="font-bold text-error">{aviso}</p>}
        <p className="text-sm text-tenue">Tus contactos se quedan en tu celular. Tú eliges cuáles compartir; Pía no los guarda.</p>
      </div>
    );
  }

  // ── 2. ¿Cuál Sergio? ──────────────────────────────
  if (!elegido) {
    const pedido = busqueda.trim();
    const lista = resultados.length ? resultados : buscar(agenda, "");
    const titulo = !pedido
      ? "¿A quién le envías?"
      : resultados.length > 1
        ? `Tienes ${resultados.length} contactos «${mayus(pedido)}». ¿A cuál?`
        : resultados.length === 1
          ? "¿Es este contacto?"
          : `No encontré «${mayus(pedido)}» en tus contactos. Elige o busca:`;
    return (
      <div className={caja}>
        <p className="text-lg font-bold">{titulo}</p>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o número"
          aria-label="Buscar contacto"
          className="min-h-12 rounded-full border-2 border-linea bg-fondo px-4 text-lg focus:border-marca focus:outline-none"
        />
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto" aria-label="Contactos">
          {lista.map((c, i) => (
            <li key={c.telefono}>
              <button
                type="button"
                onClick={() => {
                  track("envio-chat", "tocar");
                  setElegido(c);
                }}
                className={`${activo && i === 0 && resultados.length > 0 ? "guia-toca " : ""}flex min-h-16 w-full items-center gap-3 rounded-xl border-2 border-linea bg-fondo px-3 text-left hover:border-marca active:bg-marca-claro`}
              >
                <Avatar nombre={c.nombre} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-lg font-bold">{c.nombre}</span>
                  <span className="text-tenue">{formatoCelular(c.telefono)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-between gap-2">
          {nativo && (
            <button type="button" className="min-h-11 font-bold text-marca underline underline-offset-4" onClick={() => conectar("CELULAR")}>
              Agregar contactos
            </button>
          )}
          <button
            type="button"
            className="min-h-11 text-tenue underline underline-offset-4"
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

  // ── 3. Revisar y confirmar, aquí mismo ────────────
  const ocupado = fase === "preparando" || fase === "procesando" || fase === "incierto";
  return (
    <div className={caja}>
      <EstilosPago />
      <div className="flex items-center gap-3">
        <Avatar nombre={elegido.nombre} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-tenue">Para</span>
          <span className="truncate text-xl font-bold">{elegido.nombre}</span>
          <span className="flex items-center gap-1 whitespace-nowrap text-tenue">
            <Smartphone className="h-4 w-4" aria-hidden /> {formatoCelular(elegido.telefono)}
          </span>
        </span>
        {!ocupado && (
          <button type="button" className="min-h-11 font-bold text-marca underline underline-offset-4" onClick={() => cambiar(setElegido)(null)}>
            Cambiar
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">Monto</span>
        <span className="flex items-center gap-2 rounded-xl border-2 border-linea bg-fondo px-4 focus-within:border-marca">
          <span className="text-2xl font-bold text-tenue">S/</span>
          <input
            value={montoTxt}
            onChange={(e) => cambiar(setMontoTxt)(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto en soles"
            disabled={ocupado}
            className="min-h-14 min-w-0 flex-1 bg-transparent text-3xl font-bold focus:outline-none"
          />
        </span>
      </label>
      {!monto && (
        <div className="flex flex-wrap gap-2">
          {RAPIDOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => cambiar(setMontoTxt)(String(r))}
              className="min-h-11! rounded-full border border-marca bg-superficie px-4 text-base text-marca active:bg-marca-claro"
            >
              S/ {r}
            </button>
          ))}
        </div>
      )}
      {excede && <p className="font-bold text-error">El máximo por envío a celular es {soles(TOPE_ENVIO)}.</p>}
      {montoTxt && n === null && <p className="font-bold text-error">Escribe un monto válido, por ejemplo 50 o 20.50.</p>}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">Por dónde</legend>
        <div className="flex flex-wrap gap-2">
          {BILLETERAS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={destino === b}
              disabled={ocupado}
              onClick={() => cambiar(setDestino)(b)}
              className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 text-lg font-bold ${
                destino === b ? "border-marca bg-marca-claro text-marca" : "border-linea bg-fondo"
              } ${activo && !destino && b === "YAPE" ? "guia-toca" : ""}`}
            >
              <span aria-hidden className="h-3.5 w-3.5 rounded-full" style={{ background: COLOR[b] }} />
              {NOMBRE_BILLETERA[b]}
            </button>
          ))}
        </div>
      </fieldset>

      {cuenta && !ocupado && <CuentaOrigen nombre={`cuenta-envio-${elegido.telefono}`} cuentas={cuentas} actual={cuenta} onCambio={cambiar(setCuentaId)} />}

      {sinSaldo && <p className="rounded-xl bg-aviso-claro p-3 font-bold">Tu cuenta no tiene saldo suficiente para este monto. No se movió dinero.</p>}
      {aviso && <p className="rounded-xl bg-aviso-claro p-3 font-bold">{aviso}</p>}
      {fase === "incierto" ? (
        <p className="rounded-xl bg-aviso-claro p-3">
          <b>Estamos verificando tu envío. No lo vuelvas a enviar.</b> Toca «Revisar el envío» en un momento: no se envía dos veces.
        </p>
      ) : (
        <p className="font-medium">Revisa a quién y cuánto. El dinero sale solo cuando confirmas con tu huella.</p>
      )}

      <Boton guia={activo && valido && !ocupado} disabled={!valido || fase === "preparando" || fase === "procesando"} onClick={pedirConfirmacion}>
        {fase === "procesando"
          ? "Enviando…"
          : fase === "preparando"
            ? "Preparando…"
            : fase === "incierto"
              ? "Revisar el envío"
              : valido && n !== null
                ? `Confirmar envío de ${soles(n)}`
                : "Confirmar envío"}
      </Boton>
      {(fase === "listo" || fase === "auth") && (
        <button type="button" onClick={() => setFase("cancelado")} className="min-h-11 font-bold text-marca underline underline-offset-4">
          Cancelar
        </button>
      )}
      {fase === "auth" && <HojaAutenticacion asistida={asistida} onOk={confirmar} onCancelar={() => setFase("cancelado")} />}
    </div>
  );
}
