"use client";
// «¿Está funcionando?»: la primera franja de /gestion y /panel. Se actualiza cada 5 s.
// /gestion: los 4 KPIs (pagan solos, vuelven a pagar, pagan a tiempo, cuesta menos), cada uno con su meta.
// /panel (modo jurado): solo los 2 que responden el reto «De la ventanilla al celular» (que no abandonen y que vuelvan),
// desglosados por tipo de operación.
import type { FilaDesglose, FuncionaRes } from "@cp/shared";
import {
  Activity,
  CalendarCheck,
  CircleCheck,
  CircleDashed,
  Landmark,
  type LucideIcon,
  PiggyBank,
  Receipt,
  Repeat,
  Send,
  TriangleAlert,
  UserCheck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DEGRADADO_BARRA, DEGRADADO_MARCA, entero, pct, soles, TARJETA } from "./formato";
import { Encabezado } from "./Marca";

const FILAS: Record<FilaDesglose["id"], { nombre: string; detalle: string; icono: LucideIcon }> = {
  CREDITO: { nombre: "Pago de crédito", detalle: "cuota del préstamo", icono: Landmark },
  SERVICIOS: { nombre: "Pago de servicios", detalle: "luz, agua, teléfono", icono: Zap },
  YAPEO: { nombre: "Yapeo", detalle: "envío a un celular", icono: Send },
  BOLETAS: { nombre: "Pago de boletas", detalle: "luz, agua, teléfono", icono: Receipt },
};

