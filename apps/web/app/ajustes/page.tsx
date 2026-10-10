"use client";
// Dueño: Agente A. Ajustes: cambiar la vista y cerrar sesión.
import type { MeRes, Vista } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { api, esSinSesion } from "@/lib/api";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import {
  guardarRecordatorios,
  leerRecordatorios,
  OPCIONES_DIAS,
  RECORDATORIOS_INICIALES,
  type Recordatorios,
} from "@/components/retencion/recordatorios";
import { TarjetaVista } from "../_entrada/TarjetaVista";

const P = "ajustes";

export default function Ajustes() {
  const router = useRouter();
  const { vista, setVista } = useVista();
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [rec, setRec] = useState<Recordatorios>(RECORDATORIOS_INICIALES);

  useEffect(() => setRec(leerRecordatorios()), []);

  function cambiarRecordatorios(cambio: Partial<Recordatorios>) {
    track(P, "tocar");
    const nuevo = { ...rec, ...cambio };
    setRec(nuevo);
    guardarRecordatorios(nuevo);
  }

  useEffect(() => {
    track(P, "ver");
    api<MeRes>("/me")
      .then((m) => {
        setMe(m);
        if (m.vistaPreferida) setVista(m.vistaPreferida);
      })
      .catch((e) => (esSinSesion(e) ? router.replace("/entrar") : setError(e.message)));
  }, [router, setVista]);

  async function cambiar(v: Vista) {
    if (v === vista) return;
    track(P, "tocar");
    const anterior = vista;
    setVista(v);
    setAviso("");
    setError("");
    try {
      await api("/me/vista", { metodo: "PUT", cuerpo: { vista: v } });
      track(P, "completar");
      setAviso(v === "ASISTIDA" ? "Listo. Ahora verás la vista asistida." : "Listo. Ahora verás la vista estándar.");
    } catch (e) {
      setVista(anterior);
      track(P, "error");
      setError(e instanceof Error ? e.message : "No pudimos guardar el cambio.");
    }
  }

  async function salir() {
    track(P, "tocar");
    try {
      await api("/auth/logout", { metodo: "POST" });
    } catch {}
    router.replace("/");
  }

  return (
    <Pantalla titulo="Ajustes" volver="/inicio">
      {!me && !error && <Cargando />}
      {error && <MensajeError mensaje={error} />}
      {me && (
        <>
          <section role="radiogroup" aria-label="Cómo ver la app" className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">¿Cómo quieres ver la app?</h2>
            {(["ASISTIDA", "ESTANDAR"] as const).map((v) => (
              <TarjetaVista key={v} vista={v} elegida={vista === v} recomendada={me.recomendacion.vista === v} onElegir={() => cambiar(v)} />
            ))}
            {aviso && (
              <p role="status" className="font-bold text-exito">
                {aviso}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-3" aria-labelledby="titulo-recordatorios">
            <h2 id="titulo-recordatorios" className="text-xl font-bold">
              Mis recordatorios
            </h2>
            <p className="text-tenue">¿Cuándo quieres que te avisemos de un pago?</p>
            <div role="radiogroup" aria-label="Cuándo avisarme" className="grid grid-cols-2 gap-2">
              {OPCIONES_DIAS.map((o) => (
                <button
                  key={o.dias}
                  type="button"
                  role="radio"
                  aria-checked={rec.dias === o.dias}
                  onClick={() => cambiarRecordatorios({ dias: o.dias })}
                  className={`min-h-14 rounded-2xl border-2 px-2 text-lg font-bold ${rec.dias === o.dias ? "border-marca bg-marca-claro text-marca" : "border-linea bg-superficie"}`}
                >
                  {o.texto}
                </button>
              ))}
            </div>
            {(
              [
                ["cuota", "Mi cuota del crédito"],
                ["servicios", "Mis recibos (luz, agua, celular…)"],
              ] as const
            ).map(([clave, texto]) => (
              <label key={clave} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-linea bg-superficie px-4 text-lg">
                <input type="checkbox" className="h-6 w-6 accent-marca" checked={rec[clave]} onChange={(e) => cambiarRecordatorios({ [clave]: e.target.checked })} />
                {texto}
              </label>
            ))}
            <p className="text-sm text-tenue">Si un pago ya venció, siempre te lo mostramos.</p>
          </section>
          <Tarjeta>
            <p className="font-bold">{me.nombre}</p>
            {me.cuentas.map((c) => (
              <p key={c.id} className="text-tenue">
                {c.tipo} {c.numeroOculto}
              </p>
            ))}
          </Tarjeta>
        </>
      )}
      <div className="mt-auto">
        <Boton variante="peligro" onClick={salir}>
          Cerrar sesión
        </Boton>
      </div>
    </Pantalla>
  );
}
