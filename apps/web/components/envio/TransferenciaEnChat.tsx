"use client";
// Transferencia a una cuenta DENTRO del chat de Pía: entre mis cuentas, a otra cuenta de Caja Piura o a otro banco (CCI).
// Pía deja llenos el tipo, la cuenta y el monto si los dijo. Con la cuenta y el monto completos se revisa solo y se
// muestra A NOMBRE DE QUIÉN está la cuenta; luego «Confirmar transferencia» y huella, rostro o clave.
// La IA nunca transfiere. Mismas rutas que Transferencias; la key de idempotencia hace que reintentar no cobre dos veces.
import type { ConfirmarTransferenciaRes, Cuenta, PrepararTransferenciaRes } from "@cp/shared";
import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { CuentaOrigen } from "@/components/pago/CuentaOrigen";
import { ElegirOpcion } from "@/components/pago/ElegirOpcion";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "@/components/pago/HojaAutenticacion";
import { Boton } from "@/components/ui";
import { ApiFallo, api } from "@/lib/api";
import { cargarCliente } from "@/lib/cliente";
import { soles } from "@/lib/formato";
import { track } from "@/lib/track";

export type TipoCuenta = "PROPIAS" | "TERCEROS" | "INTERBANCARIA";
export type TransferenciaHecha = ConfirmarTransferenciaRes;
type Props = {
  tipo: TipoCuenta;
  destino: string | null;
  monto: number | null;
  asistida: boolean;
  /** true solo en el último mensaje de Pía: marca con «Toca aquí» lo que hay que tocar. */
  activo: boolean;
  alTransferir: (r: TransferenciaHecha) => void;
};
type Fase = "datos" | "revisando" | "auth" | "procesando" | "incierto" | "cancelado" | "hecho";

export const TITULO_TIPO: Record<TipoCuenta, string> = {
  PROPIAS: "Entre mis cuentas",
  TERCEROS: "A otra cuenta de Caja Piura",
  INTERBANCARIA: "A otro banco",
};
const RAPIDOS = [20, 50, 100, 200];

