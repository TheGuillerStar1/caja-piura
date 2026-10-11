"use client";
// Modo campaña: elegir un segmento (distritos, ocupación, gama, zona, edad), elegir una acción y ver el embudo
// proyectado al simular 30, 60 y 90 días. Los resultados son proyecciones sobre perfiles ficticios (apps/api/src/gestion/logica.ts).
import type { AccionCampana, AlcanceSegmentoRes, CampanaRes, CrearCampanaReq, GamaCelular, OcupacionCliente, ResumenGestionRes, SegmentoCampana, ZonaCliente } from "@cp/shared";
import { Bell, CalendarClock, FastForward, Gift, type LucideIcon, Megaphone, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiFallo, api } from "@/lib/api";
import { DEGRADADO_BARRA, DEGRADADO_MARCA, entero, GAMAS, OCUPACIONES, pct, soles, TARJETA, ZONAS } from "./formato";

export const ACCIONES: Record<AccionCampana, { nombre: string; detalle: string; icono: LucideIcon }> = {
  AVISO: { nombre: "Aviso", detalle: "Mensaje en la app (o SMS si no la usa) invitando a pagar desde el celular.", icono: Bell },
  RECORDATORIO_CUOTA: { nombre: "Recordatorio de cuota", detalle: "Aviso unos días antes del vencimiento con el botón «Pagar ahora».", icono: CalendarClock },
  CASHBACK_DOBLE: { nombre: "Cashback doble", detalle: "Durante la campaña, cada pago por la app devuelve el doble de cashback.", icono: Gift },
};

/** Fondo lila suave del manual (pantallas de acceso) para recuadros de apoyo. */
const LILA = "bg-[color-mix(in_srgb,var(--cp-login-light)_45%,var(--color-superficie))]";

const SEGMENTO_VACIO: SegmentoCampana = { distritos: [], ocupaciones: [], gamas: [], zonas: [], edadMin: 18, edadMax: 99, soloVentanilla: false };

const alternar = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const mensajeDe = (e: unknown) => (e instanceof ApiFallo ? e.message : "Ocurrió un error. Inténtalo de nuevo.");

/** Nombre sugerido a partir del segmento: «Agricultores de Tambogrande». */
function nombreSugerido(s: SegmentoCampana, accion: AccionCampana, nombreDistrito: (u: string) => string) {
  const quien = s.ocupaciones.length === 1 ? OCUPACIONES[s.ocupaciones[0]] : "Clientes";
  const donde = s.distritos.length === 1 ? ` de ${nombreDistrito(s.distritos[0])}` : s.distritos.length > 1 ? ` de ${s.distritos.length} distritos` : " de toda la región";
  return `${ACCIONES[accion].nombre} · ${quien}${donde}${s.soloVentanilla ? " que van a ventanilla" : ""}`;
}

