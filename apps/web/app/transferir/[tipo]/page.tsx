"use client";
// Transferencias como en la app oficial (fotos del 10 oct): «Ingresa tus datos» con los mismos campos de cada tipo,
// luego la confirmación, tu huella/rostro/clave y la constancia. Entre cuentas propias son 3 pasos; las demás, 4.
import type { ConfirmarTransferenciaRes, MeRes, PrepararTransferenciaRes, TipoTransferencia } from "@cp/shared";
import { FileDown, Smartphone } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BotonConstanciaWhatsApp } from "@/components/pago/ConstanciaWhatsApp";
import { ElegirOpcion } from "@/components/pago/ElegirOpcion";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "@/components/pago/HojaAutenticacion";
import { IconoCheck } from "@/components/pago/Iconos";
import { CampoApp, PasosApp, claseSelect } from "@/components/pago/PasosApp";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaHora, soles } from "@/lib/formato";
import { track, usoAyuda } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { hablar, montoHablado } from "@/lib/voz";

type Config = { tipo: TipoTransferencia; titulo: string; pasos: number; etiquetaDestino: string; placeholder: string; terminos?: string; moneda?: string };
const CONFIG: Record<string, Config> = {
  propias: { tipo: "PROPIAS", titulo: "Transferencias a cuentas propias", pasos: 3, etiquetaDestino: "Cuenta destino", placeholder: "" },
  terceros: { tipo: "TERCEROS", titulo: "Transferencias a terceros", pasos: 4, etiquetaDestino: "Cuenta destino", placeholder: "Ingrese cuenta" },
  interbancaria: {
    tipo: "INTERBANCARIA",
    titulo: "Transferencias interbancarias en línea",
    pasos: 4,
    etiquetaDestino: "CCI del beneficiario",
    placeholder: "Ingrese cuenta",
    moneda: "Moneda",
    terminos: "generales del servicio de Transferencias interbancarias en Línea o Pago de tarjeta de crédito en línea vía CCE",
  },
  contacto: {
    tipo: "CONTACTO",
    titulo: "Envío a contacto",
    pasos: 4,
    etiquetaDestino: "Número de celular",
    placeholder: "Selecciona número de celular",
    moneda: "Tipo de moneda",
    terminos: "del servicio de envío a contacto",
  },
};

const claseCampo = `${claseSelect} placeholder:text-tenue`;

