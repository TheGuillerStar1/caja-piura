"use client";
// Centro de mando para Caja Piura (gerencia, agencias, marketing): KPIs del negocio, mapa por distrito,
// segmentos y modo campaña. Público como /panel: solo agregados de perfiles ficticios. Se actualiza cada 10 s.
// Estilo de la marca (Manual visual «Caja Piura Contigo»): azul institucional → azul app, lila de acceso, naranja de acción.
import type { DistritoGestion, ResumenGestionRes } from "@cp/shared";
import {
  ArrowLeftRight,
  CalendarClock,
  Coins,
  Gift,
  Grid3x3,
  type LucideIcon,
  MapPinned,
  Megaphone,
  PiggyBank,
  Smartphone,
  Store,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogoCajaPiura } from "@/app/_entrada/Logo";
import { Cargando } from "@/components/ui";
import { Campanas } from "@/components/gestion/Campanas";
import { MapaPiura } from "@/components/gestion/MapaPiura";
import {
  ahorroPorOp,
  colorTramo,
  DEGRADADO_BARRA,
  DEGRADADO_MARCA,
  entero,
  GAMAS,
  METRICAS,
  type Metrica,
  OCUPACIONES,
  pct,
  soles,
  TARJETA,
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
      <Portada r={r} actualizado={actualizado} error={error} />

      <main className="relative mx-auto -mt-20 flex w-full max-w-7xl flex-col gap-10 px-4 pb-10">
        {!r ? (
          <div className={`${TARJETA} py-6`}>
            <Cargando texto="Cargando el centro de mando…" />
          </div>
        ) : (
          <Contenido r={r} />
        )}
      </main>

      <footer className="border-t border-linea bg-superficie">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-start">
          <LogoCajaPiura className="h-10 shrink-0" />
          <p className="text-xs leading-relaxed text-tenue">
            <b>Supuestos provisionales</b> (reemplazar por los costos reales de Caja Piura): una operación en ventanilla cuesta{" "}
            {r ? soles(r.supuestos.costoOpVentanilla) : "…"} y por la app {r ? soles(r.supuestos.costoOpDigital) : "…"}; un SMS{" "}
            {r ? soles(r.supuestos.costoSms) : "…"}; el cashback doble cuesta {r ? soles(r.supuestos.cashbackExtraPorPago) : "…"} extra por pago.{" "}
            <b>Campañas</b>: resultados proyectados con un modelo fijo (abrir el aviso, pagar y seguir usando la app según cuánto usa ya el
            celular y la gama de su equipo), no medidos. <b>Mapa</b>: límites distritales del INEI; Veintiséis de Octubre se muestra dentro de
            Piura. Prototipo con 500 perfiles ficticios con el esquema de datos de Caja Piura.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Cabecera azul de marca con el logo blanco y una ilustración de línea (como las pantallas de acceso de la app). */
function Portada({ r, actualizado, error }: { r: ResumenGestionRes | null; actualizado: Date | null; error: boolean }) {
  return (
    <header className="relative overflow-hidden text-white" style={{ background: DEGRADADO_MARCA }}>
      <Ilustracion />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-28 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoCajaPiura variante="blanco" className="h-9 sm:h-10" />
            <span className="h-8 w-px bg-white/35" aria-hidden />
            <span className="text-sm font-bold uppercase tracking-wider text-white/90">Centro de mando</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p className="flex min-h-9 items-center gap-2 rounded-full bg-white/15 px-3 font-medium backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                {!error && <span className="absolute inset-0 animate-ping rounded-full bg-[#6ee7a8] opacity-70" />}
                <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${error ? "bg-[#ffb4a8]" : "bg-[#6ee7a8]"}`} />
              </span>
              {error ? "Sin conexión, reintentando…" : actualizado ? `En vivo · ${actualizado.toLocaleTimeString("es-PE")}` : "Conectando…"}
            </p>
            <Link href="/panel" className="flex min-h-9 items-center rounded-full bg-white px-4 font-bold text-[var(--cp-brand)] shadow-sm hover:bg-[var(--cp-login-light)]">
              Panel del jurado →
            </Link>
          </div>
        </div>

        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight [text-shadow:0_1px_3px_rgb(0_30_80/0.35)] sm:text-[2.6rem]">Adopción digital en la región Piura</h1>
          <p className="mt-2 text-base text-white/90 sm:text-lg">
            Dónde están los clientes que aún van a ventanilla, cuánto ahorra la Caja si pasan a la app y qué campaña los mueve.
          </p>
        </div>

        <nav aria-label="Secciones" className="flex flex-wrap gap-2 text-sm font-bold">
          {(
            [
              ["#kpis", "Indicadores", TrendingUp],
              ["#mapa", "Mapa", MapPinned],
              ["#segmentos", "Segmentos", Grid3x3],
              ["#campanas", "Campañas", Megaphone],
            ] as const
          ).map(([href, t, I]) => (
            <a key={href} href={href} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 backdrop-blur-sm transition-colors hover:bg-white/25">
              <I className="h-4 w-4" aria-hidden />
              {t}
            </a>
          ))}
          <span className="flex min-h-10 items-center rounded-full bg-acento px-4 text-white shadow-sm">
            Datos ficticios · {r ? entero(r.totales.clientes) : "…"} perfiles
          </span>
        </nav>
      </div>
    </header>
  );
}

/** Trazos de línea: pin del mapa, barras, moneda y celular. Decorativo. */
function Ilustracion() {
  return (
    <svg
      viewBox="0 0 600 260"
      aria-hidden
      className="pointer-events-none absolute -right-10 top-0 h-full w-[46rem] max-w-none opacity-25"
      fill="none"
      stroke="var(--cp-login-light)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M120 40c-26 0-46 20-46 45 0 34 46 80 46 80s46-46 46-80c0-25-20-45-46-45z" />
      <circle cx="120" cy="86" r="16" />
      <path d="M40 210c40-30 80 10 120-20s70-40 110-10 60 30 100 0" strokeDasharray="6 8" />
      <path d="M300 200v-50M335 200v-80M370 200v-110M405 200v-70" strokeWidth="14" />
      <path d="M285 200h135" />
      <circle cx="500" cy="70" r="30" />
      <text x="500" y="79" fontSize="24" fill="var(--cp-login-light)" stroke="none" textAnchor="middle" fontWeight="700">
        S/
      </text>
      <rect x="470" y="130" width="70" height="120" rx="12" />
      <path d="M490 150h30M488 225h34" />
      <path d="M210 70l30-22 30 14 34-30" />
      <path d="M296 32h10v10" />
    </svg>
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

      <section id="mapa" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-mapa">
        <Encabezado icono={MapPinned} id="t-mapa" antetitulo="Mapa de la región" titulo="¿Dónde está la oportunidad?" texto={`${METRICAS[metrica].ayuda}. Toca un distrito para ver su ficha.`}>
          <div role="radiogroup" aria-label="Indicador del mapa" className={`${TARJETA} flex flex-wrap gap-1 p-1`}>
            {(Object.keys(METRICAS) as Metrica[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metrica === m}
                onClick={() => setMetrica(m)}
                className={`min-h-9 rounded-xl px-3 text-sm font-bold transition-colors ${metrica === m ? "bg-marca text-white shadow-sm" : "text-tenue hover:bg-fondo hover:text-tinta"}`}
              >
                {METRICAS[m].nombre}
              </button>
            ))}
          </div>
        </Encabezado>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className={`${TARJETA} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-linea bg-[color-mix(in_srgb,var(--cp-login-light)_35%,var(--color-superficie))] px-4 py-2.5">
              <p className="text-sm font-bold">Región Piura · {r.distritos.length} distritos con clientes</p>
              <p className="text-xs text-tenue">{METRICAS[metrica].nombre}</p>
            </div>
            <div className="p-3 sm:p-5">
              <MapaPiura distritos={r.distritos} metrica={metrica} seleccionado={seleccionado} alSeleccionar={setSel} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {distrito && <Ficha d={distrito} r={r} alCrearCampana={() => crearCampana(distrito.ubigeo)} />}
            <Ranking distritos={r.distritos} metrica={metrica} seleccionado={seleccionado} alSeleccionar={setSel} />
          </div>
        </div>
      </section>

      <section id="segmentos" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-seg">
        <Encabezado
          icono={Grid3x3}
          id="t-seg"
          antetitulo="Segmentos"
          titulo="¿Quiénes ya usan el celular?"
          texto="Parte de las operaciones que cada grupo hace por la app, por ocupación y gama del celular."
        />
        <Matriz segmentos={r.segmentos} />
      </section>

      <section id="campanas" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-camp">
        <Encabezado
          icono={Megaphone}
          id="t-camp"
          antetitulo="Modo campaña"
          titulo="Mueve a los clientes de la ventanilla a la app"
          texto="Elige a quién y qué hacer; simula 30 días y mira cuántos se pasan a la app y cuánto ahorra la Caja."
        />
        <Campanas resumen={r} prellenar={prellenar} />
      </section>
    </>
  );
}

function Encabezado({
  icono: I,
  id,
  antetitulo,
  titulo,
  texto,
  children,
}: {
  icono: LucideIcon;
  id: string;
  antetitulo: string;
  titulo: string;
  texto: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md" style={{ background: DEGRADADO_MARCA }} aria-hidden>
          <I className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-marca">{antetitulo}</p>
          <h2 id={id} className="text-2xl font-bold leading-tight">
            {titulo}
          </h2>
          <p className="text-sm text-tenue">{texto}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Kpis({ r }: { r: ResumenGestionRes }) {
  const t = r.totales;
  const a = ahorroPorOp(r.supuestos);
  return (
    <section id="kpis" className="flex scroll-mt-4 flex-col gap-4" aria-label="Indicadores del negocio">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icono={Smartphone} titulo="Adopción digital" valor={pct(t.adopcion)} nota={`de ${entero(t.clientes)} clientes usan la app al menos 1 vez al mes`} barra={t.adopcion} />
        <Tile
          icono={ArrowLeftRight}
          titulo="Operaciones por la app"
          valor={pct(t.tasaDigital)}
          nota={`${entero(t.opsDigitalesMes)} de ${entero(t.opsDigitalesMes + t.opsVentanillaMes)} operaciones al mes`}
          barra={t.tasaDigital}
        />
        <Tile icono={PiggyBank} titulo="Ahorro actual" valor={soles(t.opsDigitalesMes * a)} nota="al mes, por lo que ya se hace en la app en vez de ventanilla" />
        <Tile
          destacado
          icono={TrendingUp}
          titulo="Ahorro potencial"
          valor={`+${soles(t.oportunidad * a)}`}
          nota={`al mes, si pasan a la app las ${entero(t.oportunidad)} operaciones en ventanilla de clientes con celular apto`}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Mini icono={Store} titulo="En ventanilla al mes" valor={entero(t.opsVentanillaMes)} />
        <Mini icono={CalendarClock} titulo="Vencen en 7 días" valor={entero(t.porVencer)} nota={soles(t.montoPorVencer)} />
        <Mini icono={TriangleAlert} titulo="Cuotas vencidas" valor={entero(t.vencidas)} nota="mora temprana" />
        <Mini icono={Smartphone} titulo="Pagos por la app" valor={entero(t.pagosApp)} nota={`${pct(t.tasaExitoSinAyuda)} sin ayuda`} />
        <Mini icono={Gift} titulo="Cashback entregado" valor={soles(t.cashbackEntregado)} />
      </dl>
    </section>
  );
}

function Tile({
  icono: I,
  titulo,
  valor,
  nota,
  barra,
  destacado,
}: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  nota: string;
  barra?: number;
  destacado?: boolean;
}) {
  if (destacado)
    return (
      <div className="relative flex flex-col gap-1 overflow-hidden rounded-2xl p-5 text-white shadow-[0_14px_32px_-12px_rgb(0_84_159/0.6)]" style={{ background: DEGRADADO_MARCA }}>
        <Coins className="pointer-events-none absolute -bottom-5 -right-5 h-28 w-28 text-white/10" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white/90">{titulo}</h3>
          <span className="rounded-full bg-acento px-2.5 py-0.5 text-xs font-bold">Oportunidad</span>
        </div>
        <p className="text-4xl font-bold tabular-nums">{valor}</p>
        <p className="relative text-sm leading-snug text-white/85">{nota}</p>
      </div>
    );
  return (
    <div className={`${TARJETA} flex flex-col gap-1 p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-tenue">{titulo}</h3>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-marca-claro text-marca" aria-hidden>
          <I className="h-5 w-5" />
        </span>
      </div>
      <p className="text-4xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm leading-snug text-tenue">{nota}</p>
      {barra != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-fondo" aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${barra * 100}%`, background: DEGRADADO_BARRA }} />
        </div>
      )}
    </div>
  );
}

