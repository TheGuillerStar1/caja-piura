"use client";
// "Mis productos": réplica de la pantalla principal de la app oficial (saludo, tipo de cambio, Cuentas / Tarjetas /
// Créditos desplegables y Mis servicios). Lo único nuevo son los recordatorios de Pía arriba y, en la vista
// asistida, los accesos grandes "¿Qué necesitas hacer hoy?".
import { X } from "lucide-react";
import type { Aviso, CuotaRes, InicioRes, MeRes } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CuentaConMovimientos } from "@/components/app/CuentaConMovimientos";
import { IcCelular, IcChevronArriba, IcCreditos, IcCuentas, IcTarjeta } from "@/components/app/IconosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { filtrarAvisos, guardarRecordatorios, leerRecordatorios, RECORDATORIOS_INICIALES, type Recordatorios } from "@/components/retencion/recordatorios";
import { Boton, Cargando, Mascota, MensajeError, Pantalla } from "@/components/ui";
import { Foco } from "@/components/ui/Foco";
import { leerGuia } from "@/lib/guiaPasos";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { cargarCliente } from "@/lib/cliente";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";

const ANUNCIO = "cp_anuncio_pia_v3";
const FOCO = "cp_foco_pia";

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
  const [rec, setRec] = useState<Recordatorios>(RECORDATORIOS_INICIALES);
  const [focoPia, setFocoPia] = useState(false);
  const [guiaActiva, setGuiaActiva] = useState(false);
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
    setRec(leerRecordatorios());
    setGuiaActiva(Boolean(leerGuia()));
    try {
      if (!sessionStorage.getItem(FOCO)) setFocoPia(true);
    } catch {}
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

  // Manual visual (retención): «Tu próxima cuota vence el 12. ¿Quieres que te recordemos?». Se pregunta una sola vez.
  const cerrarFoco = () => {
    setFocoPia(false);
    track("inicio-foco-pia", "tocar");
    try {
      sessionStorage.setItem(FOCO, "1");
    } catch {}
  };

  const decidirAvisos = (si: boolean) => {
    track("inicio-avisos", "tocar");
    const nuevo = { ...rec, activos: si, pausados: false };
    setRec(nuevo);
    guardarRecordatorios(nuevo);
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

  const avisos = filtrarAvisos(datos.avisos, rec);
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

      {/* Vista asistida: el inicio es el mismo de siempre; todo se oscurece y solo queda resaltado «¿Necesitas ayuda?». */}
      {asistida && focoPia && !guiaActiva && (
        <Foco selector='[data-paso="pia"]' mensaje="¿Necesitas ayuda? Toca aquí para que te acompañemos." alSalir={cerrarFoco} />
      )}

      {/* Primera vez: Pía se presenta sin tapar la pantalla (Manual: nada de ventanas que bloqueen operaciones). */}
      {anuncio && !asistida && (
        <section aria-labelledby="anuncio-titulo" className="anim-aparece flex flex-col gap-3 rounded-2xl border-2 border-marca bg-marca-claro p-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 rounded-full bg-white p-0.5">
              <Mascota tamano={44} />
            </span>
            <div className="flex-1">
              <h2 id="anuncio-titulo" className="text-lg font-bold leading-tight">
                Ahora tienes a Pía
              </h2>
              <p className="mt-1 leading-snug">¿Necesitas ayuda? Toca aquí para que te acompañemos.</p>
            </div>
            <button
              type="button"
              onClick={cerrarAnuncio}
              aria-label="Cerrar el aviso de Pía"
              className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl border-2 border-linea-fuerte bg-superficie px-3 text-base font-bold"
            >
              <X className="h-5 w-5" aria-hidden /> Cerrar
            </button>
          </div>
          <Boton href="/ayuda" onClick={cerrarAnuncio}>
            ¿Necesitas ayuda?
          </Boton>
        </section>
      )}

      {rec.activos === null && cuota && (
        <section aria-labelledby="pregunta-avisos" className="flex flex-col gap-3 rounded-2xl border-2 border-linea bg-superficie p-4">
          <p id="pregunta-avisos" className="text-lg font-bold leading-snug">
            Tu próxima cuota vence el {fechaCorta(cuota.vencimiento)}. ¿Quieres que te recordemos?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton onClick={() => decidirAvisos(true)}>Sí, recuérdame</Boton>
            <Boton variante="secundario" onClick={() => decidirAvisos(false)}>
              No, gracias
            </Boton>
          </div>
          <p className="text-sm text-tenue">Lo puedes cambiar o pausar en Ajustes.</p>
        </section>
      )}

      {/* Lo nuevo: recordatorios de Pía (opt-in y configurables en Ajustes). */}
      {avisos.map((a) => (
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
          <Boton onClick={() => pagarAviso(a)} className={asistida ? "" : "min-h-11! py-2 text-base"}>
            Pagar {soles(a.monto)}
          </Boton>
        </section>
      ))}

      <section aria-label="Mis productos">
        <h2 className={`${asistida ? "text-xl" : "text-lg"} mb-1 font-bold`}>Mis productos</h2>

        {filaSeccion("cuentas", IcCuentas, `Cuentas (${cuentas.length})`)}
        {abierta === "cuentas" && (
          <ul className="anim-aparece flex flex-col gap-2 py-3">
            {cuentas.map((c) => (
              <CuentaConMovimientos key={c.id} cuenta={c} grande={asistida} />
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
                <Boton href="/pagar/creditos" className="min-h-11! py-2 text-base">
                  Pagar cuota
                </Boton>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-label="Mis servicios">
        <h2 className={`${asistida ? "text-xl" : "text-lg"} mb-2 font-bold`}>Mis servicios</h2>
        <Link href="/transferir/contacto" className="flex items-center gap-3 px-1 py-2">
          <IcCelular className="h-10 w-10 text-marca" />
          <span className="w-28 text-sm font-bold leading-tight text-marca">Transferencias a contacto</span>
        </Link>
      </section>

    </Pantalla>
  );
}