export default function Transferir() {
  const { tipo: slug } = useParams<{ tipo: string }>();
  const cfg = CONFIG[slug];
  const router = useRouter();
  const { asistida } = useVista();
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [monto, setMonto] = useState("");
  const [glosa, setGlosa] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [verTerminos, setVerTerminos] = useState(false);
  const [fase, setFase] = useState<"datos" | "revisar" | "autenticando" | "procesando" | "listo">("datos");
  const [resumen, setResumen] = useState<PrepararTransferenciaRes | null>(null);
  const [hecho, setHecho] = useState<ConfirmarTransferenciaRes | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setMe(await api<MeRes>("/me"));
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus cuentas. Vuelve a intentar.");
    }
  }, [router]);

  useEffect(() => {
    if (!cfg) return void router.replace("/transferencias");
    track(`transferir-${slug}`, "ver");
    cargar();
  }, [cfg, slug, cargar, router]);

  if (!cfg) return null;
  const montoNum = Number(monto.replace(",", "."));
  const cuerpo = { tipo: cfg.tipo, cuentaOrigenId: Number(origen), destino, monto: montoNum, ...(glosa.trim() ? { glosa: glosa.trim() } : {}) };
  const listo = Boolean(origen && destino.trim() && montoNum > 0 && (!cfg.terminos || acepto));
  // Paso de la barra 1-2-3(-4): datos, confirmación, validación (solo 4 pasos) y constancia.
  const actual = fase === "datos" ? 1 : fase === "revisar" ? 2 : fase === "listo" ? cfg.pasos : cfg.pasos === 4 ? 3 : 2;

  const continuar = async () => {
    setAviso(null);
    setEnviando(true);
    try {
      const r = await api<PrepararTransferenciaRes>("/transferencias/preparar", { cuerpo });
      setResumen(r);
      setFase("revisar");
      track(`transferir-${slug}`, "tocar");
      if (asistida) hablar(`Vas a transferir ${montoHablado(r.monto)} a ${r.nombreDestino}. Revisa y toca Transferir.`);
    } catch (e) {
      setAviso(e instanceof ApiFallo ? e.message : "No pudimos revisar los datos. Vuelve a intentar.");
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async (metodo: MetodoAuth) => {
    if (!resumen) return;
    setFase("procesando");
    try {
      const r = await api<ConfirmarTransferenciaRes>("/transferencias/confirmar", { cuerpo: { ...cuerpo, idempotencyKey: resumen.idempotencyKey, autenticacion: metodo, conAyuda: usoAyuda() } });
      setHecho(r);
      setFase("listo");
      track(`transferir-${slug}`, "completar");
      if (asistida) hablar(`Listo. Transferiste ${montoHablado(r.monto)}.`);
    } catch (e) {
      setAviso(e instanceof ApiFallo ? e.message : "No pudimos hacer la transferencia. No se movió nada.");
      setFase("revisar");
    }
  };

  const cuentasPago = me?.cuentas.filter((k) => k.paraPagar) ?? [];
  const opcion = (k: MeRes["cuentas"][number]) => ({ valor: String(k.id), texto: `${k.tipo} ${k.numeroOculto}`, detalle: `Saldo disponible ${soles(k.saldo)}` });
  // Para probar «A terceros» en la demo: la cuenta de otra clienta de prueba.
  const cuentaPrueba = me?.cuentas.some((k) => k.numero === "00110200000002") ? "00110200000001" : "00110200000002";

  return (
    <Pantalla titulo={fase === "listo" ? "Transferencia realizada" : cfg.titulo} volver={fase === "listo" ? undefined : "/transferencias"}>
      <EstilosPago />
      {error ? (
        <MensajeError mensaje={error} reintentar={cargar} />
      ) : !me ? (
        <Cargando texto="Buscando tus cuentas…" />
      ) : fase === "listo" && hecho ? (
        <>
          <PasosApp total={cfg.pasos} actual={cfg.pasos + 1} />
          <div className="anim-aparece flex flex-col items-center gap-2 text-center">
            <IconoCheck className="h-24 w-24 text-exito" />
            <h2 className="text-2xl font-bold text-exito">¡Transferencia realizada!</h2>
            <p className="text-5xl font-bold tracking-tight">{soles(hecho.monto)}</p>
            {hecho.repetida && <p className="text-tenue">Esta transferencia ya estaba hecha. No se envió otra vez.</p>}
          </div>
          <Tarjeta className="flex flex-col gap-1">
            {(
              [
                ["Para", hecho.nombreDestino],
                ["Destino", hecho.destinoMostrado],
                ["Desde", `${hecho.origen.tipo} ${hecho.origen.numeroOculto}`],
                ["Saldo que te queda", soles(hecho.origen.saldo)],
                ["N.º de operación", hecho.operacion],
                ["Fecha", fechaHora(hecho.fecha)],
              ] as const
            ).map(([k, v]) => (
              <p key={k} className="flex justify-between gap-2">
                <span className="text-tenue">{k}</span>
                <b className="text-right">{v}</b>
              </p>
            ))}
          </Tarjeta>
          <div className="mt-auto flex flex-col gap-3">
            <BotonConstanciaWhatsApp
              datos={{ monto: hecho.monto, descripcion: cfg.titulo.replace("Transferencias", "Transferencia"), destinatario: hecho.nombreDestino, operacion: hecho.operacion, fecha: hecho.fecha, transferencia: true }}
            />
            <Boton href="/inicio">Volver al inicio</Boton>
            <Boton variante="fantasma" href="/transferencias">
              Hacer otra transferencia
            </Boton>
          </div>
        </>
      ) : fase !== "datos" && resumen ? (
        <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-4 shadow-sm">
          <PasosApp total={cfg.pasos} actual={actual} />
          <h2 className="text-center text-xl font-bold text-marca">Confirma tus datos</h2>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-marca-claro px-3 py-4 text-center">
            <span className="text-sm text-tenue">Monto a transferir</span>
            <span className="text-4xl font-bold">{soles(resumen.monto)}</span>
          </div>
          <dl className="flex flex-col">
            {(
              [
                ["Cuenta origen", `${resumen.origen.tipo} ${resumen.origen.numeroOculto}`],
                [cfg.etiquetaDestino, resumen.destinoMostrado],
                ["Para", resumen.nombreDestino],
                ...(cfg.moneda ? [["Moneda", "Soles"] as const] : []),
                ...(resumen.glosa ? [["Glosa", resumen.glosa] as const] : []),
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-linea/70 py-2.5 last:border-0">
                <dt className="shrink-0 text-tenue">{k}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {!resumen.saldoSuficiente && <p className="rounded-xl bg-aviso-claro px-3 py-2 font-bold">Tu cuenta no tiene saldo suficiente para este monto.</p>}
          {aviso && <p className="rounded-xl bg-error-claro px-3 py-2 font-bold">{aviso}</p>}
          <Boton data-paso="transferir" disabled={!resumen.saldoSuficiente || fase === "procesando"} onClick={() => setFase("autenticando")}>
            {fase === "procesando" ? "Transfiriendo…" : "Transferir"}
          </Boton>
          <Boton variante="fantasma" onClick={() => (setFase("datos"), setAviso(null))}>
            Corregir datos
          </Boton>
        </section>
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl bg-superficie p-4 shadow-sm">
          <PasosApp total={cfg.pasos} actual={1} />
          <h2 className="text-center text-xl font-bold text-marca">Ingresa tus datos</h2>

          <CampoApp etiqueta="Cuenta origen">
            <ElegirOpcion nombre="origen" paso="cuenta" valor={origen} onCambio={(v) => (setOrigen(v), cfg.tipo === "PROPIAS" && v === destino && setDestino(""))} opciones={cuentasPago.map(opcion)} />
          </CampoApp>

          {cfg.tipo === "PROPIAS" ? (
            <CampoApp etiqueta="Cuenta destino">
              <ElegirOpcion
                nombre="destino"
                paso="destino"
                valor={destino}
                onCambio={setDestino}
                opciones={cuentasPago.filter((k) => String(k.id) !== origen).map(opcion)}
                vacio={origen ? "No tienes otra cuenta de ahorro a la que transferir." : "Primero elige la cuenta origen."}
              />
            </CampoApp>
          ) : (
            <div className="flex flex-col gap-1.5">
              <CampoApp etiqueta={cfg.etiquetaDestino}>
                <span className="relative flex items-center">
                  {cfg.tipo === "CONTACTO" && <Smartphone className="pointer-events-none absolute left-3 h-5 w-5 text-tenue" aria-hidden />}
                  <input
                    data-paso="destino"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value.replace(/[^\d\s-]/g, ""))}
                    inputMode="numeric"
                    autoComplete={cfg.tipo === "CONTACTO" ? "tel" : "off"}
                    maxLength={cfg.tipo === "INTERBANCARIA" ? 24 : cfg.tipo === "CONTACTO" ? 11 : 20}
                    placeholder={cfg.placeholder}
                    className={`${claseCampo} ${cfg.tipo === "CONTACTO" ? "pl-10" : ""}`}
                  />
                </span>
              </CampoApp>
              {cfg.tipo === "TERCEROS" && (
                <button type="button" onClick={() => setDestino(cuentaPrueba)} className="self-start text-sm font-bold text-marca underline underline-offset-2">
                  Demo: usar una cuenta de prueba
                </button>
              )}
              {cfg.tipo === "INTERBANCARIA" && <p className="text-sm text-tenue">Son 20 números. Te lo da la otra persona o su banco.</p>}
            </div>
          )}

          <div className={cfg.moneda ? "grid grid-cols-[auto_1fr] items-end gap-3" : ""}>
            {cfg.moneda && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-marca">{cfg.moneda}</span>
                <span className="flex min-h-13 items-center gap-2 rounded-full bg-superficie-2 pr-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marca font-bold text-white">S/</span>
                  <span className="text-tenue">Soles</span>
                </span>
              </div>
            )}
            <CampoApp etiqueta="Monto a transferir">
              <input
                data-paso="monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                placeholder={cfg.moneda ? "S/ 0.00" : "0.00"}
                className={`${claseCampo} text-right`}
              />
            </CampoApp>
          </div>
          {origen && montoNum > 0 && montoNum > (cuentasPago.find((k) => String(k.id) === origen)?.saldo ?? Infinity) && (
            <p className="-mt-3 text-sm font-bold text-aviso">Es más que el saldo de tu cuenta.</p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-marca">
              Glosa <span className="font-normal text-tenue">(Opcional)</span>
            </span>
            <input value={glosa} onChange={(e) => setGlosa(e.target.value.slice(0, 100))} placeholder="Ingrese descripción" className={claseCampo} />
            {cfg.tipo === "CONTACTO" && <span className="self-end text-xs text-tenue">{glosa.length}/100</span>}
          </label>

          {cfg.terminos && (
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-marca" />
                <span className="text-sm leading-snug">
                  He leído y aceptado los <b>términos y condiciones</b> {cfg.terminos}.
                </span>
              </label>
              <button
                type="button"
                onClick={() => setVerTerminos((v) => !v)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-linea-fuerte px-4 font-bold"
              >
                <FileDown className="h-5 w-5" aria-hidden /> Descargar términos y condiciones
              </button>
              {verTerminos && <p className="rounded-xl bg-superficie-2 px-3 py-2 text-sm text-tenue">En la app de Caja Piura aquí se descarga el documento de términos y condiciones.</p>}
            </div>
          )}

          {aviso && <p className="rounded-xl bg-error-claro px-3 py-2 font-bold">{aviso}</p>}
          <Boton data-paso="continuar" disabled={!listo || enviando} onClick={continuar}>
            {enviando ? "Revisando…" : "Continuar"}
          </Boton>
        </section>
      )}

      {fase === "autenticando" && <HojaAutenticacion asistida={asistida} onOk={confirmar} onCancelar={() => setFase("revisar")} />}
    </Pantalla>
  );
}
