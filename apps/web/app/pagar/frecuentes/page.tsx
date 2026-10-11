"use client";
// Dueño: Agente B. Ruta B: mis pagos frecuentes.
import type { FrecuenteRes } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { rutaConfirmar } from "@/components/pago/almacen";
import { IconoFrecuente, IconoRecibo } from "@/components/pago/Iconos";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, marcarAyuda, track, usoAyuda } from "@/lib/track";
import { useVista } from "@/lib/vista";

const RUBRO: Record<string, string> = { LUZ: "Luz", AGUA: "Agua", TELEFONIA: "Celular", INTERNET: "Internet" };

export default function PagarFrecuentes() {
  const router = useRouter();
  const { asistida } = useVista();
  const [lista, setLista] = useState<FrecuenteRes[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await api<FrecuenteRes[]>("/frecuentes"));
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
      track("pagar-frecuentes", "error", { flujo: "FRECUENTE" });
    }
  }, [router]);

  useEffect(() => {
    // Si viene del asistente (Ayuda), la operación sigue contando como "con ayuda".
    const conAyuda = usoAyuda();
    iniciarFlujo("FRECUENTE");
    if (conAyuda) marcarAyuda();
    track("pagar-frecuentes", "ver", { flujo: "FRECUENTE" });
    cargar();
  }, [cargar]);

  const primeroConDeuda = lista?.find((f) => f.deuda)?.id;

  return (
    <Pantalla titulo="Frecuentes" pestana="frecuentes">
      {error ? (
        <MensajeError mensaje={error} reintentar={cargar} />
      ) : !lista ? (
        <Cargando texto="Buscando tus pagos…" />
      ) : (
        <>
          {asistida && lista.length > 0 && <Mascota mensaje="Toca el pago que quieres hacer." />}
          {lista.length === 0 && (
            <Tarjeta className="text-center">
              <p className="text-xl font-bold">Aún no tienes pagos frecuentes</p>
              <p className="mt-2 text-lg">Toma una foto de tu recibo y lo guardamos para la próxima.</p>
            </Tarjeta>
          )}
          <ul className="flex flex-col gap-3">
            {lista.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={!f.deuda}
                  onClick={() => {
                    track("pagar-frecuentes", "tocar", { flujo: "FRECUENTE" });
                    router.push(rutaConfirmar("FRECUENTE", f.id));
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                    f.deuda ? "border-marca/40 bg-superficie active:bg-marca-claro" : "border-linea bg-fondo"
                  } ${asistida && f.id === primeroConDeuda ? "guia-toca" : ""}`}
                >
                  <span className={`shrink-0 rounded-full p-2 ${f.deuda ? "bg-marca-claro text-marca" : "bg-linea/50 text-tenue"}`}>
                    <IconoFrecuente className="h-8 w-8" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-xl font-bold">{f.alias}</span>
                    <span className="text-tenue">
                      {f.empresa} · {RUBRO[f.rubro] ?? f.rubro}
                    </span>
                    {f.deuda ? (
                      <span className="mt-1 text-lg">
                        <b>{soles(f.deuda.monto)}</b> · vence el {fechaCorta(f.deuda.vencimiento)}
                      </span>
                    ) : (
                      <span className="mt-1 text-lg text-exito">Sin deuda pendiente</span>
                    )}
                  </span>
                  {f.deuda && <span className="text-2xl text-marca">›</span>}
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/pagar/recibo"
            onClick={() => track("pagar-frecuentes", "tocar", { flujo: "RECIBO" })}
            className="flex items-center justify-center gap-2 py-3 text-lg font-bold text-marca underline underline-offset-4"
          >
            <IconoRecibo className="h-6 w-6" />
            Agregar con foto de recibo
          </Link>
          {lista.length === 0 && (
            <Boton variante="secundario" href="/inicio">
              Volver al inicio
            </Boton>
          )}
        </>
      )}
    </Pantalla>
  );
}
