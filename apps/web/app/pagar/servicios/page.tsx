"use client";
// "Pago de servicios" igual que la app oficial (fotos del 10 oct), en 4 pasos:
// 1) rubro y empresa · 2) código del recibo · 3) monto y cuenta origen · 4) confirmar (pantalla de confirmación).
// Lo nuevo es un atajo dentro del flujo de siempre: si no encuentra el código, le toma una foto al recibo.
import { Camera, ChevronRight, X } from "lucide-react";
import type { MeRes, ReciboRes } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconoRubro } from "@/components/ia/IconoRubro";
import { largoCodigo, type ServicioOpcion } from "@/components/ia/tipos";
import { TecladoCodigo } from "@/components/ia/TecladoCodigo";
import { ElegirOpcion } from "@/components/pago/ElegirOpcion";
import { CampoApp, claseSelect, PasosApp } from "@/components/pago/PasosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";

const RUBROS: Record<string, string> = { AGUA: "Agua", LUZ: "Energía eléctrica", TELEFONIA: "Telecomu\u00ADnicaciones", INTERNET: "Internet" };
/** Servicio que ofrece cada empresa (ventana «Elige un servicio» de la app oficial). */
const SERVICIO_DE: Record<string, string> = { AGUA: "Pago de agua", LUZ: "Pago de luz", TELEFONIA: "Pago de recibo móvil", INTERNET: "Pago de internet" };
/** Cómo se llama el código en el recibo de cada rubro. */
const NOMBRE_CODIGO: Record<string, string> = {
  AGUA: "Código de suministro",
  LUZ: "Código de suministro",
  TELEFONIA: "Número de celular",
  INTERNET: "Código de cliente",
};

