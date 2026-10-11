"use client";
// «¿Está funcionando?»: la primera franja de /panel y /gestion. Responde lo primero que Caja Piura quiere saber, con
// cuatro números que se recuerdan fácil: pagan solos, vuelven a pagar, pagan a tiempo y le cuesta menos a la Caja.
// En /panel (`jurado`) los dos primeros, los que pide el reto 13, van desglosados por tipo de operación.
// «Ahora en la demo» muestra al instante el pago que hace el jurado (Rosa, Javier…). Se actualiza cada 5 s.
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
  Sparkles,
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

/** `jurado`: «Pagan solos» y «Vuelven a pagar» en grande y con su desglose por tipo de operación (para /panel). */
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

  const cuadricula = jurado ? "grid gap-4 lg:grid-cols-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section id="funciona" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-funciona">
      <Encabezado
        icono={Activity}
        id="t-funciona"
        antetitulo="¿Esto funciona?"
        sobreAzul
        titulo="Pagan solos, vuelven a pagar, pagan a tiempo y le cuesta menos a la Caja"
        texto="Cuatro números que se recuerdan fácil, cada uno con su meta. Se actualizan en vivo con lo que hacen los clientes en la app."
      />
      {!f ? (
        <div className={cuadricula} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-superficie-2" />
          ))}
        </div>
      ) : (
        <>
          {(jurado || f.enVivo.length > 0) && <EnVivo items={f.enVivo} />}
          <div className={cuadricula}>
            <Kpi
              n={1}
              icono={UserCheck}
              titulo="Pagan solos"
              pregunta="¿Terminan sin ayuda, o se rinden y vuelven a la agencia?"
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
              pregunta="¿Pagar se vuelve hábito, o fue curiosidad de una vez?"
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
            <Kpi
              n={3}
              icono={CalendarCheck}
              titulo="Pagan a tiempo"
              pregunta="¿Pagan antes del vencimiento? Baja la mora, el indicador central de una caja municipal."
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
          </div>
          {!!f.simulados && (
            <p className="flex items-start gap-2 rounded-xl bg-aviso-claro px-3 py-2 text-sm text-aviso">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <b>Incluye actividad simulada:</b> {entero(f.simulados)} pagos y yapeos de 3 meses sobre los perfiles ficticios, para mostrar cómo se
                verían los indicadores en un piloto. Lo que hagas en la demo se suma en vivo.
              </span>
            </p>
          )}
        </>
      )}
      <p className="text-xs text-tenue">
        Metas propuestas para el piloto (ajustables con Caja Piura). «Pagan solos» cuenta como intento cada pago o yapeo y cada abandono en la
        confirmación; lo que se hace dentro del chat con PÍA cuenta como «con ayuda». «Vuelven a pagar» cuenta a quien hizo otro pago por la app al
        menos 20 días después del primero. «Le cuesta menos» es una estimación con costos supuestos por operación.
      </p>
    </section>
  );
}

/** Lo último que hicieron los clientes de la demo: el jurado ve aparecer su propio pago. */
function EnVivo({ items }: { items: FuncionaRes["enVivo"] }) {
  return (
    <div className={`${TARJETA} flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center`} aria-live="polite">
      <p className="flex shrink-0 items-center gap-2 text-sm font-bold">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-exito opacity-60" />
          <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-exito" />
        </span>
        Ahora en la demo
      </p>
      {items.length === 0 && (
        <p className="text-sm text-tenue">Esperando el primer pago: paguen la cuota como Rosa y aparece aquí al instante.</p>
      )}
      <ul className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <li
            key={it.id}
            className={`anim-previa flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${i === 0 ? "bg-marca-claro font-bold" : "bg-fondo text-tenue"}`}
          >
            <span>
              {it.nombre} {it.accion}
            </span>
            {it.sinAyuda ? (
              <span className="inline-flex items-center gap-0.5 font-bold text-exito">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden /> sin ayuda
              </span>
            ) : (
              <span className="text-tenue">· con PÍA</span>
            )}
            {it.volvio && (
              <span className="inline-flex items-center gap-0.5 font-bold text-marca">
                <Repeat className="h-3.5 w-3.5" aria-hidden /> volvió a pagar
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
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
  n: number;
  icono: LucideIcon;
  titulo: string;
  pregunta: string;
  tasa: number;
  meta: number;
  detalle: string;
  sinDatos: boolean;
  pista: string;
  desglose?: FilaDesglose[];
  unidad?: string;
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

/** Le cuesta menos: ahorro neto del mes por las operaciones que dejaron la ventanilla, ya descontado el cashback. */
function Ahorro({ a }: { a: FuncionaRes["ahorro"] }) {
  return (
    <article className="relative flex flex-col gap-2 overflow-hidden rounded-2xl p-5 text-white shadow-[0_14px_32px_-12px_rgb(0_84_159/0.6)]" style={{ background: DEGRADADO_MARCA }}>
      <PiggyBank className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-white/10" aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-[var(--cp-brand)]" aria-hidden>
            4
          </span>
          <h3 className="text-lg font-bold">Le cuesta menos</h3>
        </span>
        <span className="rounded-full bg-acento px-2.5 py-1 text-xs font-bold">Estimado</span>
      </div>
      <p className="text-sm text-white/85">¿Cuánto ahorra la Caja por cada operación que deja la ventanilla?</p>
      <p className="text-4xl font-bold tabular-nums">
        {soles(a.netoMes)}
        <span className="text-lg font-medium text-white/80"> este mes</span>
      </p>
      <p className="text-sm text-white/85">
        {entero(a.opsMes)} operaciones por la app en vez de ventanilla ({soles(a.ahorroPorOp)} menos cada una), ya descontado el cashback de{" "}
        {soles(a.cashbackMes)}.
      </p>
      {a.porSolCashback != null && (
        <p className="relative flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Por cada <b>S/ 1</b> de cashback, la Caja ahorra <b className="text-base">S/ {a.porSolCashback.toLocaleString("es-PE")}</b>
          </span>
        </p>
      )}
      <p className="relative mt-auto text-xs text-white/75">
        Potencial: +{soles(a.potencialMes)}/mes si pasan a la app las {entero(a.opsMigrablesMes)} operaciones en ventanilla de clientes con celular apto.
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
