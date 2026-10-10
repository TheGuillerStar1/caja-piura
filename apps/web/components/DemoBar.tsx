"use client";
// Dueño: Agente D. Barra flotante de demo: "Adelantar 30 días", "Reiniciar demo", simular fallo y enlace al panel.
// Tras adelantar, muestra notificaciones simuladas estilo celular; al tocarlas lleva a /inicio (donde ya está el aviso).
import type { AdelantarRes } from "@cp/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificacionesSimuladas } from "@/components/retencion/NotificacionesSimuladas";
import { ApiFallo, api, esSinSesion } from "@/lib/api";

const OCULTA_EN = ["/", "/entrar", "/panel"];

export default function DemoBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [sesion, setSesion] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState<null | "adelantar" | "reset">(null);
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

  if (OCULTA_EN.includes(pathname) || pathname.startsWith("/panel")) return null;

  async function adelantar() {
    setOcupado("adelantar");
    setMensaje(null);
    try {
      const r = await api<AdelantarRes>("/demo/adelantar", { metodo: "POST" });
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

  async function reiniciar() {
    if (!confirm("¿Reiniciar la demo? Se borran los pagos y puntos de los clientes de demostración.")) return;
    setOcupado("reset");
    setMensaje(null);
    try {
      await api("/demo/reset", { metodo: "POST" });
      try {
        localStorage.removeItem("cp_vista");
        sessionStorage.clear();
      } catch {}
      window.location.assign("/");
    } catch (e) {
      if (esSinSesion(e)) setSesion(false);
      setMensaje(e instanceof ApiFallo ? e.message : "No se pudo reiniciar.");
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
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setAbierta(false)}>
          <div
            role="dialog"
            aria-label="Opciones de demostración"
            className="absolute bottom-36 right-2 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-2xl border-2 border-linea bg-superficie p-3 text-base shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex items-center justify-between text-sm font-bold text-tenue">
              <span>Modo demostración</span>
              <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar" className="px-2 text-xl" style={{ minHeight: 32 }}>
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
                <button
                  type="button"
                  onClick={reiniciar}
                  disabled={!!ocupado}
                  className="rounded-boton border-2 border-marca px-3 py-2 font-bold text-marca disabled:opacity-60"
                >
                  {ocupado === "reset" ? "Reiniciando…" : "Reiniciar demo"}
                </button>
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
        className="fixed bottom-24 right-2 z-40 rounded-full border border-linea bg-tinta/75 px-3 text-xs font-bold text-white shadow"
        style={{ minHeight: 32 }}
      >
        Demo
      </button>
    </>
  );
}