export function Campanas({ resumen, prellenar }: { resumen: ResumenGestionRes; prellenar: { ubigeo: string; n: number } | null }) {
  const [campanas, setCampanas] = useState<CampanaRes[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nombreDistrito = useCallback(
    (u: string) => resumen.distritos.find((d) => d.ubigeo === u)?.nombres.join(" y ") ?? u,
    [resumen.distritos],
  );

  const cargar = useCallback(() => {
    api<CampanaRes[]>("/gestion/campanas")
      .then((c) => {
        setCampanas(c);
        setError(null);
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);
  useEffect(cargar, [cargar]);

  const reemplazar = (c: CampanaRes) => setCampanas((cs) => cs?.map((x) => (x.id === c.id ? c : x)) ?? [c]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <NuevaCampana
        resumen={resumen}
        prellenar={prellenar}
        nombreDistrito={nombreDistrito}
        alCrear={(c) => setCampanas((cs) => [c, ...(cs ?? [])])}
      />
      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          Campañas lanzadas
          {!!campanas?.length && <span className="rounded-full bg-marca px-2.5 py-0.5 text-sm text-white tabular-nums">{campanas.length}</span>}
        </h3>
        {error && <p className="rounded-xl bg-error-claro p-3 text-error">{error}</p>}
        {!campanas && !error && <div className="h-40 animate-pulse rounded-2xl bg-superficie-2" aria-hidden />}
        {campanas?.length === 0 && (
          <div className={`${TARJETA} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
            <span className="grid h-16 w-16 place-items-center rounded-full text-white shadow-md" style={{ background: DEGRADADO_MARCA }} aria-hidden>
              <Megaphone className="h-8 w-8" />
            </span>
            <p className="text-lg font-bold">Aún no hay campañas</p>
            <p className="max-w-sm text-sm text-tenue">Elige un segmento a la izquierda, o toca un distrito en el mapa y luego «Crear campaña para este distrito».</p>
          </div>
        )}
        {campanas?.map((c) => (
          <TarjetaCampana
            key={c.id}
            c={c}
            supuestos={resumen.supuestos}
            nombreDistrito={nombreDistrito}
            alCambiar={reemplazar}
            alBorrar={() => setCampanas((cs) => cs?.filter((x) => x.id !== c.id) ?? null)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`min-h-10 rounded-full border-2 px-3.5 text-sm font-bold transition-colors ${
        activo ? "border-transparent bg-marca text-white shadow-sm" : "border-linea bg-superficie text-tinta hover:border-marca hover:text-marca"
      }`}
    >
      {children}
    </button>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-bold uppercase tracking-wider text-tenue">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Paso({ n, texto, leyenda }: { n: number; texto: string; leyenda?: boolean }) {
  const Etiqueta = leyenda ? "legend" : "span";
  return (
    <Etiqueta className="mb-1 flex items-center gap-2 font-bold">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-marca text-xs text-white" aria-hidden>
        {n}
      </span>
      {texto}
    </Etiqueta>
  );
}

function NuevaCampana({
  resumen,
  prellenar,
  nombreDistrito,
  alCrear,
}: {
  resumen: ResumenGestionRes;
  prellenar: { ubigeo: string; n: number } | null;
  nombreDistrito: (u: string) => string;
  alCrear: (c: CampanaRes) => void;
}) {
  const [segmento, setSegmento] = useState<SegmentoCampana>(SEGMENTO_VACIO);
  const [accion, setAccion] = useState<AccionCampana>("AVISO");
  const [nombre, setNombre] = useState("");
  const [nombreEditado, setNombreEditado] = useState(false);
  const [alcance, setAlcance] = useState<AlcanceSegmentoRes | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // «Crear campaña aquí» desde el mapa: empieza un segmento con ese distrito.
  useEffect(() => {
    if (prellenar) setSegmento({ ...SEGMENTO_VACIO, distritos: [prellenar.ubigeo] });
  }, [prellenar]);

  // Alcance en vivo (con una pequeña espera para no consultar en cada toque).
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<AlcanceSegmentoRes>("/gestion/segmento", { cuerpo: segmento, signal: ctrl.signal })
        .then(setAlcance)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [segmento]);

  const sugerido = nombreSugerido(segmento, accion, nombreDistrito);
  const nombreFinal = nombreEditado ? nombre : sugerido;
  const distritosOrdenados = useMemo(
    () => [...resumen.distritos].sort((a, b) => nombreDistrito(a.ubigeo).localeCompare(nombreDistrito(b.ubigeo))),
    [resumen.distritos, nombreDistrito],
  );
  const cambiar = (p: Partial<SegmentoCampana>) => setSegmento((s) => ({ ...s, ...p }));

  async function lanzar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const cuerpo: CrearCampanaReq = { nombre: nombreFinal, accion, segmento };
      alCrear(await api<CampanaRes>("/gestion/campanas", { cuerpo }));
      setSegmento(SEGMENTO_VACIO);
      setNombreEditado(false);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={lanzar} className={`${TARJETA} flex flex-col overflow-hidden`}>
      <header className="relative overflow-hidden px-5 py-4 text-white" style={{ background: DEGRADADO_MARCA }}>
        <Megaphone className="pointer-events-none absolute -right-2 -top-3 h-24 w-24 -rotate-12 text-white/10" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">Modo campaña</p>
        <h3 className="text-xl font-bold">Nueva campaña</h3>
      </header>

      <div className="flex flex-col gap-5 p-5">
        <fieldset className="flex flex-col gap-2">
          <Paso n={1} texto="¿Qué hacemos?" leyenda />
          {(Object.keys(ACCIONES) as AccionCampana[]).map((a) => {
            const I = ACCIONES[a].icono;
            const activo = accion === a;
            return (
              <label
                key={a}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-marca ${
                  activo ? "border-marca bg-marca-claro" : "border-linea hover:border-marca"
                }`}
              >
                <input type="radio" name="accion" value={a} checked={activo} onChange={() => setAccion(a)} className="sr-only" />
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors ${activo ? "bg-marca text-white" : `${LILA} text-[var(--cp-brand)]`}`} aria-hidden>
                  <I className="h-5 w-5" />
                </span>
                <span className="flex flex-col">
                  <span className="font-bold">{ACCIONES[a].nombre}</span>
                  <span className="text-sm leading-snug text-tenue">{ACCIONES[a].detalle}</span>
                </span>
                <span className={`ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${activo ? "border-marca bg-marca" : "border-linea-fuerte"}`} aria-hidden>
                  {activo && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex flex-col gap-3">
          <Paso n={2} texto="¿A quién?" />
          <Grupo titulo="Distritos">
            {segmento.distritos.map((u) => (
              <Chip key={u} activo onClick={() => cambiar({ distritos: segmento.distritos.filter((x) => x !== u) })}>
                {nombreDistrito(u)} ✕
              </Chip>
            ))}
            <select
              aria-label="Agregar distrito"
              value=""
              onChange={(e) => e.target.value && cambiar({ distritos: [...segmento.distritos, e.target.value] })}
              className="min-h-10 rounded-full border-2 border-linea bg-superficie px-3 text-sm font-bold"
            >
              <option value="">{segmento.distritos.length ? "+ Otro distrito" : "Todos · elegir distrito"}</option>
              {distritosOrdenados
                .filter((d) => !segmento.distritos.includes(d.ubigeo))
                .map((d) => (
                  <option key={d.ubigeo} value={d.ubigeo}>
                    {nombreDistrito(d.ubigeo)}
                  </option>
                ))}
            </select>
          </Grupo>
          <Grupo titulo="Ocupación">
            {(Object.keys(OCUPACIONES) as OcupacionCliente[]).map((o) => (
              <Chip key={o} activo={segmento.ocupaciones.includes(o)} onClick={() => cambiar({ ocupaciones: alternar(segmento.ocupaciones, o) })}>
                {OCUPACIONES[o]}
              </Chip>
            ))}
          </Grupo>
          <Grupo titulo="Celular">
            {(Object.keys(GAMAS) as GamaCelular[]).map((g) => (
              <Chip key={g} activo={segmento.gamas.includes(g)} onClick={() => cambiar({ gamas: alternar(segmento.gamas, g) })}>
                {GAMAS[g]}
              </Chip>
            ))}
          </Grupo>
          <Grupo titulo="Zona">
            {(Object.keys(ZONAS) as ZonaCliente[]).map((z) => (
              <Chip key={z} activo={segmento.zonas.includes(z)} onClick={() => cambiar({ zonas: alternar(segmento.zonas, z) })}>
                {ZONAS[z]}
              </Chip>
            ))}
          </Grupo>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-tenue">
              Edad desde
              <input
                type="number"
                min={18}
                max={99}
                value={segmento.edadMin}
                onChange={(e) => cambiar({ edadMin: Math.max(18, Math.min(99, Number(e.target.value) || 18)) })}
                className="min-h-10 w-24 rounded-xl border-2 border-linea bg-superficie px-3 text-base normal-case tracking-normal text-tinta"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-tenue">
              hasta
              <input
                type="number"
                min={18}
                max={99}
                value={segmento.edadMax}
                onChange={(e) => cambiar({ edadMax: Math.max(18, Math.min(99, Number(e.target.value) || 99)) })}
                className="min-h-10 w-24 rounded-xl border-2 border-linea bg-superficie px-3 text-base normal-case tracking-normal text-tinta"
              />
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={segmento.soloVentanilla}
                onChange={(e) => cambiar({ soloVentanilla: e.target.checked })}
                className="h-5 w-5 accent-[var(--color-marca)]"
              />
              Solo quienes van más a ventanilla
            </label>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl ${LILA} p-4`} aria-live="polite">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-superficie text-[var(--cp-brand)] shadow-sm" aria-hidden>
            <Users className="h-6 w-6" />
          </span>
          {alcance ? (
            <div>
              <p className="text-3xl font-bold leading-none tabular-nums">
                {entero(alcance.clientes)} <span className="text-base font-normal text-tenue">clientes en el segmento</span>
              </p>
              <p className="mt-1 text-sm text-tenue">
                {entero(alcance.porApp)} reciben el aviso en la app · {entero(alcance.porSms)} por SMS · {entero(alcance.opsVentanillaMes)} operaciones en
                ventanilla al mes
              </p>
            </div>
          ) : (
            <p className="text-tenue">Calculando alcance…</p>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <Paso n={3} texto="Nombre" />
          <input
            value={nombreFinal}
            maxLength={80}
            onChange={(e) => {
              setNombre(e.target.value);
              setNombreEditado(true);
            }}
            className="min-h-11 rounded-xl border-2 border-linea bg-superficie px-3 text-base font-normal text-tinta"
          />
        </label>

        {error && <p className="text-error">{error}</p>}
        <button
          type="submit"
          disabled={enviando || !alcance?.clientes}
          className="flex items-center justify-center gap-2 rounded-xl bg-acento px-5 py-3 text-lg font-bold text-white shadow-[0_8px_20px_-8px_var(--cp-action-focus)] transition-[filter] hover:brightness-110 disabled:bg-linea disabled:text-tenue disabled:shadow-none"
        >
          <Megaphone className="h-5 w-5" aria-hidden />
          {enviando ? "Lanzando…" : alcance && !alcance.clientes ? "Ningún cliente en este segmento" : "Lanzar campaña"}
        </button>
      </div>
    </form>
  );
}

function resumenSegmento(s: SegmentoCampana, nombreDistrito: (u: string) => string) {
  const partes: string[] = [];
  partes.push(s.distritos.length ? s.distritos.map(nombreDistrito).join(", ") : "Toda la región");
  if (s.ocupaciones.length) partes.push(s.ocupaciones.map((o) => OCUPACIONES[o].toLowerCase()).join(", "));
  if (s.gamas.length) partes.push(s.gamas.map((g) => GAMAS[g].toLowerCase()).join(", "));
  if (s.zonas.length) partes.push(s.zonas.map((z) => ZONAS[z].toLowerCase()).join(", "));
  if (s.edadMin > 18 || s.edadMax < 99) partes.push(`${s.edadMin}–${s.edadMax} años`);
  if (s.soloVentanilla) partes.push("van más a ventanilla");
  return partes.join(" · ");
}

function TarjetaCampana({
  c,
  supuestos,
  nombreDistrito,
  alCambiar,
  alBorrar,
}: {
  c: CampanaRes;
  supuestos: ResumenGestionRes["supuestos"];
  nombreDistrito: (u: string) => string;
  alCambiar: (c: CampanaRes) => void;
  alBorrar: () => void;
}) {
  const [ocupado, setOcupado] = useState<null | "simular" | "borrar">(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simular() {
    setOcupado("simular");
    setError(null);
    try {
      alCambiar(await api<CampanaRes>(`/gestion/campanas/${c.id}/simular`, { metodo: "POST" }));
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setOcupado(null);
    }
  }
  async function borrar() {
    if (!confirmarBorrar) return setConfirmarBorrar(true);
    setOcupado("borrar");
    try {
      await api(`/gestion/campanas/${c.id}`, { metodo: "DELETE" });
      alBorrar();
    } catch (e) {
      setError(mensajeDe(e));
      setOcupado(null);
    }
  }

  const e = c.embudo;
  const pasos = [
    { nombre: "Recibieron el aviso", n: e.enviados },
    { nombre: "Lo abrieron", n: e.abrieron },
    { nombre: "Pagaron por la app", n: e.pagaron },
    { nombre: "Siguen en la app", n: e.siguenUsando },
  ];
  const max = Math.max(1, c.alcance.clientes);
  const recuperaEnDias = c.ahorroMes > 0 ? Math.ceil(c.costo / (c.ahorroMes / 30)) : null;
  const anual = c.ahorroMes * 12 - c.costo;
  const Icono = ACCIONES[c.accion].icono;

  return (
    <article className={`${TARJETA} flex flex-col overflow-hidden`}>
      <header className="flex items-start gap-3 border-b border-linea px-4 py-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: DEGRADADO_MARCA }} aria-hidden>
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-marca">{ACCIONES[c.accion].nombre}</p>
          <h4 className="text-lg font-bold leading-tight">{c.nombre}</h4>
          <p className="text-sm text-tenue">
            {resumenSegmento(c.segmento, nombreDistrito)} · {entero(c.alcance.clientes)} clientes
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full bg-acento px-3 py-1 text-sm font-bold text-white tabular-nums">Día {c.diasSimulados}</span>
          <span className="flex gap-0.5" role="img" aria-label={`${c.diasSimulados} de 90 días simulados`}>
            {[30, 60, 90].map((d) => (
              <span key={d} className={`h-1.5 w-5 rounded-full ${c.diasSimulados >= d ? "bg-acento" : "bg-linea"}`} />
            ))}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {c.diasSimulados === 0 ? (
          <p className={`rounded-xl ${LILA} p-3 text-sm`}>Campaña lista. Toca «Simular 30 días» para ver cómo responde el segmento.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2" aria-label="Embudo de la campaña">
              {pasos.map((p) => (
                <li key={p.nombre} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate">{p.nombre}</span>
                  <span className="h-3.5 overflow-hidden rounded-full bg-fondo" aria-hidden>
                    <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${(p.n / max) * 100}%`, background: DEGRADADO_BARRA }} />
                  </span>
                  <span className="w-16 text-right font-bold tabular-nums">
                    {entero(p.n)} <span className="text-xs font-normal text-tenue">{pct(p.n / max)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Dato titulo="Ops. que dejan la ventanilla" valor={`${entero(c.opsMigradasMes)}/mes`} />
              <Dato titulo="Ahorro" valor={`${soles(c.ahorroMes)}/mes`} destacado />
              <Dato titulo="Costo de la campaña" valor={soles(c.costo)} />
              <Dato
                titulo="Retorno"
                valor={recuperaEnDias == null ? "—" : recuperaEnDias <= 1 ? "Inmediato" : `${recuperaEnDias} días`}
                nota={c.ahorroMes > 0 ? `${soles(anual)} en 12 meses` : undefined}
              />
            </dl>
          </>
        )}

        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={simular}
            disabled={ocupado !== null || c.diasSimulados >= 90}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 font-bold text-white shadow-sm hover:bg-marca-oscuro disabled:bg-linea disabled:text-tenue disabled:shadow-none"
          >
            <FastForward className="h-4 w-4" aria-hidden />
            {ocupado === "simular" ? "Simulando…" : c.diasSimulados >= 90 ? "Campaña terminada (90 días)" : "Simular 30 días"}
          </button>
          <button
            type="button"
            onClick={borrar}
            onBlur={() => setConfirmarBorrar(false)}
            disabled={ocupado !== null}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-linea px-4 font-bold text-tenue hover:border-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {confirmarBorrar ? "Toca otra vez para borrar" : "Borrar"}
          </button>
        </div>
        <p className="text-xs text-tenue">
          Proyección (valor esperado) con datos ficticios · ahorro de {soles(supuestos.costoOpVentanilla - supuestos.costoOpDigital)} por operación que pasa de ventanilla a la app
        </p>
      </div>
    </article>
  );
}

function Dato({ titulo, valor, nota, destacado }: { titulo: string; valor: string; nota?: string; destacado?: boolean }) {
  if (destacado)
    return (
      <div className="rounded-xl p-2.5 text-white" style={{ background: DEGRADADO_MARCA }}>
        <dt className="text-xs text-white/85">{titulo}</dt>
        <dd className="text-lg font-bold tabular-nums leading-tight">{valor}</dd>
      </div>
    );
  return (
    <div className={`rounded-xl ${LILA} p-2.5`}>
      <dt className="text-xs text-tenue">{titulo}</dt>
      <dd className="text-lg font-bold tabular-nums leading-tight">{valor}</dd>
      {nota && <dd className="text-xs text-tenue">{nota}</dd>}
    </div>
  );
}
