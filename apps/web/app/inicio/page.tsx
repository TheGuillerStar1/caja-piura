"use client";
// Dueño: Agente B. Fase 4: inicio con avisos proactivos y accesos según la vista.
import type { Aviso, Cuenta, InicioRes, MeRes, Sugerencia } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { rutaConfirmar } from "@/components/pago/almacen";
import { EstilosPago } from "@/components/pago/EstilosPago";
import {
  IconoAjustes,
  IconoAyuda,
  IconoCuota,
  IconoFrecuente,
  IconoProgreso,
  IconoRecibo,
  IconoSaldo,
} from "@/components/pago/Iconos";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";

type IdAcceso = Sugerencia["id"] | "AJUSTES";
type Acceso = { id: IdAcceso; texto: string; ruta?: string; Icono: (p: { className?: string }) => React.ReactNode };

const ACCESOS: Record<IdAcceso, Acceso> = {
  PAGAR_CUOTA: { id: "PAGAR_CUOTA", texto: "Pagar mi cuota", ruta: "/pagar/cuota", Icono: IconoCuota },
  FRECUENTES: { id: "FRECUENTES", texto: "Mis pagos frecuentes", ruta: "/pagar/frecuentes", Icono: IconoFrecuente },
  PAGAR_RECIBO: { id: "PAGAR_RECIBO", texto: "Pagar un recibo", ruta: "/pagar/recibo", Icono: IconoRecibo },
  AYUDA: { id: "AYUDA", texto: "Ayuda", ruta: "/ayuda", Icono: IconoAyuda },
  VER_SALDO: { id: "VER_SALDO", texto: "Ver mi saldo", Icono: IconoSaldo },
  PROGRESO: { id: "PROGRESO", texto: "Mi progreso", ruta: "/progreso", Icono: IconoProgreso },
  AJUSTES: { id: "AJUSTES", texto: "Ajustes", ruta: "/ajustes", Icono: IconoAjustes },
};
const BASICOS: IdAcceso[] = ["PAGAR_CUOTA", "FRECUENTES", "PAGAR_RECIBO", "AYUDA"];
const ESTANDAR: IdAcceso[] = ["PAGAR_CUOTA", "FRECUENTES", "PAGAR_RECIBO", "VER_SALDO", "PROGRESO", "AYUDA", "AJUSTES"];

/** Ordena los accesos según las sugerencias del motor (las sugeridas primero). */
function ordenar(ids: IdAcceso[], sugeridos: Sugerencia[]) {
  const pos = (id: IdAcceso) => {
    const i = sugeridos.findIndex((s) => s.id === id);
    return i === -1 ? 100 + ids.indexOf(id) : i;
  };
  return [...ids].sort((a, b) => pos(a) - pos(b));
}

const ANUNCIO = "cp_anuncio_nuevo_v1";
const FLUJO_ACCESO: Partial<Record<IdAcceso, "CUOTA" | "FRECUENTE" | "RECIBO">> = {
  PAGAR_CUOTA: "CUOTA",
  FRECUENTES: "FRECUENTE",
  PAGAR_RECIBO: "RECIBO",
};

function cuando(a: Aviso) {
  if (a.diasRestantes < 0) return "Ya venció";
  if (a.diasRestantes === 0) return "Vence hoy";
  if (a.diasRestantes === 1) return "Vence mañana";
  return `Vence en ${a.diasRestantes} días`;
}

