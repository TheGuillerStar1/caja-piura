"use client";
// "Mis productos": réplica de la pantalla principal de la app oficial (saludo, tipo de cambio, Cuentas / Tarjetas /
// Créditos desplegables y Mis servicios). Lo único nuevo son los recordatorios de Pía arriba y, en la vista
// asistida, los accesos grandes "¿Qué necesitas hacer hoy?".
import type { Aviso, CuotaRes, InicioRes, MeRes, Sugerencia } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IcCelular, IcChevronArriba, IcCreditos, IcCuentas, IcTarjeta } from "@/components/app/IconosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { IconoCuota, IconoFrecuente, IconoRecibo } from "@/components/pago/Iconos";
import { filtrarAvisos, leerRecordatorios } from "@/components/retencion/recordatorios";
import { Boton, Cargando, Mascota, MensajeError, Pantalla } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { cargarCliente } from "@/lib/cliente";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";

type Rapido = { id: Sugerencia["id"]; texto: string; ayuda: string; ruta: string; flujo: "CUOTA" | "FRECUENTE" | "RECIBO"; Icono: (p: { className?: string }) => React.ReactNode };
const RAPIDOS: Rapido[] = [
  { id: "PAGAR_CUOTA", texto: "Pagar mi cuota", ayuda: "Tu crédito de Caja Piura", ruta: "/pagar/cuota", flujo: "CUOTA", Icono: IconoCuota },
  { id: "PAGAR_RECIBO", texto: "Pagar un recibo", ayuda: "Luz, agua o teléfono", ruta: "/pagar/recibo", flujo: "RECIBO", Icono: IconoRecibo },
  { id: "FRECUENTES", texto: "Mis pagos frecuentes", ayuda: "Lo que pagas cada mes", ruta: "/pagar/frecuentes", flujo: "FRECUENTE", Icono: IconoFrecuente },
];

/** Las sugeridas por el motor primero. */
function ordenar(sugeridos: Sugerencia[]) {
  const pos = (id: Sugerencia["id"]) => {
    const i = sugeridos.findIndex((s) => s.id === id);
    return i === -1 ? 100 : i;
  };
  return [...RAPIDOS].sort((a, b) => pos(a.id) - pos(b.id));
}

const ANUNCIO = "cp_anuncio_pia_v3";

function nombreAviso(a: Aviso) {
  return a.tipo === "CUOTA" ? "Cuota de tu crédito" : a.titulo.split(" · ")[0];
}

function cuando(a: Aviso) {
  if (a.diasRestantes < 0) return "Ya venció";
  if (a.diasRestantes === 0) return "Vence hoy";
  if (a.diasRestantes === 1) return "Vence mañana";
  return `Vence en ${a.diasRestantes} días`;
}

type Seccion = "cuentas" | "tarjetas" | "creditos";