/** `jurado`: solo «Pagan solos» y «Vuelven a pagar», con su desglose (para /panel). */
export function Funciona({ jurado = false }: { jurado?: boolean }) {
  const [f, setF] = useState<FuncionaRes | null>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      api<FuncionaRes>("/gestion/funciona")
        .then((x) => vivo && setF(x))
        .catch(() => {});
    cargar();
    const t = setInterval(cargar, 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  return (
    <section id="funciona" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-funciona">
      <Encabezado
        icono={Activity}
        id="t-funciona"
        antetitulo="¿Está funcionando?"
        sobreAzul
        titulo={jurado ? "Pagan solos y vuelven a pagar" : "Pagan solos, vuelven a pagar, pagan a tiempo y le cuesta menos a la Caja"}
        texto={
          jurado
            ? "Lo que pide el reto: que no abandonen y vuelvan a la ventanilla, y que el uso del celular se vuelva hábito. En vivo y por tipo de operación."
            : "Los 4 números que prueban la solución, cada uno con su meta. Se actualizan en vivo con lo que hacen los clientes en la app."
        }
      />
      {!f ? (
        <div className={`grid gap-4 ${jurado ? "lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`} aria-hidden>
          {(jurado ? [0, 1] : [0, 1, 2, 3]).map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-superficie-2" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 ${jurado ? "lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
          <Kpi
            n={1}
            icono={UserCheck}
            titulo="Pagan solos"
            pregunta="¿Lo logran sin ir a la agencia?"
            tasa={f.sinAyuda.tasa}
            meta={f.sinAyuda.meta}
            detalle={`${entero(f.sinAyuda.exitososSinAyuda)} de ${entero(f.sinAyuda.intentos)} intentos terminaron sin ayuda`}
            sinDatos={f.sinAyuda.intentos === 0}
            pista="Aún no hay intentos de pago."
            desglose={jurado ? f.sinAyuda.desglose : undefined}
            unidad="sin ayuda"
          />
          <Kpi
            n={2}
            icono={Repeat}
            titulo="Vuelven a pagar"
            pregunta="¿Se vuelve hábito o fue una sola vez?"
            tasa={f.repiten.tasa ?? 0}
            meta={f.repiten.meta}
            detalle={`${entero(f.repiten.repitieron)} de ${entero(f.repiten.elegibles)} clientes pagaron por la app otro mes`}
            sinDatos={f.repiten.tasa == null}
            pista={
              f.repiten.conPago
                ? `${entero(f.repiten.conPago)} ${f.repiten.conPago === 1 ? "cliente pagó" : "clientes pagaron"}: en la demo, «Adelantar 30 días» y paga de nuevo.`
                : "Aún nadie pagó por la app."
            }
            desglose={jurado ? f.repiten.desglose : undefined}
            unidad="clientes volvieron"
          />
          {!jurado && (
            <>
          <Kpi
            n={3}
            icono={CalendarCheck}
            titulo="Pagan a tiempo"
            pregunta="¿Baja la mora?"
            tasa={f.aTiempo.tasa ?? 0}
            meta={f.aTiempo.meta}
            detalle={
              f.aTiempo.diasAnticipacion != null
                ? `${entero(f.aTiempo.aTiempo)} de ${entero(f.aTiempo.cuotas)} cuotas pagadas antes de vencer · ${f.aTiempo.diasAnticipacion} días antes en promedio`
                : ""
            }
            sinDatos={f.aTiempo.tasa == null}
            pista="Aún no hay cuotas pagadas por la app."
          />
          <Ahorro a={f.ahorro} />
            </>
          )}
        </div>
      )}
      <p className="text-xs text-tenue">
        Metas propuestas para el piloto (ajustables con Caja Piura). «Pagan solos» cuenta como intento cada pago o yapeo y cada abandono en la
        confirmación; lo que se hace dentro del chat con Pía cuenta como «con ayuda». «Vuelven a pagar» cuenta a quien hizo otro pago por la app al
        menos 20 días después del primero.{jurado ? "" : " El ahorro es estimado con costos supuestos por operación."}
      </p>
    </section>
  );
}

function Estado({ tasa, meta, sinDatos }: { tasa: number; meta: number; sinDatos: boolean }) {
  const [Icono, texto, clase]: [LucideIcon, string, string] = sinDatos
    ? [CircleDashed, "Aún sin datos", "bg-fondo text-tenue"]
    : tasa >= meta
      ? [CircleCheck, "Meta cumplida", "bg-exito-claro text-exito"]
      : tasa >= meta * 0.6
        ? [Activity, "En camino", "bg-aviso-claro text-aviso"]
        : [TriangleAlert, "Por debajo de la meta", "bg-error-claro text-error"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${clase}`}>
      <Icono className="h-3.5 w-3.5" aria-hidden />
      {texto}
    </span>
  );
}

function Kpi({
  n,
  icono: I,
  titulo,
  pregunta,
  tasa,
  meta,
  detalle,
  sinDatos,
  pista,
  desglose,
  unidad,
}: {
  desglose?: FilaDesglose[];
  unidad?: string;
  n: number;
  icono: LucideIcon;
  titulo: string;
  pregunta: string;
  tasa: number;
  meta: number;
  detalle: string;
  sinDatos: boolean;
  pista: string;
}) {
  return (
    <article className={`${TARJETA} flex flex-col gap-2 p-5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-marca text-sm font-bold text-white" aria-hidden>
            {n}
          </span>
          <h3 className="text-lg font-bold">{titulo}</h3>
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-marca-claro text-marca" aria-hidden>
          <I className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm text-tenue">{pregunta}</p>
      <p className="text-5xl font-bold tabular-nums">{sinDatos ? "—" : pct(tasa)}</p>

      <div className="relative mt-1" aria-hidden>
        <div className="h-2.5 overflow-hidden rounded-full bg-fondo">
          {!sinDatos && <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, tasa) * 100}%`, background: DEGRADADO_BARRA }} />}
        </div>
        {/* Marca de la meta */}
        <span className="absolute -top-1 h-[18px] w-0.5 rounded bg-acento" style={{ left: `calc(${meta * 100}% - 1px)` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Estado tasa={tasa} meta={meta} sinDatos={sinDatos} />
        <span className="text-xs font-bold text-acento">Meta {pct(meta)}</span>
      </div>
      <p className="text-sm leading-snug text-tenue">{sinDatos ? pista : detalle}</p>
      {desglose && <Desglose filas={desglose} meta={meta} unidad={unidad ?? ""} />}
    </article>
  );
}

function Ahorro({ a }: { a: FuncionaRes["ahorro"] }) {
  return (
    <article className="relative flex flex-col gap-2 overflow-hidden rounded-2xl p-5 text-white shadow-[0_14px_32px_-12px_rgb(0_84_159/0.6)]" style={{ background: DEGRADADO_MARCA }}>
      <PiggyBank className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-white/10" aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-[var(--cp-brand)]" aria-hidden>
            4
          </span>
          <h3 className="text-lg font-bold">Cuesta menos</h3>
        </span>
        <span className="rounded-full bg-acento px-2.5 py-1 text-xs font-bold">Estimado</span>
      </div>
      <p className="text-sm text-white/85">¿Cuánto ahorra la Caja?</p>
      <p className="text-4xl font-bold tabular-nums">
        {soles(a.actualMes)}
        <span className="text-lg font-medium text-white/80">/mes</span>
      </p>
      <p className="text-sm text-white/85">
        {entero(a.opsAppMes)} operaciones al mes por la app en vez de ventanilla ({soles(a.ahorroPorOp)} menos cada una)
      </p>
      <p className="relative rounded-xl bg-white/15 px-3 py-2 text-sm">
        <b className="text-base">+{soles(a.potencialMes)}/mes</b> más si pasan a la app las {entero(a.opsMigrablesMes)} operaciones de clientes con celular apto
      </p>
    </article>
  );
}

function Desglose({ filas, meta, unidad }: { filas: FilaDesglose[]; meta: number; unidad: string }) {
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-linea pt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-tenue">Por tipo de operación</p>
      <ul className="flex flex-col gap-2">
        {filas.map((f) => {
          const { nombre, detalle, icono: I } = FILAS[f.id];
          const sin = f.tasa == null;
          return (
            <li
              key={f.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--cp-login-light)_40%,var(--color-superficie))] p-2.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-superficie text-[var(--cp-brand)] shadow-sm" aria-hidden>
                <I className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {nombre} <span className="text-xs font-normal text-tenue">· {detalle}</span>
                </p>
                <div className="relative mt-1.5" aria-hidden>
                  <div className="h-2 overflow-hidden rounded-full bg-superficie">
                    {!sin && (
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, f.tasa!) * 100}%`, background: DEGRADADO_BARRA }} />
                    )}
                  </div>
                  <span className="absolute -top-0.5 h-3 w-0.5 rounded bg-acento" style={{ left: `calc(${meta * 100}% - 1px)` }} />
                </div>
                <p className="mt-1 text-xs text-tenue">{sin ? "Aún sin datos" : `${entero(f.logrados)} de ${entero(f.total)} ${unidad}`}</p>
              </div>
              <p className={`w-16 text-right text-2xl font-bold tabular-nums ${sin ? "text-tenue" : ""}`}>{sin ? "—" : pct(f.tasa!)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
