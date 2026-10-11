"use client";
// Dueño: Agente D. Progreso del cliente: puntos, beneficios, pagos del mes, visitas ahorradas y avance del crédito.
import { Check, Star } from "lucide-react";
import type { ProgresoRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BENEFICIOS, proximoBeneficio } from "@/components/retencion/beneficios";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta } from "@/lib/formato";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function ProgresoPage() {
  const router = useRouter();
  const { asistida, setVista } = useVista();
  const [datos, setDatos] = useState<ProgresoRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<"ver" | "cambiando" | "oculta">("ver");

  const cargar = useCallback(() => {
    setError(null);
    api<ProgresoRes>("/progreso")
      .then(setDatos)
      .catch((e) => {
        if (esSinSesion(e)) router.replace("/entrar");
        else setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tu progreso.");
      });
  }, [router]);

  useEffect(() => {
    track("progreso", "ver");
    cargar();
  }, [cargar]);

  async function probarEstandar() {
    track("progreso", "tocar");
    setSugerencia("cambiando");
    try {
      await api("/me/vista", { metodo: "PUT", cuerpo: { vista: "ESTANDAR" } });
      setVista("ESTANDAR");
      setSugerencia("oculta");
    } catch (e) {
      setSugerencia("ver");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cambiar la vista.");
    }
  }

  return (
    <Pantalla titulo="Mi progreso" volver="/para-ti">
      {!datos && !error && <Cargando texto="Cargando tu progreso…" />}
      {error && <MensajeError mensaje={error} reintentar={cargar} />}
      {datos && (
        <>
          {asistida && (
            <Mascota
              mensaje={datos.pagosDigitalesMes > 0 ? "¡Vas muy bien! Cada pago desde tu celular suma puntos." : "Paga desde tu celular y gana puntos."}
            />
          )}

          <Puntos puntos={datos.puntosTotal} />

          <div className="grid grid-cols-2 gap-3">
            <Tarjeta tono="exito" className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-exito">{datos.pagosDigitalesMes}</span>
              <span className="leading-snug">{datos.pagosDigitalesMes === 1 ? "pago desde el celular este mes" : "pagos desde el celular este mes"}</span>
            </Tarjeta>
            <Tarjeta tono="marca" className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-marca">{datos.visitasAhorradas}</span>
              <span className="leading-snug">
                {datos.visitasAhorradas === 1 ? "visita a la agencia que te ahorraste" : "visitas a la agencia que te ahorraste"}
              </span>
            </Tarjeta>
          </div>

          {datos.totalCuotas > 0 && <Credito restantes={datos.cuotasRestantes} total={datos.totalCuotas} />}

          {datos.sugerirVistaEstandar && sugerencia !== "oculta" && (
            <Tarjeta tono="aviso" className="flex flex-col gap-3">
              <p className="text-lg font-bold">Ya pagas sin ayuda. ¡Muy bien!</p>
              <p>¿Quieres probar la vista estándar? Tiene más opciones en una sola pantalla. Puedes volver cuando quieras desde Ajustes.</p>
              <Boton onClick={probarEstandar} disabled={sugerencia === "cambiando"}>
                {sugerencia === "cambiando" ? "Cambiando…" : "Probar"}
              </Boton>
              <Boton
                variante="fantasma"
                onClick={() => {
                  track("progreso", "tocar");
                  setSugerencia("oculta");
                }}
              >
                Seguir como estoy
              </Boton>
            </Tarjeta>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Beneficios</h2>
            <ul className="flex flex-col gap-2">
              {BENEFICIOS.map((b) => {
                const logrado = datos.puntosTotal >= b.puntos;
                return (
                  <li
                    key={b.nombre}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${logrado ? "border-exito/40 bg-exito-claro" : "border-linea bg-superficie"}`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        logrado ? "bg-exito text-white" : "bg-fondo text-tenue"
                      }`}
                    >
                      {logrado ? <Check className="h-4 w-4" aria-hidden /> : <Star className="h-4 w-4" aria-hidden />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold">{b.nombre}</span>
                      <span className="block text-sm text-tenue">{b.detalle}</span>
                    </span>
                    <span className={`text-sm font-bold ${logrado ? "text-exito" : "text-tenue"}`}>{logrado ? "¡Logrado!" : `${b.puntos} pts`}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-tenue">Una tasa preferente sería una propuesta sujeta a evaluación crediticia.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Tus puntos</h2>
            {datos.historial.length === 0 ? (
              <p className="text-tenue">Aún no tienes puntos. Haz tu primer pago desde el celular y gana 10 puntos.</p>
            ) : (
              <ul className="divide-y divide-linea rounded-2xl border-2 border-linea bg-superficie">
                {datos.historial.map((h, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1">
                      <span className="block">{h.descripcion}</span>
                      <span className="block text-sm text-tenue">{fechaCorta(h.fecha)}</span>
                    </span>
                    <span className="font-bold text-exito">+{h.puntos}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Boton variante="secundario" href="/inicio">
            Volver al inicio
          </Boton>
        </>
      )}
    </Pantalla>
  );
}

function Puntos({ puntos }: { puntos: number }) {
  const prox = proximoBeneficio(puntos);
  return (
    <Tarjeta tono="marca" className="flex flex-col gap-3">
      <p className="text-tenue">Tus puntos</p>
      <p className="text-5xl font-bold text-marca">
        {puntos} <span className="text-2xl">pts</span>
      </p>
      {prox ? (
        <>
          <div
            className="h-4 overflow-hidden rounded-full bg-superficie"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(prox.avance * 100)}
            aria-label={`Avance hacia ${prox.beneficio.nombre}`}
          >
            <div className="h-full rounded-full bg-marca transition-[width] duration-700" style={{ width: `${Math.max(4, prox.avance * 100)}%` }} />
          </div>
          <p className="text-lg leading-snug">
            Te faltan <b>{plural(prox.faltan, "punto", "puntos")}</b> para tu próximo beneficio: <b>{prox.beneficio.nombre}</b>
          </p>
        </>
      ) : (
        <p className="text-lg font-bold">¡Ya tienes todos los beneficios!</p>
      )}
    </Tarjeta>
  );
}

function Credito({ restantes, total }: { restantes: number; total: number }) {
  const pagadas = total - restantes;
  return (
    <Tarjeta className="flex flex-col gap-3">
      <p className="text-tenue">Tu crédito</p>
      <div className="flex gap-1" role="img" aria-label={`${pagadas} de ${total} cuotas pagadas`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-6 flex-1 rounded ${i < pagadas ? "bg-exito" : "bg-linea"}`} />
        ))}
      </div>
      <p className="text-sm text-tenue">
        {pagadas} de {total} cuotas pagadas
      </p>
      <p className="text-lg font-bold leading-snug">
        {restantes === 0 ? "¡Terminaste de pagar tu crédito!" : `Te ${restantes === 1 ? "falta" : "faltan"} ${plural(restantes, "cuota", "cuotas")} para terminar tu crédito`}
      </p>
    </Tarjeta>
  );
}
