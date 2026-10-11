"use client";
// Barra superior azul de la app oficial: ☰ (menú lateral) o ‹ (volver) + título. Debajo puede ir una línea
// secundaria (p. ej. el tipo de cambio en Mis productos). El menú lateral replica el de la app: perfil, secciones
// y "Cerrar sesión" al pie.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { olvidarCliente, useCliente } from "@/lib/cliente";
import { useTema } from "@/lib/tema";
import { track } from "@/lib/track";
import { ponerVoz, vozActiva } from "@/lib/voz";
import {
  IcAtras,
  IcCambio,
  IcCampana,
  IcCasa,
  IcEngranaje,
  IcLapiz,
  IcMenu,
  IcMonedas,
  IcPagos,
  IcPlazoFijo,
  IcPreguntas,
  IcProductos,
  IcSalir,
  IcTransferencias,
} from "./IconosApp";

type Props = { titulo?: React.ReactNode; volver?: string; subtitulo?: React.ReactNode };

export function Cabecera({ titulo, volver, subtitulo }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-20 bg-marca text-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]">
        <div className="flex min-h-14 items-center gap-1 px-1">
          {volver ? (
            <Link href={volver} aria-label="Volver" className="flex w-12 items-center justify-center">
              <IcAtras />
            </Link>
          ) : (
            <button type="button" aria-label="Abrir menú" aria-expanded={abierto} onClick={() => setAbierto(true)} className="flex w-12 items-center justify-center">
              <IcMenu />
            </button>
          )}
          <h1 className="flex-1 truncate pr-1 text-xl font-medium">{titulo}</h1>
          <BotonVoz />
        </div>
        {subtitulo && <div className="px-4 pb-2.5 text-center text-sm font-medium">{subtitulo}</div>}
      </header>
      {abierto && <MenuLateral cerrar={() => setAbierto(false)} />}
    </>
  );
}

/** Silenciar o activar la voz de Pía (con texto: el manual pide no usar íconos sin etiqueta). */
function BotonVoz() {
  const [activa, setActiva] = useState(true);
  useEffect(() => {
    const f = () => setActiva(vozActiva());
    f();
    addEventListener("cp-voz", f);
    return () => removeEventListener("cp-voz", f);
  }, []);
  return (
    <button
      type="button"
      onClick={() => (track("voz", "tocar"), ponerVoz(!activa))}
      aria-pressed={!activa}
      aria-label={activa ? "Silenciar la voz de Pía" : "Activar la voz de Pía"}
      className="mr-2 flex min-h-10! shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 text-sm font-bold"
    >
      <span aria-hidden className="text-base leading-none">{activa ? "🔊" : "🔇"}</span>
      {activa ? "Voz" : "Silencio"}
    </button>
  );
}

const ITEMS = [
  { texto: "Mis productos", ruta: "/inicio", Icono: IcProductos },
  { texto: "Transferencias", ruta: "/transferencias", Icono: IcTransferencias },
  { texto: "Cambiar soles y dólares", ruta: "/servicio?n=Cambiar%20soles%20y%20d%C3%B3lares", Icono: IcCambio },
  { texto: "Pagos", ruta: "/pagos", Icono: IcPagos },
  { texto: "Plazo Fijo", ruta: "/servicio?n=Plazo%20Fijo", Icono: IcPlazoFijo },
  { texto: "Créditos", ruta: "/pagar/cuota", Icono: IcMonedas },
  { texto: "Notificaciones", ruta: "/ajustes", Icono: IcCampana },
  { texto: "Configuraciones", ruta: "/ajustes", Icono: IcEngranaje },
  { texto: "Preguntas frecuentes", ruta: "/ayuda", Icono: IcPreguntas },
];

function MenuLateral({ cerrar }: { cerrar: () => void }) {
  const me = useCliente();
  const ruta = usePathname();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  const { tema, setTema } = useTema();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [cerrar]);

  async function salir() {
    setSaliendo(true);
    track("menu-cerrar-sesion", "tocar");
    try {
      await api("/auth/logout", { metodo: "POST" });
    } catch {}
    olvidarCliente();
    router.replace("/");
  }

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-app" role="dialog" aria-modal="true" aria-label="Menú">
      <button type="button" aria-label="Cerrar menú" onClick={cerrar} className="absolute inset-0 h-full w-full bg-black/55" />
      <nav className="anim-menu absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-marca text-white shadow-2xl">
        <div className="flex items-center gap-3 px-4 pb-4 pt-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-acento text-white">
            <IcCasa />
          </span>
          <p className="flex-1 leading-tight">
            Hola,
            <br />
            <b className="font-medium">{me?.nombre ?? " "}</b>
          </p>
          <Link href="/ajustes" aria-label="Editar perfil" className="flex h-9 w-9 min-h-9! items-center justify-center rounded-full bg-acento">
            <IcLapiz className="h-4 w-4" />
          </Link>
        </div>
        <ul className="flex flex-1 flex-col overflow-y-auto pr-4">
          {ITEMS.map(({ texto, ruta: r, Icono }) => {
            const activo = r === ruta;
            return (
              <li key={texto}>
                <Link
                  href={r}
                  onClick={() => {
                    track(`menu-${texto}`, "tocar");
                    cerrar();
                  }}
                  className={`flex min-h-13 items-center gap-4 rounded-r-full pl-6 pr-4 text-[0.95rem] font-medium ${activo ? "bg-black/25" : ""}`}
                >
                  <Icono className="h-6 w-6 shrink-0 text-white/90" />
                  {texto}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => (track("menu-tema", "tocar"), setTema(tema === "claro" ? "oscuro" : "claro"))}
          className="flex min-h-14 items-center gap-4 border-t border-white/25 px-6 text-[0.95rem] font-medium"
        >
          <span aria-hidden className="w-6 text-center text-xl">{tema === "claro" ? "🌙" : "☀️"}</span>
          {tema === "claro" ? "Pantalla oscura" : "Pantalla clara"}
        </button>
        <button type="button" onClick={salir} disabled={saliendo} className="flex min-h-14 items-center gap-4 border-t border-white/25 px-6 text-[0.95rem] font-medium">
          <IcSalir className="h-6 w-6" />
          {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </nav>
      <style>{`@keyframes cp-menu{from{transform:translateX(-100%)}to{transform:none}}.anim-menu{animation:cp-menu .22s ease-out}`}</style>
    </div>
  );
}
