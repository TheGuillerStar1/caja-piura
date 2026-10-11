"use client";
// Centro de mando para Caja Piura (gerencia, agencias, marketing): KPIs del negocio, mapa por distrito,
// segmentos y modo campaña. Público como /panel: solo agregados de perfiles ficticios. Se actualiza cada 10 s.
import type { DistritoGestion, ResumenGestionRes } from "@cp/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cargando } from "@/components/ui";
import { Campanas } from "@/components/gestion/Campanas";
import { MapaPiura } from "@/components/gestion/MapaPiura";
import {
  ahorroPorOp,
  colorTramo,
  entero,
  GAMAS,
  METRICAS,
  type Metrica,
  OCUPACIONES,
  pct,
  soles,
  tintaTramo,
  tramoDe,
  tramos,
  valor,
} from "@/components/gestion/formato";
import { api } from "@/lib/api";

export default function GestionPage() {
  const [r, setR] = useState<ResumenGestionRes | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      api<ResumenGestionRes>("/gestion/resumen")
        .then((x) => {
          if (!vivo) return;
          setR(x);
          setActualizado(new Date());
          setError(false);
        })
        .catch(() => vivo && setError(true));
    cargar();
    const t = setInterval(cargar, 10000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-fondo">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-marca">Caja Piura · Centro de mando</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Adopción digital en la región Piura</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <p className="flex items-center gap-2 text-tenue">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${error ? "bg-error" : "bg-exito"}`} aria-hidden />
              {error ? "Sin conexión, reintentando…" : actualizado ? `En vivo · ${actualizado.toLocaleTimeString("es-PE")}` : "Conectando…"}
            </p>
            <Link href="/panel" className="flex items-center font-bold text-marca underline underline-offset-4">
              Panel del jurado →
            </Link>
          </div>
        </header>

        <nav aria-label="Secciones" className="-mt-2 flex flex-wrap gap-2 text-sm font-bold">
          {[
            ["#kpis", "Indicadores"],
            ["#mapa", "Mapa"],
            ["#segmentos", "Segmentos"],
            ["#campanas", "Campañas"],
          ].map(([href, t]) => (
            <a key={href} href={href} className="flex min-h-9 items-center rounded-full border-2 border-linea bg-superficie px-3 hover:border-marca">
              {t}
            </a>
          ))}
          <span className="flex min-h-9 items-center rounded-full bg-aviso-claro px-3 text-aviso">Datos ficticios · {r ? entero(r.totales.clientes) : "…"} perfiles</span>
        </nav>

        {!r ? <Cargando texto="Cargando el centro de mando…" /> : <Contenido r={r} />}

        <footer className="border-t border-linea pt-3 text-xs leading-relaxed text-tenue">
          <p>
            <b>Supuestos provisionales</b> (reemplazar por los costos reales de Caja Piura): una operación en ventanilla cuesta{" "}
            {r ? soles(r.supuestos.costoOpVentanilla) : "…"} y por la app {r ? soles(r.supuestos.costoOpDigital) : "…"}; un SMS{" "}
            {r ? soles(r.supuestos.costoSms) : "…"}; el cashback doble cuesta {r ? soles(r.supuestos.cashbackExtraPorPago) : "…"} extra por pago.{" "}
            <b>Campañas</b>: resultados proyectados con un modelo fijo (abrir el aviso, pagar y seguir usando la app según cuánto usa ya el
            celular y la gama de su equipo), no medidos. <b>Mapa</b>: límites distritales del INEI; Veintiséis de Octubre se muestra dentro de
            Piura. Prototipo con 500 perfiles ficticios con el esquema de datos de Caja Piura.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Contenido({ r }: { r: ResumenGestionRes }) {
  const [metrica, setMetrica] = useState<Metrica>("oportunidad");
  const [sel, setSel] = useState<string | null>(null);
  const [prellenar, setPrellenar] = useState<{ ubigeo: string; n: number } | null>(null);

  // Por defecto, el distrito con más oportunidad.
  const seleccionado = sel ?? [...r.distritos].sort((a, b) => b.oportunidad - a.oportunidad)[0]?.ubigeo ?? null;
  const distrito = r.distritos.find((d) => d.ubigeo === seleccionado) ?? null;

  function crearCampana(ubigeo: string) {
    setPrellenar((p) => ({ ubigeo, n: (p?.n ?? 0) + 1 }));
    document.getElementById("campanas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Kpis r={r} />

      <section id="mapa" className="scroll-mt-4 flex flex-col gap-3" aria-labelledby="t-mapa">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="t-mapa" className="text-xl font-bold">
              ¿Dónde está la oportunidad?
            </h2>
            <p className="text-sm text-tenue">{METRICAS[metrica].ayuda}. Toca un distrito para ver su ficha.</p>
          </div>
          <div role="radiogroup" aria-label="Indicador del mapa" className="flex flex-wrap gap-1.5">
            {(Object.keys(METRICAS) as Metrica[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metrica === m}
                onClick={() => setMetrica(m)}
                className={`min-h-9 rounded-full border-2 px-3 text-sm font-bold transition-colors ${
                  metrica === m ? "border-marca bg-marca text-white" : "border-linea bg-superficie hover:border-marca"
                }`}
              >
                {METRICAS[m].nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-2xl border-2 border-linea bg-superficie p-3 sm:p-4">
            <MapaPiura distritos={r.distritos} metrica={metrica} seleccionado={seleccionado} alSeleccionar={setSel} />
          </div>
          <div className="flex flex-col gap-4">
            {distrito && <Ficha d={distrito} r={r} alCrearCampana={() => crearCampana(distrito.ubigeo)} />}
            <Ranking distritos={r.distritos} metrica={metrica} seleccionado={seleccionado} alSeleccionar={setSel} />
          </div>
        </div>
      </section>

      <section id="segmentos" className="scroll-mt-4 flex flex-col gap-3" aria-labelledby="t-seg">
        <div>
          <h2 id="t-seg" className="text-xl font-bold">
            ¿Quiénes ya usan el celular?
          </h2>
          <p className="text-sm text-tenue">Parte de las operaciones que cada grupo hace por la app, por ocupación y gama del celular.</p>
        </div>
        <Matriz segmentos={r.segmentos} />
      </section>

      <section id="campanas" className="scroll-mt-4 flex flex-col gap-3" aria-labelledby="t-camp">
        <div>
          <h2 id="t-camp" className="text-xl font-bold">
            Modo campaña
          </h2>
          <p className="text-sm text-tenue">Elige a quién y qué hacer; simula 30 días y mira cuántos pasan de la ventanilla a la app y cuánto ahorra la Caja.</p>
        </div>
        <Campanas resumen={r} prellenar={prellenar} />
      </section>
    </>
  );
}

function Kpis({ r }: { r: ResumenGestionRes }) {
  const t = r.totales;
  const a = ahorroPorOp(r.supuestos);
  return (
    <section id="kpis" className="scroll-mt-4 flex flex-col gap-3" aria-label="Indicadores del negocio">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile titulo="Adopción digital" valor={pct(t.adopcion)} nota={`de ${entero(t.clientes)} clientes usan la app al menos 1 vez al mes`} barra={t.adopcion} />
        <Tile
          titulo="Operaciones por la app"
          valor={pct(t.tasaDigital)}
          nota={`${entero(t.opsDigitalesMes)} de ${entero(t.opsDigitalesMes + t.opsVentanillaMes)} operaciones al mes`}
          barra={t.tasaDigital}
        />
        <Tile titulo="Ahorro actual" valor={`${soles(t.opsDigitalesMes * a)}`} nota="al mes, por lo que ya se hace en la app en vez de ventanilla" />
        <Tile
          destacado
          titulo="Ahorro potencial"
          valor={`+${soles(t.oportunidad * a)}`}
          nota={`al mes, si pasan a la app las ${entero(t.oportunidad)} operaciones en ventanilla de clientes con celular apto`}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Mini titulo="En ventanilla al mes" valor={entero(t.opsVentanillaMes)} />
        <Mini titulo="Cuotas por vencer (7 días)" valor={entero(t.porVencer)} nota={soles(t.montoPorVencer)} />
        <Mini titulo="Cuotas vencidas" valor={entero(t.vencidas)} nota="mora temprana" />
        <Mini titulo="Pagos por la app" valor={entero(t.pagosApp)} nota={`${pct(t.tasaExitoSinAyuda)} sin ayuda`} />
        <Mini titulo="Cashback entregado" valor={soles(t.cashbackEntregado)} />
      </dl>
    </section>
  );
}

function Tile({ titulo, valor, nota, barra, destacado }: { titulo: string; valor: string; nota: string; barra?: number; destacado?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border-2 p-4 ${destacado ? "border-marca bg-marca-claro" : "border-linea bg-superficie"}`}>
      <h3 className={`text-sm font-bold ${destacado ? "text-marca" : "text-tenue"}`}>{titulo}</h3>
      <p className="text-3xl font-bold tabular-nums sm:text-4xl">{valor}</p>
      <p className="text-sm leading-snug text-tenue">{nota}</p>
      {barra != null && (
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-fondo" aria-hidden>
          <div className="h-full rounded-full bg-marca transition-[width] duration-500" style={{ width: `${barra * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function Mini({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-linea bg-superficie px-3 py-2">
      <dt className="text-xs text-tenue">{titulo}</dt>
      <dd className="text-xl font-bold tabular-nums">
        {valor} {nota && <span className="text-xs font-normal text-tenue">{nota}</span>}
      </dd>
    </div>
  );
}

function Ficha({ d, r, alCrearCampana }: { d: DistritoGestion; r: ResumenGestionRes; alCrearCampana: () => void }) {
  const a = ahorroPorOp(r.supuestos);
  const filas: [string, string][] = [
    ["Adopción digital", pct(d.adopcion)],
    ["Operaciones por la app", pct(d.tasaDigital)],
    ["En ventanilla al mes", entero(d.opsVentanillaMes)],
    ["Cuotas por vencer (7 días)", `${entero(d.porVencer)} · ${soles(d.montoPorVencer)}`],
    ["Cuotas vencidas", entero(d.vencidas)],
    ["Vista asistida recomendada", pct(d.asistida)],
    ["Pagos por la app", entero(d.pagosApp)],
  ];
  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-linea bg-superficie p-4" aria-live="polite">
      <header>
        <h3 className="text-xl font-bold">{d.nombres.join(" y ")}</h3>
        <p className="text-sm text-tenue">
          {entero(d.clientes)} clientes · perfil típico: {OCUPACIONES[d.ocupacionPrincipal].toLowerCase().replace(/s$/, "")}, {d.edadMedia} años
        </p>
      </header>
      <div className="rounded-xl bg-marca-claro p-3">
        <p className="text-sm font-bold text-marca">Ahorro potencial</p>
        <p className="text-2xl font-bold tabular-nums">+{soles(d.oportunidad * a)}/mes</p>
        <p className="text-xs text-tenue">{entero(d.oportunidad)} operaciones en ventanilla de clientes con celular apto</p>
      </div>
      <dl className="flex flex-col divide-y divide-linea text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 py-1.5">
            <dt className="text-tenue">{k}</dt>
            <dd className="font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={alCrearCampana}
        className="min-h-11 rounded-boton bg-marca px-4 font-bold text-white transition-colors hover:bg-marca-oscuro"
      >
        Crear campaña para este distrito
      </button>
    </article>
  );
}

function Ranking({
  distritos,
  metrica,
  seleccionado,
  alSeleccionar,
}: {
  distritos: DistritoGestion[];
  metrica: Metrica;
  seleccionado: string | null;
  alSeleccionar: (u: string) => void;
}) {
  const m = METRICAS[metrica];
  const orden = useMemo(() => [...distritos].sort((a, b) => valor(b, metrica) - valor(a, metrica)), [distritos, metrica]);
  const max = Math.max(m.esPct ? 1 : 0, ...distritos.map((d) => valor(d, metrica)), 1e-9);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-linea bg-superficie p-4">
      <h3 className="font-bold">Ranking · {m.nombre}</h3>
      <ol className="flex flex-col">
        {orden.map((d, i) => (
          <li key={d.ubigeo}>
            <button
              type="button"
              onClick={() => alSeleccionar(d.ubigeo)}
              aria-current={d.ubigeo === seleccionado ? "true" : undefined}
              className={`grid min-h-9 w-full grid-cols-[1.25rem_minmax(0,8rem)_1fr_auto] items-center gap-2 rounded-lg px-1.5 text-left text-sm ${
                d.ubigeo === seleccionado ? "bg-marca-claro font-bold" : "hover:bg-fondo"
              }`}
            >
              <span className="text-xs tabular-nums text-tenue">{i + 1}</span>
              <span className="truncate">{d.nombres.join(" y ")}</span>
              <span className="h-2 overflow-hidden rounded-r bg-fondo" aria-hidden>
                <span className="block h-full rounded-r bg-marca" style={{ width: `${(valor(d, metrica) / max) * 100}%` }} />
              </span>
              <span className="w-12 text-right font-bold tabular-nums">{m.formato(valor(d, metrica))}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Matriz({ segmentos }: { segmentos: ResumenGestionRes["segmentos"] }) {
  const ocupaciones = Object.keys(OCUPACIONES) as (keyof typeof OCUPACIONES)[];
  const gamas = Object.keys(GAMAS) as (keyof typeof GAMAS)[];
  const cortes = tramos(1, true);
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-linea bg-superficie p-3 sm:p-4">
      <table className="w-full min-w-[32rem] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="text-left text-tenue" scope="col">
              <span className="sr-only">Ocupación</span>
            </th>
            {gamas.map((g) => (
              <th key={g} scope="col" className="pb-1 text-center font-bold text-tenue">
                Celular {GAMAS[g].toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ocupaciones.map((o) => (
            <tr key={o}>
              <th scope="row" className="pr-2 text-left font-bold">
                {OCUPACIONES[o]}
              </th>
              {gamas.map((g) => {
                const s = segmentos.find((x) => x.ocupacion === o && x.gama === g);
                if (!s) return <td key={g} className="rounded-lg bg-fondo p-3 text-center text-tenue">—</td>;
                const i = tramoDe(s.tasaDigital, cortes);
                return (
                  <td
                    key={g}
                    className="rounded-lg p-3 text-center"
                    style={{ background: colorTramo(i), color: tintaTramo(i) }}
                    title={`${OCUPACIONES[o]}, ${GAMAS[g].toLowerCase()}: ${s.clientes} clientes, ${pct(s.tasaDigital)} de operaciones por la app, ${pct(s.asistida)} con vista asistida`}
                  >
                    <span className="block text-xl font-bold tabular-nums">{pct(s.tasaDigital)}</span>
                    <span className="block text-xs opacity-85">
                      {s.clientes} clientes · {pct(s.asistida)} asistida
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
