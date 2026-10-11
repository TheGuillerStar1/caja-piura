"use client";
// Dueño: Agente D. Progreso del cliente: cashback, cómo ganarlo, pagos del mes, visitas ahorradas y avance del crédito.
import { CalendarCheck, Coins, Smartphone, ThumbsUp } from "lucide-react";
import type { ProgresoRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
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
              mensaje={
                datos.cashbackTotal > 0
                  ? "¡Vas muy bien! Cada pago desde tu celular te devuelve plata a tu cuenta."
                  : "Paga desde tu celular y te devolvemos parte de lo que pagas."
              }
            />
          )}

          <Cashback datos={datos} />

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

          <ComoGanar reglas={datos.reglas} tope={datos.topeMes} />

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Tu cashback</h2>
            {datos.historial.length === 0 ? (
              <p className="text-tenue">Aún no tienes cashback. Paga tu cuota desde el celular antes de que venza y te devolvemos hasta el 3%.</p>
            ) : (
              <ul className="divide-y divide-linea rounded-2xl border-2 border-linea bg-superficie">
                {datos.historial.map((h, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1">
                      <span className="block">{h.descripcion}</span>
                      <span className="block text-sm text-tenue">{fechaCorta(h.fecha)}</span>
                    </span>
                    <span className="font-bold text-exito">+{soles(h.monto)}</span>
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

const pct = (n: number) => `${(n * 100).toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`;

function Cashback({ datos }: { datos: ProgresoRes }) {
  const avance = Math.min(1, datos.cashbackMes / datos.topeMes);
  const queda = Math.max(0, datos.topeMes - datos.cashbackMes);
  return (
    <Tarjeta tono="marca" className="flex flex-col gap-3">
      <p className="text-tenue">Cashback ganado</p>
      <p className="text-5xl font-bold text-marca">{soles(datos.cashbackTotal)}</p>
      <p className="-mt-1 text-sm text-tenue">Se abona al instante en la cuenta con la que pagas.</p>
      <div
        className="h-4 overflow-hidden rounded-full bg-superficie"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={datos.topeMes}
        aria-valuenow={datos.cashbackMes}
        aria-label="Cashback de este mes"
      >
        <div className="h-full rounded-full bg-marca transition-[width] duration-700" style={{ width: `${Math.max(4, avance * 100)}%` }} />
      </div>
      <p className="text-lg leading-snug">
        {queda > 0 ? (
          <>
            Este mes llevas <b>{soles(datos.cashbackMes)}</b>. Puedes ganar <b>{soles(queda)}</b> más.
          </>
        ) : (
          <>
            ¡Llegaste al máximo del mes: <b>{soles(datos.topeMes)}</b>! Se renueva en 30 días.
          </>
        )}
      </p>
    </Tarjeta>
  );
}

function ComoGanar({ reglas, tope }: { reglas: ProgresoRes["reglas"]; tope: number }) {
  const filas = [
    { Icono: Smartphone, nombre: "Paga desde la app", detalle: "Cuotas, recibos y pagos frecuentes", valor: pct(reglas.digital) },
    { Icono: ThumbsUp, nombre: "Hazlo sin ayuda", detalle: "Sin Pía ni «Enséñame paso a paso»", valor: `+${pct(reglas.sinAyuda)}` },
    { Icono: CalendarCheck, nombre: "Paga tu cuota antes de que venza", detalle: "Aunque sea un día antes", valor: `+${pct(reglas.puntual)}` },
  ];
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Cómo ganar cashback</h2>
      <ul className="flex flex-col gap-2">
        {filas.map(({ Icono, nombre, detalle, valor }) => (
          <li key={nombre} className="flex items-center gap-3 rounded-2xl border-2 border-linea bg-superficie p-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-exito-claro text-exito">
              <Icono className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-bold">{nombre}</span>
              <span className="block text-sm text-tenue">{detalle}</span>
            </span>
            <span className="text-lg font-bold text-exito">{valor}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-sm text-tenue">
        <Coins className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Hasta {soles(reglas.topePago)} por pago y {soles(tope)} cada 30 días. Las transferencias no generan cashback.
      </p>
    </section>
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