export default function Inicio() {
  const router = useRouter();
  const { vista, asistida, setVista } = useVista();
  const [datos, setDatos] = useState<InicioRes | null>(null);
  const [me, setMe] = useState<MeRes | null>(null);
  const [cuota, setCuota] = useState<CuotaRes | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState(false);
  const [abierta, setAbierta] = useState<Seccion | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [r, m] = await Promise.all([api<InicioRes>("/inicio"), cargarCliente(true)]);
      setDatos(r);
      setMe(m);
      if (r.vista && r.vista !== vista) setVista(r.vista);
      api<CuotaRes | null>("/cuotas/proxima").then(setCuota, () => setCuota(null));
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
      track("inicio", "error");
    }
    // vista no va en dependencias: solo se sincroniza al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, setVista]);

  useEffect(() => {
    track("inicio", "ver");
    cargar();
    try {
      if (!localStorage.getItem(ANUNCIO)) setAnuncio(true);
    } catch {}
  }, [cargar]);

  const cerrarAnuncio = () => {
    setAnuncio(false);
    track("inicio", "tocar");
    try {
      localStorage.setItem(ANUNCIO, "1");
    } catch {}
  };

  const pagarAviso = (a: Aviso) => {
    const flujo = a.tipo === "CUOTA" ? "CUOTA" : a.tipo === "FRECUENTE" ? "FRECUENTE" : "RECIBO";
    iniciarFlujo(flujo);
    track("inicio", "tocar", { flujo });
    router.push(rutaConfirmar(a.tipo, a.referenciaId));
  };

  const alternar = (s: Seccion) => {
    track(`inicio-${s}`, "tocar");
    setAbierta((x) => (x === s ? null : s));
  };

  const cambio = <>Tipo de cambio ref. Compra: 3.30 Venta: 3.60</>;

  if (error || !datos || !me) {
    return (
      <Pantalla titulo={me ? `Hola, ${me.nombre}` : "Mis productos"} subtitulo={cambio} pestana="productos" sinPia>
        {error ? <MensajeError mensaje={error} reintentar={cargar} /> : <Cargando />}
      </Pantalla>
    );
  }

  const avisos = filtrarAvisos(datos.avisos, leerRecordatorios());
  const cuentas = me.cuentas;
  const filaSeccion = (s: Seccion, Icono: (p: { className?: string }) => React.ReactNode, texto: string) => (
    <button
      type="button"
      onClick={() => alternar(s)}
      aria-expanded={abierta === s}
      className={`flex w-full items-center gap-3 border-b border-linea/70 px-1 text-left ${asistida ? "min-h-16 text-lg" : "min-h-14"}`}
    >
      <Icono className="h-5 w-5 shrink-0 text-marca" />
      <span className="flex-1 font-medium">{texto}</span>
      <IcChevronArriba className={`h-5 w-5 text-marca transition-transform ${abierta === s ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <Pantalla titulo={`Hola, ${me.nombre}`} subtitulo={cambio} pestana="productos">
      <EstilosPago />

      {/* Lo nuevo: recordatorios de Pía (opt-in y configurables en Ajustes). */}
      {avisos.map((a, i) => (
        <section key={`${a.tipo}-${a.referenciaId}`} className="flex flex-col gap-3 rounded-lg border-l-4 border-acento bg-superficie p-4" aria-label="Recordatorio de pago">
          <div className="flex items-start gap-3">
            <span className="shrink-0 rounded-full bg-white p-0.5">
              <Mascota tamano={30} />
            </span>
            <div className="flex-1">
              <p className="font-bold leading-snug">{nombreAviso(a)}</p>
              <p className="text-sm font-bold text-aviso">{cuando(a)}</p>
            </div>
            <p className="text-xl font-bold">{soles(a.monto)}</p>
          </div>
          <Boton guia={asistida && i === 0} onClick={() => pagarAviso(a)} className={asistida ? "" : "min-h-11! py-2 text-base"}>
            Pagar {soles(a.monto)}
          </Boton>
        </section>
      ))}

      {asistida && (
        <section className="flex flex-col gap-3 lg:grid lg:grid-cols-3" aria-label="Qué necesitas hacer hoy">
          <h2 className="text-xl font-bold lg:col-span-3">¿Qué necesitas hacer hoy?</h2>
          {ordenar(datos.accesos).map((r, i) => (
            <Link
              key={r.id}
              href={r.ruta}
              onClick={() => (iniciarFlujo(r.flujo), track("inicio", "tocar", { flujo: r.flujo }))}
              className={`${!avisos.length && i === 0 ? "guia-toca guia-etiqueta " : ""}flex min-h-20 items-center gap-4 rounded-xl border border-linea-fuerte bg-superficie px-4 active:bg-superficie-2 lg:flex-col lg:justify-center lg:py-5 lg:text-center`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-marca text-white">
                <r.Icono className="h-7 w-7" />
              </span>
              <span className="flex-1 lg:flex-none">
                <span className="block text-xl font-bold">{r.texto}</span>
                <span className="block text-tenue">{r.ayuda}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <section aria-label="Mis productos">
        <h2 className={`${asistida ? "text-xl" : "text-lg"} mb-1 font-bold`}>Mis productos</h2>

        {filaSeccion("cuentas", IcCuentas, `Cuentas (${cuentas.length})`)}
        {abierta === "cuentas" && (
          <ul className="anim-aparece flex flex-col gap-2 py-3 md:grid md:grid-cols-2">
            {cuentas.map((c) => (
              <li key={c.id} className="rounded-lg bg-superficie px-4 py-3">
                <p className="text-sm text-tenue">
                  {c.tipo} · {c.numeroOculto}
                </p>
                <p className="text-2xl font-bold">{soles(c.saldo)}</p>
                <p className="text-xs text-tenue">Saldo disponible</p>
              </li>
            ))}
          </ul>
        )}

        {filaSeccion("tarjetas", IcTarjeta, "Tarjetas (1)")}
        {abierta === "tarjetas" && (
          <div className="anim-aparece py-3">
            <div className="flex flex-col gap-6 rounded-xl bg-gradient-to-br from-marca to-institucional p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold">Piura Cash</span>
                <span className="text-xs text-white/80">Débito</span>
              </div>
              <p className="font-mono text-lg tracking-widest">•••• •••• •••• {cuentas[0]?.numero.slice(-4) ?? "0000"}</p>
            </div>
          </div>
        )}

        {filaSeccion("creditos", IcCreditos, `Créditos (${cuota ? 1 : 0})`)}
        {abierta === "creditos" && (
          <div className="anim-aparece py-3">
            {cuota === undefined ? (
              <Cargando texto="Consultando tu crédito…" />
            ) : cuota === null ? (
              <p className="rounded-lg bg-superficie px-4 py-3 text-tenue">No tienes cuotas pendientes.</p>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg bg-superficie px-4 py-3">
                <div>
                  <p className="text-sm text-tenue">
                    Crédito {cuota.credito} · Cuota {cuota.numero} de {cuota.totalCuotas}
                  </p>
                  <p className="text-2xl font-bold">{soles(cuota.monto)}</p>
                  <p className="text-xs text-tenue">Vence el {fechaCorta(cuota.vencimiento)}</p>
                </div>
                <Boton href="/pagar/cuota" className="min-h-11! py-2 text-base">
                  Pagar cuota
                </Boton>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-label="Mis servicios">
        <h2 className={`${asistida ? "text-xl" : "text-lg"} mb-2 font-bold`}>Mis servicios</h2>
        <Link href="/servicio?n=Transferencias%20a%20contacto" className="flex items-center gap-3 px-1 py-2">
          <IcCelular className="h-10 w-10 text-marca" />
          <span className="w-28 text-sm font-bold leading-tight text-marca">Transferencias a contacto</span>
        </Link>
      </section>

      {anuncio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="anuncio-titulo">
          <div className="anim-aparece flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-superficie p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white p-1">
                <Mascota tamano={52} />
              </span>
              <h2 id="anuncio-titulo" className="text-xl font-bold leading-tight">
                Ahora tienes a Pía
              </h2>
            </div>
            <p>Tu app es la misma. Lo nuevo es el botón <b>«¿Necesitas ayuda?»</b>, abajo a la derecha.</p>
            <ul className="flex flex-col gap-2">
              <li className="flex gap-2"><span aria-hidden>✓</span>Paga tu cuota y tus recibos en 2 toques.</li>
              <li className="flex gap-2"><span aria-hidden>✓</span>Te avisa antes de que venza un pago.</li>
              <li className="flex gap-2"><span aria-hidden>🔒</span>Nunca te pide tu clave. Tú confirmas cada pago.</li>
            </ul>
            <Boton onClick={cerrarAnuncio}>Entendido</Boton>
          </div>
        </div>
      )}
    </Pantalla>
  );
}
