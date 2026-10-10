"use client";
// Dueño: Agente C. "¿Lo guardo? ¿Es tuyo o de otra persona?" → POST /frecuentes → el próximo mes no hace falta foto.
import type { FrecuenteRes, ReciboRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Boton, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";

const SUGERENCIAS: Record<string, { mio: string[]; otro: string[] }> = {
  LUZ: { mio: ["Mi luz", "Luz de la casa", "Luz del negocio"], otro: ["Luz de mamá", "Luz de papá", "Luz de mi hijo"] },
  AGUA: { mio: ["Mi agua", "Agua de la casa", "Agua del negocio"], otro: ["Agua de mamá", "Agua de papá", "Agua de mi hijo"] },
  TELEFONIA: { mio: ["Mi celular", "Celular del negocio"], otro: ["Celular de mamá", "Celular de mi hijo", "Celular de papá"] },
  INTERNET: { mio: ["Internet casa", "Mi internet"], otro: ["Internet de mamá", "Internet de mi hijo"] },
};
const GENERICAS = { mio: ["Mi recibo", "Recibo de la casa"], otro: ["Recibo de mamá", "Recibo de papá"] };

export function GuardarFrecuente({ reciboId }: { reciboId: number }) {
  const router = useRouter();
  const { asistida } = useVista();
  const [recibo, setRecibo] = useState<ReciboRes | null>(null);
  const [esPropio, setEsPropio] = useState<boolean | null>(null);
  const [alias, setAlias] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("guardar-frecuente", "ver", { flujo: "RECIBO" });
    if (!Number.isInteger(reciboId)) return;
    api<ReciboRes>(`/recibos/por-id/${reciboId}`)
      .then(setRecibo)
      .catch((e) => esSinSesion(e) && router.replace("/entrar"));
  }, [reciboId, router]);

  const lista = recibo ? (SUGERENCIAS[recibo.rubro] ?? GENERICAS) : GENERICAS;
  const chips = esPropio === null ? [] : esPropio ? lista.mio : lista.otro;

  function elegir(propio: boolean) {
    track("guardar-frecuente", "tocar", { flujo: "RECIBO" });
    setEsPropio(propio);
    setAlias((propio ? lista.mio : lista.otro)[0] ?? "");
  }

  async function guardar() {
    if (esPropio === null || !alias.trim() || !Number.isInteger(reciboId)) return;
    setGuardando(true);
    setError(null);
    track("guardar-frecuente", "tocar", { flujo: "RECIBO" });
    try {
      await api<FrecuenteRes>("/frecuentes", { cuerpo: { reciboId, alias: alias.trim().slice(0, 40), esPropio } });
      track("guardar-frecuente", "completar", { flujo: "RECIBO" });
      setListo(true);
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      track("guardar-frecuente", "error", { flujo: "RECIBO" });
      setError(e instanceof ApiFallo ? e.message : "No pude guardarlo. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (listo) {
    return (
      <Pantalla titulo="Guardado">
        <Mascota animada mensaje={asistida ? "¡Listo! El próximo mes ya no necesitas foto." : "Guardado. La próxima vez, sin foto."} />
        <Tarjeta tono="exito" className="text-center">
          <p className="text-2xl font-bold">“{alias.trim()}”</p>
          <p className="mt-1 text-lg">Lo encuentras en Mis pagos frecuentes.</p>
        </Tarjeta>
        <Boton guia={asistida} href="/inicio">
          Ir al inicio
        </Boton>
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo="¿Lo guardo?" volver="/inicio">
      <Mascota
        mensaje={
          asistida
            ? recibo
              ? `¿Guardo tu recibo de ${recibo.empresa} para la próxima? Así ya no necesitas foto.`
              : "¿Guardo este recibo para la próxima? Así ya no necesitas foto."
            : `¿Guardar${recibo ? ` ${recibo.empresa}` : ""} en tus pagos frecuentes?`
        }
      />
      {error && <MensajeError mensaje={error} />}

      <h2 className="text-xl font-bold">¿Es tuyo o de otra persona?</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { propio: true, texto: "Mío" },
          { propio: false, texto: "De otra persona" },
        ].map((o) => (
          <button
            key={o.texto}
            type="button"
            aria-pressed={esPropio === o.propio}
            onClick={() => elegir(o.propio)}
            className={`min-h-20 rounded-2xl border-2 p-3 text-xl font-bold ${
              esPropio === o.propio ? "border-marca bg-marca text-white" : "border-marca bg-superficie text-marca active:bg-marca-claro"
            } ${asistida && esPropio === null && o.propio ? "guia-toca" : ""}`}
          >
            {o.texto}
          </button>
        ))}
      </div>

      {esPropio !== null && (
        <>
          <label htmlFor="alias" className="text-xl font-bold">
            Ponle un nombre
          </label>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAlias(c)}
                className={`rounded-full border-2 px-4 py-2 text-lg ${alias === c ? "border-marca bg-marca-claro font-bold text-marca" : "border-linea bg-superficie"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            id="alias"
            value={alias}
            maxLength={40}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Por ejemplo: Luz de mamá"
            className="min-h-14 rounded-2xl border-2 border-linea bg-superficie px-4 text-xl focus:border-marca focus:outline-none"
          />
          <Boton guia={asistida} disabled={!alias.trim() || guardando} onClick={guardar}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </>
      )}

      <Boton
        variante="fantasma"
        onClick={() => {
          track("guardar-frecuente", "abandonar", { flujo: "RECIBO" });
          router.push("/inicio");
        }}
      >
        No, gracias
      </Boton>
    </Pantalla>
  );
}