function leerMonto(t: string): number | null {
  const s = t.replace(",", ".").trim();
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

export function TransferenciaEnChat({ tipo, destino: destinoDicho, monto, asistida, activo, alTransferir }: Props) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destino, setDestino] = useState(destinoDicho ?? "");
  const [montoTxt, setMontoTxt] = useState(monto ? String(monto) : "");
  const [resumen, setResumen] = useState<PrepararTransferenciaRes | null>(null);
  const [fase, setFase] = useState<Fase>("datos");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    track(`transferir-chat-${tipo.toLowerCase()}`, "ver");
    cargarCliente(true).then(
      (m) => {
        const c = m.cuentas.filter((k) => k.paraPagar);
        setCuentas(c);
        setOrigenId((id) => id ?? c[0]?.id ?? null);
      },
      () => setAviso("No pudimos cargar tus cuentas. Vuelve a intentar."),
    );
  }, [tipo]);

  const origen = cuentas.find((k) => k.id === origenId) ?? null;
  const n = leerMonto(montoTxt);
  const limpio = destino.replace(/[\s-]/g, "");
  const destinoOk =
    tipo === "PROPIAS" ? Boolean(limpio) && limpio !== String(origenId) : tipo === "TERCEROS" ? /^\d{10,18}$/.test(limpio) : /^\d{20}$/.test(limpio);
  const completo = Boolean(origen && destinoOk && n !== null);
  const bloqueado = fase === "revisando" || fase === "procesando" || fase === "incierto" || fase === "auth";

  // Con todo completo, se revisa solo (no mueve dinero): así se ve a nombre de quién está la cuenta antes de confirmar.
  useEffect(() => {
    if (fase !== "datos") return;
    setResumen(null);
    setAviso("");
    if (!completo) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<PrepararTransferenciaRes>("/transferencias/preparar", {
          cuerpo: { tipo, cuentaOrigenId: origenId, destino: limpio, monto: n },
        });
        setResumen(r);
      } catch (e) {
        setAviso(e instanceof ApiFallo ? e.message : "No pudimos revisar los datos. Vuelve a intentar.");
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, origenId, limpio, n, completo]);

  async function confirmar(metodo: MetodoAuth) {
    if (!resumen) return;
    setFase("procesando");
    try {
      const r = await api<ConfirmarTransferenciaRes>("/transferencias/confirmar", {
        cuerpo: { tipo, cuentaOrigenId: origenId, destino: limpio, monto: n, idempotencyKey: resumen.idempotencyKey, autenticacion: metodo },
      });
      setFase("hecho");
      track(`transferir-chat-${tipo.toLowerCase()}`, "completar", { ayudaUsada: true });
      alTransferir(r);
    } catch (e) {
      const f = e instanceof ApiFallo ? e : null;
      if (f && f.status > 0 && f.status < 500) {
        // Rechazo claro (saldo, cuenta): no se movió nada; se corrige y se vuelve a revisar.
        setAviso(f.message);
        return setFase("datos");
      }
      // Sin respuesta: no sabemos si salió. La key se conserva; «Revisar la transferencia» no cobra dos veces.
      track(`transferir-chat-${tipo.toLowerCase()}`, "error");
      setFase("incierto");
    }
  }

  const caja = "ml-10 flex flex-col gap-3 rounded-2xl border-2 border-marca/40 bg-superficie p-4";
  if (fase === "hecho") return null;
  if (fase === "cancelado") return <p className="ml-10 rounded-xl bg-superficie p-3 font-bold">Cancelaste la transferencia. No se movió dinero de tu cuenta.</p>;

  const otrasCuentas = cuentas.filter((k) => k.id !== origenId);
  const listo = Boolean(resumen && resumen.saldoSuficiente && completo);

  return (
    <div className={caja}>
      <EstilosPago />
      <p className="flex items-center gap-2 text-lg font-bold">
        <Landmark className="h-6 w-6 text-marca" aria-hidden /> {TITULO_TIPO[tipo]}
      </p>

      {origen && !bloqueado && (
        <CuentaOrigen nombre={`origen-chat-${tipo}`} cuentas={cuentas} actual={origen} onCambio={(id) => setOrigenId(id)} />
      )}

      {tipo === "PROPIAS" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-tenue">A tu cuenta</span>
          {bloqueado ? (
            <p className="font-bold">{otrasCuentas.find((k) => String(k.id) === limpio)?.tipo}</p>
          ) : (
            <ElegirOpcion
              nombre={`destino-chat-${tipo}`}
              valor={destino}
              onCambio={setDestino}
              vacio="No tienes otra cuenta para recibir."
              opciones={otrasCuentas.map((k) => ({ valor: String(k.id), texto: `${k.tipo} ${k.numeroOculto}`, detalle: `Saldo ${soles(k.saldo)}` }))}
            />
          )}
        </div>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="font-bold">{tipo === "INTERBANCARIA" ? "CCI de la cuenta (20 números)" : "Número de cuenta Caja Piura"}</span>
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value.replace(/[^\d\s-]/g, "").slice(0, 26))}
            inputMode="numeric"
            disabled={bloqueado}
            placeholder={tipo === "INTERBANCARIA" ? "00212345678901234567" : "00110200000002"}
            aria-label={tipo === "INTERBANCARIA" ? "CCI de la cuenta" : "Número de cuenta"}
            className={`min-h-14 rounded-xl border-2 border-linea bg-fondo px-4 font-mono text-xl tracking-wider focus:border-marca focus:outline-none ${activo && !destinoOk ? "guia-toca" : ""}`}
          />
          {tipo === "TERCEROS" && !destinoOk && !bloqueado && (
            <button type="button" onClick={() => setDestino(origen?.numero === "00110200000002" ? "00110200000001" : "00110200000002")} className="min-h-10 self-start text-sm font-bold text-marca underline underline-offset-4">
              Usar una cuenta de prueba
            </button>
          )}
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-bold">Monto</span>
        <span className="flex items-center gap-2 rounded-xl border-2 border-linea bg-fondo px-4 focus-within:border-marca">
          <span className="text-2xl font-bold text-tenue">S/</span>
          <input
            value={montoTxt}
            onChange={(e) => setMontoTxt(e.target.value.replace(/[^\d.,]/g, "").slice(0, 9))}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto en soles"
            disabled={bloqueado}
            className="min-h-14 min-w-0 flex-1 bg-transparent text-3xl font-bold focus:outline-none"
          />
        </span>
      </label>
      {!monto && !bloqueado && (
        <div className="flex flex-wrap gap-2">
          {RAPIDOS.map((r) => (
            <button key={r} type="button" onClick={() => setMontoTxt(String(r))} className="min-h-11! rounded-full border border-marca bg-superficie px-4 text-base text-marca active:bg-marca-claro">
              S/ {r}
            </button>
          ))}
        </div>
      )}
      {montoTxt && n === null && <p className="font-bold text-error">Escribe un monto válido, por ejemplo 50 o 20.50.</p>}

      {/* A nombre de quién: lo dice Caja Piura, no Pía. Se ve antes de confirmar. */}
      {completo && !resumen && !aviso && <p className="text-tenue">Revisando la cuenta…</p>}
      {resumen && completo && (
        <div className="rounded-xl bg-fondo p-3">
          <p className="text-tenue">Para</p>
          <p className="text-xl font-bold">{resumen.nombreDestino}</p>
          <p className="text-tenue">{resumen.destinoMostrado}</p>
          {tipo !== "PROPIAS" && <p className="mt-1 text-sm text-tenue">Si no es la persona que buscas, no confirmes.</p>}
        </div>
      )}
      {resumen && !resumen.saldoSuficiente && <p className="rounded-xl bg-aviso-claro p-3 font-bold">Tu cuenta no tiene saldo suficiente. Elige otra cuenta o un monto menor. No se movió dinero.</p>}
      {aviso && <p className="rounded-xl bg-aviso-claro p-3 font-bold">{aviso}</p>}
      {fase === "incierto" ? (
        <p className="rounded-xl bg-aviso-claro p-3">
          <b>Estamos verificando tu transferencia. No la vuelvas a hacer.</b> Toca «Revisar la transferencia» en un momento: no se cobra dos veces.
        </p>
      ) : (
        <p className="font-medium">El dinero sale solo cuando confirmas con tu huella.</p>
      )}

      <Boton guia={activo && listo && fase === "datos"} disabled={!listo || fase === "procesando" || fase === "auth"} onClick={() => setFase("auth")}>
        {fase === "procesando"
          ? "Transfiriendo…"
          : fase === "incierto"
            ? "Revisar la transferencia"
            : n !== null && listo
              ? `Confirmar transferencia de ${soles(n)}`
              : "Confirmar transferencia"}
      </Boton>
      {(fase === "datos" || fase === "auth") && (
        <button type="button" onClick={() => setFase("cancelado")} className="min-h-11 font-bold text-marca underline underline-offset-4">
          Cancelar
        </button>
      )}
      {fase === "auth" && <HojaAutenticacion asistida={asistida} onOk={confirmar} onCancelar={() => setFase("cancelado")} />}
    </div>
  );
}
