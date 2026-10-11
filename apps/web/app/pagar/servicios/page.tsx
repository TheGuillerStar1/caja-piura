"use client";
// "Pago de servicios" igual que la app oficial (fotos del 10 oct), en 4 pasos:
// 1) rubro y empresa · 2) código del recibo · 3) monto y cuenta origen · 4) confirmar (pantalla de confirmación).
// Lo nuevo es un atajo dentro del flujo de siempre: si no encuentra el código, le toma una foto al recibo.
import type { MeRes, ReciboRes } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ICONO_RUBRO, largoCodigo, type ServicioOpcion } from "@/components/ia/tipos";
import { CampoApp, claseSelect, PasosApp } from "@/components/pago/PasosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";

const RUBROS: Record<string, string> = { AGUA: "Agua", LUZ: "Energía eléctrica", TELEFONIA: "Telecomunicaciones", INTERNET: "Internet" };
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
                <select data-paso="rubro" value={rubro} onChange={(e) => setRubro(e.target.value)} className={claseSelect}>
                  <option value="">Elige un rubro</option>
                  {rubros.map((r) => (
                    <option key={r} value={r}>
                      {RUBROS[r] ?? r}
                    </option>
                  ))}
                </select>
              </CampoApp>
              {me.cuentas.some((k) => !k.paraPagar) && <p className="-mt-3 text-sm text-tenue">La CTS y los depósitos a plazo fijo no se usan para pagar.</p>}
              <CampoApp etiqueta="Filtrar por empresa o institución">
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar" className={claseSelect} />
              </CampoApp>
              <ul className="flex flex-col gap-2" aria-label="Empresas">
                {empresas.map((s, k) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-paso={k === 0 ? "empresa" : undefined}
                      onClick={() => {
                        setServicio(s);
                        setCodigo("");
                        setErrorCodigo(null);
                        setPaso(2);
                      }}
                      className="flex min-h-14 w-full items-center gap-3 rounded-lg border-2 border-linea bg-superficie px-3 text-left text-lg font-bold active:bg-marca-claro"
                    >
                      <span aria-hidden className="text-2xl">
                        {ICONO_RUBRO[s.rubro] ?? "🧾"}
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
            </>
          )}

          {paso === 2 && servicio && (
            <>
              <h2 className="text-center text-xl font-bold text-marca">{servicio.empresa}</h2>
              <form data-paso="codigo" onSubmit={consultar} className="flex flex-col gap-3">
                <CampoApp etiqueta={nombreCodigo}>
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={largoCodigo(servicio.formatoCodigo)}
                    placeholder={nombreCodigo}
                    className={`${claseSelect} font-mono tracking-widest`}
                  />
                </CampoApp>
                <p className="text-sm text-tenue">{servicio.ayudaCodigo}</p>
                {errorCodigo && <p className="rounded-lg bg-error-claro px-3 py-2 font-bold text-error">{errorCodigo}</p>}
                <Boton type="submit" disabled={!codigo || consultando}>
                  {consultando ? "Buscando…" : "Buscar deuda"}
                </Boton>
              </form>
              <Link href="/pagar/recibo" className="flex min-h-12 items-center justify-center gap-2 font-bold text-marca underline underline-offset-4">
                📷 ¿No encuentras el código? Tómale una foto al recibo
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
                <select data-paso="cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={claseSelect}>
                  <option value="">Elige tu cuenta</option>
                  {me.cuentas.filter((k) => k.paraPagar).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.tipo} {k.numeroOculto} · Saldo {soles(k.saldo)}
                    </option>
                  ))}
                </select>
              </CampoApp>
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