function Mini({ icono: I, titulo, valor, nota }: { icono: LucideIcon; titulo: string; valor: string; nota?: string }) {
  return (
    <div className={`${TARJETA} flex items-center gap-3 px-3 py-3`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--cp-login-light)_60%,var(--color-superficie))] text-[var(--cp-brand)]" aria-hidden>
        <I className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-xs text-tenue">{titulo}</dt>
        <dd className="text-xl font-bold leading-tight tabular-nums">
          {valor} {nota && <span className="text-xs font-normal text-tenue">{nota}</span>}
        </dd>
      </div>
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
    <article className={`${TARJETA} overflow-hidden`} aria-live="polite">
      <header className="relative overflow-hidden px-4 pb-4 pt-3.5 text-white" style={{ background: DEGRADADO_MARCA }}>
        <MapPinned className="pointer-events-none absolute -right-3 -top-2 h-20 w-20 text-white/10" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">Ficha del distrito</p>
        <h3 className="text-xl font-bold">{d.nombres.join(" y ")}</h3>
        <p className="text-sm text-white/85">
          {entero(d.clientes)} clientes · perfil típico: {OCUPACIONES[d.ocupacionPrincipal].toLowerCase().replace(/s$/, "")}, {d.edadMedia} años
        </p>
      </header>
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl bg-[color-mix(in_srgb,var(--cp-login-light)_45%,var(--color-superficie))] p-3">
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
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-acento px-4 font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
        >
          <Megaphone className="h-5 w-5" aria-hidden />
          Crear campaña para este distrito
        </button>
      </div>
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
    <div className={`${TARJETA} flex flex-col gap-2 p-4`}>
      <h3 className="font-bold">Ranking · {m.nombre}</h3>
      <ol className="flex flex-col">
        {orden.map((d, i) => (
          <li key={d.ubigeo}>
            <button
              type="button"
              onClick={() => alSeleccionar(d.ubigeo)}
              aria-current={d.ubigeo === seleccionado ? "true" : undefined}
              className={`grid min-h-9 w-full grid-cols-[1.5rem_minmax(0,8rem)_1fr_auto] items-center gap-2 rounded-lg px-1.5 text-left text-sm transition-colors ${
                d.ubigeo === seleccionado ? "bg-marca-claro font-bold" : "hover:bg-fondo"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold tabular-nums ${i < 3 ? "bg-marca text-white" : "text-tenue"}`}
              >
                {i + 1}
              </span>
              <span className="truncate">{d.nombres.join(" y ")}</span>
              <span className="h-2 overflow-hidden rounded-full bg-fondo" aria-hidden>
                <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(valor(d, metrica) / max) * 100}%`, background: DEGRADADO_BARRA }} />
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
    <div className={`${TARJETA} overflow-x-auto p-3 sm:p-5`}>
      <table className="w-full min-w-[32rem] border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="text-left text-tenue" scope="col">
              <span className="sr-only">Ocupación</span>
            </th>
            {gamas.map((g) => (
              <th key={g} scope="col" className="pb-1 text-center text-xs font-bold uppercase tracking-wider text-tenue">
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
                if (!s) return <td key={g} className="rounded-xl bg-fondo p-4 text-center text-tenue">—</td>;
                const i = tramoDe(s.tasaDigital, cortes);
                return (
                  <td
                    key={g}
                    className="rounded-xl p-4 text-center transition-transform hover:scale-[1.02]"
                    style={{ background: colorTramo(i), color: tintaTramo(i) }}
                    title={`${OCUPACIONES[o]}, ${GAMAS[g].toLowerCase()}: ${s.clientes} clientes, ${pct(s.tasaDigital)} de operaciones por la app, ${pct(s.asistida)} con vista asistida`}
                  >
                    <span className="block text-2xl font-bold tabular-nums">{pct(s.tasaDigital)}</span>
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
      <p className="mt-2 px-1 text-xs text-tenue">Más intenso = más operaciones por la app. Pasa el mouse por una celda para ver el detalle.</p>
    </div>
  );
}