export default function Inicio() {
  const router = useRouter();
  const { vista, asistida, setVista } = useVista();
  const [datos, setDatos] = useState<InicioRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null | "cargando">(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await api<InicioRes>("/inicio");
      setDatos(r);
      if (r.vista && r.vista !== vista) setVista(r.vista);
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "Ocurrió un error. Inténtalo de nuevo.");
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

  const verSaldo = async () => {
    track("inicio", "tocar");
    if (cuenta && cuenta !== "cargando") return setCuenta(null);
    setCuenta("cargando");
    try {
      const me = await api<MeRes>("/me");
      setCuenta(me.cuentas[0] ?? null);
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setCuenta(null);
    }
  };

  const tocarAcceso = (a: Acceso) => {
    const flujo = FLUJO_ACCESO[a.id];
    track("inicio", "tocar", flujo ? { flujo } : {});
  };

  if (error) {
    return (
      <Pantalla>
        <MensajeError mensaje={error} reintentar={cargar} />
      </Pantalla>
    );
  }
  if (!datos) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  const ids = ordenar(asistida ? BASICOS : ESTANDAR, datos.accesos);
  const accesos = ids.map((id) => ACCESOS[id]);
  const fraseMascota = datos.avisos.length
    ? "Tienes un pago cerca. Toca Pagar y listo."
    : "¿Qué quieres hacer hoy? Toca un botón.";

  return (
    <Pantalla>
      <EstilosPago />
      <header className="flex items-center justify-between gap-3">
        <h1 className={`${asistida ? "text-3xl" : "text-2xl"} font-bold`}>{datos.saludo}</h1>
        {!asistida && <span className="text-sm text-tenue">Caja Piura</span>}
      </header>

      {datos.avisos.map((a) => (
        <Tarjeta key={`${a.tipo}-${a.referenciaId}`} tono="aviso" className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-aviso">{cuando(a)}</p>
            <p className="text-xl font-bold leading-snug">{a.titulo}</p>
            <p className="mt-1 text-3xl font-bold">{soles(a.monto)}</p>
          </div>
          <Boton guia={asistida} onClick={() => pagarAviso(a)}>
            Pagar
          </Boton>
        </Tarjeta>
      ))}

      {asistida && <Mascota animada mensaje={fraseMascota} />}

      {asistida ? (
        <nav className="grid grid-cols-2 gap-3" aria-label="Qué quieres hacer">
          {accesos.map((a) => (
            <Link
              key={a.id}
              href={a.ruta!}
              onClick={() => tocarAcceso(a)}
              className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-marca/30 bg-superficie p-3 text-center text-xl font-bold leading-tight text-marca active:bg-marca-claro"
            >
              <a.Icono className="h-12 w-12" />
              {a.texto}
            </Link>
          ))}
        </nav>
      ) : (
        <>
          <nav className="grid grid-cols-3 gap-2" aria-label="Accesos">
            {accesos.map((a) => {
              const clases =
                "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-linea bg-superficie p-2 text-center text-sm font-bold leading-tight text-tinta active:bg-marca-claro";
              const contenido = (
                <>
                  <a.Icono className="h-8 w-8 text-marca" />
                  {a.texto}
                </>
              );
              return a.ruta ? (
                <Link key={a.id} href={a.ruta} onClick={() => tocarAcceso(a)} className={clases}>
                  {contenido}
                </Link>
              ) : (
                <button key={a.id} type="button" onClick={verSaldo} className={clases} aria-expanded={Boolean(cuenta)}>
                  {contenido}
                </button>
              );
            })}
          </nav>
          {cuenta === "cargando" ? (
            <Cargando texto="Consultando tu saldo…" />
          ) : (
            cuenta && (
              <Tarjeta tono="marca" className="anim-aparece">
                <p className="text-tenue">
                  {cuenta.tipo} {cuenta.numeroOculto}
                </p>
                <p className="text-3xl font-bold">{soles(cuenta.saldo)}</p>
                <p className="text-sm text-tenue">Saldo disponible</p>
              </Tarjeta>
            )
          )}
        </>
      )}

      {anuncio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-4" role="dialog" aria-modal="true" aria-labelledby="anuncio-titulo">
          <div className="anim-aparece flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-superficie p-5 shadow-2xl">
            <Mascota tamano={64} />
            <h2 id="anuncio-titulo" className="text-2xl font-bold">
              Te damos la bienvenida al nuevo Caja Piura
            </h2>
            <ul className="flex flex-col gap-2 text-lg">
              <li>• Tus pagos ahora toman 2 toques.</li>
              <li>• Te avisamos antes de que venza tu cuota.</li>
              <li>• Siempre confirmas tú. Nunca te pediremos tu clave por mensaje.</li>
            </ul>
            <Boton onClick={cerrarAnuncio}>Entendido</Boton>
          </div>
        </div>
      )}
    </Pantalla>
  );
}
