"use client";
// Pago DENTRO del chat de Pía («Sí, prepáralo tú»): Pía deja el pago listo y el cliente confirma ahí mismo.
// Misma regla que la pantalla de confirmación: monto, a quién y desde qué cuenta; «Confirmar pago»; rostro, huella o clave.
// La IA nunca autoriza. La key de idempotencia se reutiliza: reintentar nunca cobra dos veces.
import type { ConfirmarPagoRes, Cuenta, PrepararPagoRes, TipoPago } from "@cp/shared";
import { useCallback, useEffect, useState } from "react";
import { Boton } from "@/components/ui";
import { ApiFallo, api } from "@/lib/api";
import { cargarCliente } from "@/lib/cliente";
import { soles } from "@/lib/formato";
import { track } from "@/lib/track";
import { borrarKey, guardarKey, leerKey } from "./almacen";
import { EstilosPago } from "./EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "./HojaAutenticacion";

type Fase = "cargando" | "listo" | "auth" | "procesando" | "fallido" | "incierto" | "cancelado" | "error" | "hecho";
type Props = {
  tipo: TipoPago;
  refId: number;
  asistida: boolean;
  alPagar: (r: ConfirmarPagoRes & { destinatario: string; tipo: TipoPago; referenciaId: number }) => void;
};

export function PagoEnChat({ tipo, refId, asistida, alPagar }: Props) {
  const [fase, setFase] = useState<Fase>("cargando");
  const [pago, setPago] = useState<PrepararPagoRes | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [mensaje, setMensaje] = useState("");

  const preparar = useCallback(
    async (cuentaId?: number) => {
      setFase("cargando");
      try {
        const p = await api<PrepararPagoRes>("/pagos/preparar", { cuerpo: { tipo, referenciaId: refId, ...(cuentaId ? { cuentaId } : {}) } });
        const previa = leerKey(tipo, refId);
        if (!previa) guardarKey(tipo, refId, p.idempotencyKey);
        setPago(previa ? { ...p, idempotencyKey: previa } : p);
        setFase("listo");
      } catch (e) {
        setMensaje(e instanceof ApiFallo ? e.message : "No pude preparar el pago. Vuelve a intentar.");
        setFase("error");
      }
    },
    [tipo, refId],
  );

  useEffect(() => {
    preparar();
    cargarCliente().then((m) => setCuentas(m.cuentas.filter((k) => k.paraPagar)), () => {});
  }, [preparar]);

  async function confirmar(metodo: MetodoAuth) {
    if (!pago) return;
    setFase("procesando");
    try {
      const r = await api<ConfirmarPagoRes>("/pagos/confirmar", {
        cuerpo: { tipo, referenciaId: refId, cuentaId: pago.cuenta.id, idempotencyKey: pago.idempotencyKey, autenticacion: metodo, conAyuda: true },
      });
      if (r.estado === "FALLIDO") return setFase("fallido");
      borrarKey(tipo, refId);
      setFase("hecho");
      track("pago-chat", "completar", { flujo: tipo });
      alPagar({ ...r, destinatario: pago.destinatario, tipo, referenciaId: refId });
    } catch (e) {
      const f = e instanceof ApiFallo ? e : null;
      if (f?.codigo === "SALDO_INSUFICIENTE") {
        setPago({ ...pago, saldoSuficiente: false });
        return setFase("listo");
      }
      if (f?.codigo === "YA_PAGADO") {
        borrarKey(tipo, refId);
        setMensaje("Este pago ya está hecho. No se volverá a cobrar.");
        return setFase("error");
      }
      setFase("incierto");
    }
  }

  const caja = "ml-10 flex flex-col gap-3 rounded-2xl border-2 border-marca/40 bg-superficie p-4";
  if (fase === "cargando") return <p className="ml-10 text-tenue">Preparando tu pago…</p>;
  if (fase === "error") return <p className="ml-10 rounded-xl bg-aviso-claro p-3 font-bold">{mensaje}</p>;
  if (fase === "hecho") return null;
  if (fase === "cancelado") return <p className="ml-10 rounded-xl bg-superficie p-3 font-bold">Cancelaste el pago. No enviamos una nueva solicitud.</p>;
  if (!pago) return null;

  return (
    <div className={caja}>
      <EstilosPago />
      <div className="text-center">
        <p className="text-tenue">Vas a pagar</p>
        <p className="text-4xl font-bold">{soles(pago.monto)}</p>
        <p className="text-tenue">{pago.descripcion}</p>
      </div>
      <p>
        <span className="text-tenue">A quién: </span>
        <b>{pago.destinatario}</b>
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-tenue">Desde tu cuenta</span>
        {cuentas.length > 1 ? (
          <select
            value={pago.cuenta.id}
            onChange={(e) => preparar(Number(e.target.value))}
            className="min-h-13 rounded-lg border-2 border-linea-fuerte bg-superficie px-3 text-lg font-bold"
          >
            {cuentas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.tipo} {k.numeroOculto}
              </option>
            ))}
          </select>
        ) : (
          <b className="text-lg">
            {pago.cuenta.tipo} {pago.cuenta.numeroOculto}
          </b>
        )}
        <span className="text-sm text-tenue">Saldo disponible: {soles(pago.cuenta.saldo)}</span>
      </label>

      {!pago.saldoSuficiente ? (
        <p className="rounded-xl bg-aviso-claro p-3">
          <b>Tu cuenta no tiene saldo suficiente.</b> Elige otra cuenta o deposita en una agencia o agente Caja Piura. No se movió dinero.
        </p>
      ) : fase === "fallido" ? (
        <p className="rounded-xl bg-error-claro p-3">
          <b>No se realizó el pago. No se cobró nada.</b> Puedes intentarlo otra vez: no se cobra dos veces.
        </p>
      ) : fase === "incierto" ? (
        <p className="rounded-xl bg-aviso-claro p-3">
          <b>Estamos verificando el estado. No vuelvas a pagar todavía.</b> Toca «Revisar el pago» en un momento.
        </p>
      ) : (
        <p className="font-medium">Revisa el monto y la cuenta. El pago se hará solo cuando confirmes.</p>
      )}

      {pago.saldoSuficiente && (
        <Boton disabled={fase === "procesando"} onClick={() => setFase("auth")}>
          {fase === "procesando" ? "Procesando tu pago…" : fase === "incierto" ? "Revisar el pago" : fase === "fallido" ? "Intentar de nuevo" : "Confirmar pago"}
        </Boton>
      )}
      {fase !== "procesando" && (
        <button type="button" onClick={() => setFase("cancelado")} className="min-h-11 font-bold text-marca underline underline-offset-4">
          Cancelar
        </button>
      )}
      {fase === "auth" && <HojaAutenticacion asistida={asistida} onOk={confirmar} onCancelar={() => setFase("cancelado")} />}
    </div>
  );
}
