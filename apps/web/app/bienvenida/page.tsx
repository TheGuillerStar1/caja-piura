"use client";
// Dueño: Agente A. Bienvenida y elección de vista (fase 3), solo en el primer ingreso. El motor recomienda según el uso
// (nunca por edad ni zona); el cliente decide entre las dos vistas.
import type { MeRes, Vista } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { api, esSinSesion } from "@/lib/api";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { TarjetaVista } from "../_entrada/TarjetaVista";

const P = "bienvenida";
const otra = (v: Vista): Vista => (v === "ASISTIDA" ? "ESTANDAR" : "ASISTIDA");

export default function Bienvenida() {
  const router = useRouter();
  const { setVista } = useVista();
  const [me, setMe] = useState<MeRes | null>(null);
  const [previa, setPrevia] = useState<Vista>("ASISTIDA");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setError("");
    api<MeRes>("/me")
      .then((m) => {
        setMe(m);
        setPrevia(m.recomendacion.vista);
        setVista(m.recomendacion.vista);
      })
      .catch((e) => (esSinSesion(e) ? router.replace("/entrar") : setError(e.message)));
  }, [router, setVista]);

  useEffect(() => {
    track(P, "ver");
    cargar();
  }, [cargar]);

  function previsualizar(v: Vista) {
    track(P, "tocar");
    setPrevia(v);
    setVista(v);
  }

  async function elegir(v: Vista) {
    track(P, "tocar");
    setGuardando(true);
    try {
      await api("/me/vista", { metodo: "PUT", cuerpo: { vista: v } });
      setVista(v);
      track(P, "completar");
      router.replace("/inicio");
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      track(P, "error");
      setError(e instanceof Error ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
      setGuardando(false);
    }
  }

  if (!me) {
    return <Pantalla titulo="Elige cómo ver tu app">{error ? <MensajeError mensaje={error} reintentar={cargar} /> : <Cargando />}</Pantalla>;
  }

  const rec = me.recomendacion.vista;
  const textoVista = rec === "ASISTIDA" ? "la vista asistida" : "la vista estándar";

  return (
    <Pantalla
      titulo="Elige cómo ver tu app"
      pie={
        <div className="flex flex-col gap-2">
          <Boton guia disabled={guardando} onClick={() => elegir(rec)}>
            Continuar con la recomendada
          </Boton>
          <Boton variante="fantasma" disabled={guardando} onClick={() => elegir(otra(rec))}>
            Prefiero la otra
          </Boton>
        </div>
      }
    >
      <Mascota
        animada
        tamano={80}
        mensaje={
          <>
            Hola, {me.nombre.split(" ")[0]}. Ahora puedes elegir cómo usar Caja Piura: <b>vista estándar</b> o <b>vista asistida</b>. Yo soy <b>Pía</b> y te acompaño.
          </>
        }
      />
      {error && <MensajeError mensaje={error} />}
      <Tarjeta tono="marca">
        <p className="text-lg font-bold">Por cómo usas Caja Piura te recomendamos {textoVista}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {me.recomendacion.razones.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden="true" className="text-exito">
                ✓
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Tarjeta>
      <div role="radiogroup" aria-label="Elige cómo ver la app" className="flex flex-col gap-3">
        <p className="text-tenue">Toca una para ver cómo se ve:</p>
        {(["ASISTIDA", "ESTANDAR"] as const).map((v) => (
          <TarjetaVista key={v} vista={v} elegida={previa === v} recomendada={v === rec} onElegir={() => previsualizar(v)} />
        ))}
      </div>
      <p className="text-sm text-tenue">Puedes cambiarla cuando quieras en Ajustes.</p>
    </Pantalla>
  );
}
