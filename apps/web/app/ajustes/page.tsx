"use client";
// Dueño: Agente A. Ajustes: cambiar la vista y cerrar sesión.
import type { MeRes, Vista } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { api, esSinSesion } from "@/lib/api";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { TarjetaVista } from "../_entrada/TarjetaVista";

const P = "ajustes";

export default function Ajustes() {
  const router = useRouter();
  const { vista, setVista } = useVista();
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

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