export default function PagoServicios() {
  const router = useRouter();
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState(1);
  const [rubro, setRubro] = useState("");
  const [buscar, setBuscar] = useState("");
  const [servicio, setServicio] = useState<ServicioOpcion | null>(null);
  const [eligiendo, setEligiendo] = useState<ServicioOpcion | null>(null);
  const [codigo, setCodigo] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<ReciboRes | null>(null);
  const [cuenta, setCuenta] = useState("");

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [s, m] = await Promise.all([api<ServicioOpcion[]>("/recibos/servicios"), api<MeRes>("/me")]);
      setServicios(s);
      setMe(m);
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
    }
  }, [router]);

  useEffect(() => {
    iniciarFlujo("RECIBO");
    track("pagar-servicios", "ver", { flujo: "RECIBO" });
    cargar();
  }, [cargar]);

  const rubros = useMemo(() => [...new Set((servicios ?? []).map((s) => s.rubro))], [servicios]);
  const empresas = (servicios ?? []).filter(
    (s) => (!rubro || s.rubro === rubro) && (!buscar.trim() || s.empresa.toLowerCase().includes(buscar.trim().toLowerCase())),
  );

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!servicio) return;
    setConsultando(true);
    setErrorCodigo(null);
    try {
      const r = await api<ReciboRes>(`/recibos/${codigo.replace(/\D/g, "")}?servicioId=${servicio.id}`);
      setRecibo(r);
      setPaso(3);
      track("pagar-servicios", "tocar", { flujo: "RECIBO" });
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setErrorCodigo(e instanceof ApiFallo ? e.message : "No pudimos consultar el recibo. Vuelve a intentar.");
    } finally {
      setConsultando(false);
    }
  }

  const atras = paso === 1 ? "/pagos" : undefined;
  const nombreCodigo = servicio ? (NOMBRE_CODIGO[servicio.rubro] ?? "Código de cliente") : "Código";

  return (
    <Pantalla titulo="Pago de servicios" volver={atras ?? "/pagos"}>
      {error ? (
        <MensajeError mensaje={error} reintentar={cargar} />
      ) : !servicios || !me ? (
        <Cargando texto="Cargando empresas…" />
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl bg-superficie p-4 shadow-sm">
          <PasosApp total={4} actual={paso} />

          {paso === 1 && (
            <>
              <h2 className="text-center text-xl font-bold text-marca">Ingresa tus datos</h2>
              <CampoApp etiqueta="Filtrar por rubro">
                <div role="radiogroup" data-paso="rubro" className="grid grid-cols-2 gap-2">
                  {rubros.map((r) => (
                    <label
                      key={r}
                      className={`flex min-h-13 min-w-0 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 font-bold leading-tight ${rubro === r ? "border-marca bg-marca-claro" : "border-linea bg-superficie"}`}
                    >
                      <input type="radio" name="rubro" checked={rubro === r} onChange={() => setRubro(r)} className="sr-only" />
                      <IconoRubro rubro={r} className="h-5 w-5 shrink-0 text-marca" />
                      <span className="min-w-0 break-words">{RUBROS[r] ?? r}</span>
                    </label>
                  ))}
                </div>
              </CampoApp>
              <CampoApp etiqueta="Filtrar por empresa o institución">
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar" className={claseSelect} />
              </CampoApp>
              <ul className="flex flex-col gap-2" aria-label="Empresas">
                {empresas.map((s, k) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-paso={k === 0 ? "empresa" : undefined}
                      onClick={() => setEligiendo(s)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-lg border-2 border-linea bg-superficie px-3 text-left text-lg font-bold active:bg-marca-claro"
                    >
                      <span aria-hidden className="text-2xl">
                        <IconoRubro rubro={s.rubro} className="h-6 w-6 text-marca" />
                      </span>
                      <span className="flex-1">{s.empresa}</span>
                      <span aria-hidden className="text-2xl text-marca">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="rounded-lg bg-marca-claro px-3 py-2 text-sm">ⓘ Este servicio podría estar sujeto al cobro de comisión.</p>
              {eligiendo && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="elige-servicio">
                  <div className="flex w-full max-w-app flex-col gap-3 rounded-t-2xl bg-superficie p-4 shadow-2xl sm:rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h3 id="elige-servicio" className="text-lg font-bold text-marca">
                        Elige un servicio
                      </h3>
                      <button type="button" onClick={() => setEligiendo(null)} className="flex min-h-11 items-center gap-1 rounded-lg px-2 font-bold text-tenue">
                        <X className="h-5 w-5" aria-hidden /> Cerrar
                      </button>
                    </div>
                    <p className="text-sm text-tenue">{eligiendo.empresa}</p>
                    <button
                      type="button"
                      data-paso="servicio"
                      onClick={() => {
                        setServicio(eligiendo);
                        setEligiendo(null);
                        setCodigo("");
                        setErrorCodigo(null);
                        setPaso(2);
                      }}
                      className="flex min-h-14 items-center justify-between rounded-lg border-2 border-linea px-3 text-left text-lg font-bold uppercase active:bg-marca-claro"
                    >
                      {SERVICIO_DE[eligiendo.rubro] ?? "Pago de recibo"}
                      <ChevronRight className="h-6 w-6 shrink-0 text-marca" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {paso === 2 && servicio && (
            <>
              <h2 className="text-center text-xl font-bold text-marca">{servicio.empresa}</h2>
              <form data-paso="codigo" onSubmit={consultar} className="flex flex-col gap-3">
                <p className="text-sm font-bold text-marca">{nombreCodigo}</p>
                <TecladoCodigo valor={codigo} largo={largoCodigo(servicio.formatoCodigo)} onCambio={setCodigo} etiqueta={nombreCodigo} />
                <p className="text-sm text-tenue">{servicio.ayudaCodigo}</p>
                {errorCodigo && <p className="rounded-lg bg-error-claro px-3 py-2 font-bold text-error">{errorCodigo}</p>}
                <Boton type="submit" disabled={!codigo || consultando}>
                  {consultando ? "Buscando…" : "Buscar deuda"}
                </Boton>
              </form>
              <Link href="/pagar/recibo" className="flex min-h-12 items-center justify-center gap-2 font-bold text-marca underline underline-offset-4">
                <Camera className="h-5 w-5 shrink-0" aria-hidden /> ¿No encuentras el código? Tómale una foto al recibo
              </Link>
              <button type="button" onClick={() => setPaso(1)} className="min-h-11 font-bold text-tenue underline underline-offset-4">
                Elegir otra empresa
              </button>
            </>
          )}

          {paso === 3 && recibo && (
            <>
              <h2 className="text-center text-xl font-bold text-marca">Revisa tu recibo</h2>
              <div className="rounded-xl border-2 border-linea p-3">
                <p className="text-sm text-tenue">
                  {recibo.empresa} · {nombreCodigo} {recibo.codigo}
                </p>
                <p className="font-bold">{recibo.titularOculto}</p>
                <p className="text-3xl font-bold">{soles(recibo.monto)}</p>
                <p className="text-sm text-tenue">Vence el {fechaCorta(recibo.vencimiento)}</p>
              </div>
              <CampoApp etiqueta="Cuenta origen" ayuda="Es la cuenta de la que sale el dinero para pagar.">
                <ElegirOpcion
                  nombre="cuenta"
                  paso="cuenta"
                  valor={cuenta}
                  onCambio={setCuenta}
                  opciones={me.cuentas.filter((k) => k.paraPagar).map((k) => ({ valor: String(k.id), texto: `${k.tipo} ${k.numeroOculto}`, detalle: `Saldo ${soles(k.saldo)}` }))}
                />
              </CampoApp>
              {me.cuentas.some((k) => !k.paraPagar) && <p className="-mt-3 text-sm text-tenue">La CTS y los depósitos a plazo fijo no se usan para pagar.</p>}
              <Boton
                data-paso="continuar"
                disabled={!cuenta}
                onClick={() => {
                  track("pagar-servicios", "tocar", { flujo: "RECIBO" });
                  router.push(`${rutaConfirmar("RECIBO", recibo.id)}&cuenta=${cuenta}`);
                }}
              >
                Continuar
              </Boton>
              <button type="button" onClick={() => setPaso(2)} className="min-h-11 font-bold text-tenue underline underline-offset-4">
                Cambiar el código
              </button>
            </>
          )}
        </section>
      )}
      {paso === 1 && !error && servicios && (
        <Tarjeta className="text-sm text-tenue">En esta demo están las empresas de los recibos de prueba (luz, agua y telefonía).</Tarjeta>
      )}
    </Pantalla>
  );
}
