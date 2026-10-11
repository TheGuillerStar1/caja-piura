"use client";
// Dueño: Agente D (F3: Agente G). Barra flotante de demo: "Adelantar 30 días", "Reiniciar demo", simular fallo y enlace al panel.
// Tras adelantar, muestra notificaciones simuladas estilo celular; al tocarlas lleva a /inicio (donde ya está el aviso).
import type { AdelantarRes } from "@cp/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificacionesSimuladas } from "@/components/retencion/NotificacionesSimuladas";
import { avisosEncendidos, leerRecordatorios } from "@/components/retencion/recordatorios";
import { ApiFallo, api, esSinSesion } from "@/lib/api";

const OCULTA_EN = ["/", "/entrar", "/panel"];

export default function DemoBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [sesion, setSesion] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState<null | "adelantar" | "reset">(null);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [notis, setNotis] = useState<string[]>([]);

  // Al abrir el panel, comprobar si hay sesión (para mostrar u ocultar acciones).
  useEffect(() => {
    if (!abierta) return;
    let vivo = true;
    api("/progreso")
      .then(() => vivo && setSesion(true))
      .catch((e) => vivo && setSesion(esSinSesion(e) ? false : true));
    return () => {
      vivo = false;
    };
  }, [abierta]);

  // Las notificaciones se ocultan solas después de un rato.
  useEffect(() => {
    if (!notis.length) return;
    const t = setTimeout(() => setNotis([]), 12000);
    return () => clearTimeout(t);
  }, [notis]);

  if (OCULTA_EN.includes(pathname) || pathname.startsWith("/panel") || pathname.startsWith("/gestion")) return null;

  async function adelantar() {
    setOcupado("adelantar");
    setMensaje(null);
    try {
      const r = await api<AdelantarRes>("/demo/adelantar", { metodo: "POST" });
      // Recordatorios opt-in (Manual visual): sin el sí del cliente, o si los pausó, no le llega ningún aviso.
      if (!avisosEncendidos(leerRecordatorios())) {
        setMensaje("Pasaron 30 días. No se envió aviso porque los recordatorios no están activados (actívalos en el inicio o en Ajustes).");
        return;
      }
      setAbierta(false);
      setNotis(r.notificaciones.length ? r.notificaciones : ["No tienes pagos pendientes este mes"]);
      try {
        navigator.vibrate?.(200);
      } catch {}
    } catch (e) {
      if (esSinSesion(e)) setSesion(false);
      setMensaje(e instanceof ApiFallo ? e.message : "No se pudo adelantar.");
    } finally {
      setOcupado(null);
    }
  }

  // Confirmación en el mismo panel (sin confirm() del navegador): un toque para pedir, otro para confirmar.
  async function reiniciar() {
    setConfirmando(false);
    setOcupado("reset");
    setMensaje(null);
    try {
      await api("/demo/reset", { metodo: "POST" });
      try {
        // Vista elegida, anuncio de bienvenida y datos del pago en curso: todo vuelve a cero en este celular.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("cp_"))
          .forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch {}
      window.location.assign("/");
    } catch (e) {
      if (esSinSesion(e)) setSesion(false);
      setMensaje(e instanceof ApiFallo ? e.message : "No se pudo reiniciar. Inténtalo de nuevo.");
      setOcupado(null);
    }
  }

  function irAInicio() {
    setNotis([]);
    // Si ya está en /inicio, recargar para que aparezca el aviso con la nueva fecha.
    if (pathname === "/inicio") window.location.reload();
    else router.push("/inicio");
  }

  function simularFallo() {
    const url = new URL(window.location.href);
    url.searchParams.set("fallar", "1");
    window.location.assign(url.toString());
  }

  const enConfirmacion = pathname === "/pagar/confirmar";

  return (
    <>
      <NotificacionesSimuladas mensajes={notis} alTocar={irAInicio} alCerrar={() => setNotis([])} />

      {abierta && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => {
            setAbierta(false);
            setConfirmando(false);
          }}
        >
          <div
            role="dialog"
            aria-label="Opciones de demostración"
            className="absolute left-2 top-1/2 flex -translate-y-1/2 w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-2xl border-2 border-linea bg-superficie p-3 text-base shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex items-center justify-between text-sm font-bold text-tenue">
              <span>Modo demostración</span>
              <button
                type="button"
                onClick={() => {
                  setAbierta(false);
                  setConfirmando(false);
                }}
                aria-label="Cerrar" className="min-w-12 px-2 text-xl">
                ×
              </button>
            </p>

            {sesion === null && <p className="text-sm text-tenue">Revisando sesión…</p>}
            {sesion === false && <p className="text-sm text-tenue">Entra con un cliente de demo para adelantar o reiniciar.</p>}
            {sesion && (
              <>
                <button
                  type="button"
                  onClick={adelantar}
                  disabled={!!ocupado}
                  className="rounded-boton bg-marca px-3 py-2 font-bold text-white disabled:opacity-60"
                >
                  {ocupado === "adelantar" ? "Adelantando…" : "Adelantar 30 días"}
                </button>
                {confirmando ? (
                  <div className="flex flex-col gap-2 rounded-xl border-2 border-error bg-error-claro p-2">
                    <p className="text-sm font-bold">¿Reiniciar la demo?</p>
                    <p className="text-sm">
                      Rosa, Elena y Carlos vuelven al primer día: sin pagos, cashback ni frecuentes nuevos. Los demás clientes no cambian.
                    </p>
                    <button type="button" onClick={reiniciar} className="rounded-boton bg-error px-3 py-2 font-bold text-white">
                      Sí, reiniciar
                    </button>
                    <button type="button" onClick={() => setConfirmando(false)} className="rounded-boton px-3 py-2 font-bold text-tinta underline">
                      No, volver
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(true)}
                    disabled={!!ocupado}
                    className="rounded-boton border-2 border-marca px-3 py-2 font-bold text-marca disabled:opacity-60"
                  >
                    {ocupado === "reset" ? "Reiniciando… (unos segundos)" : "Reiniciar demo"}
                  </button>
                )}
              </>
            )}

            <div className="rounded-xl bg-fondo p-2 text-sm">
              <p className="font-bold">Simular fallo en el pago</p>
              {enConfirmacion ? (
                <button type="button" onClick={simularFallo} className="mt-1 w-full rounded-boton border-2 border-error px-3 py-1 font-bold text-error">
                  Recargar esta confirmación con fallo
                </button>
              ) : (
                <p className="text-tenue">
                  En la pantalla de confirmación, agrega <code className="font-bold">&amp;fallar=1</code> a la dirección (o abre este menú ahí).
                </p>
              )}
            </div>

            {mensaje && <p className="text-sm text-error">{mensaje}</p>}

            <Link href="/panel" className="flex items-center justify-center text-sm font-bold text-marca underline underline-offset-4">
              Panel del jurado →
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-label="Abrir opciones de demostración"
        // A media altura del borde izquierdo: no tapa el encabezado ni los botones del pie (Confirmar pago, Continuar…).
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-full border border-l-0 border-linea bg-black/75 px-2 text-xs font-bold text-white shadow [writing-mode:vertical-rl]"
        style={{ minHeight: 56, minWidth: 28 }}
      >
        Demo
      </button>
    </>
  );
}
