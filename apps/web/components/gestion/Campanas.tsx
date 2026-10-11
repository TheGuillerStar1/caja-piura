"use client";
// Modo campaña: elegir un segmento (distritos, ocupación, gama, zona, edad), elegir una acción y ver el embudo
// proyectado al simular 30, 60 y 90 días. Los resultados son proyecciones sobre perfiles ficticios (apps/api/src/gestion/logica.ts).
import type { AccionCampana, AlcanceSegmentoRes, CampanaRes, CrearCampanaReq, GamaCelular, OcupacionCliente, ResumenGestionRes, SegmentoCampana, ZonaCliente } from "@cp/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiFallo, api } from "@/lib/api";
import { entero, GAMAS, OCUPACIONES, pct, soles, ZONAS } from "./formato";

export const ACCIONES: Record<AccionCampana, { nombre: string; detalle: string }> = {
  AVISO: { nombre: "Aviso", detalle: "Mensaje en la app (o SMS si no la usa) invitando a pagar desde el celular." },
  RECORDATORIO_CUOTA: { nombre: "Recordatorio de cuota", detalle: "Aviso unos días antes del vencimiento con el botón «Pagar ahora»." },
  CASHBACK_DOBLE: { nombre: "Cashback doble", detalle: "Durante la campaña, cada pago por la app devuelve el doble de cashback." },
};

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
        <h3 className="text-lg font-bold">Campañas lanzadas</h3>
        {error && <p className="rounded-xl bg-error-claro p-3 text-error">{error}</p>}
        {!campanas && !error && <div className="h-40 animate-pulse rounded-2xl bg-superficie-2" aria-hidden />}
        {campanas?.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-linea p-6 text-center text-tenue">
            Aún no hay campañas. Elige un segmento a la izquierda (o toca un distrito en el mapa) y lánzala.
          </p>
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
      className={`min-h-10 rounded-full border-2 px-3 text-sm font-bold transition-colors ${
        activo ? "border-marca bg-marca text-white" : "border-linea bg-superficie text-tinta hover:border-marca"
      }`}
    >
      {children}
    </button>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-bold text-tenue">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
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
    <form onSubmit={lanzar} className="flex flex-col gap-4 rounded-2xl border-2 border-linea bg-superficie p-4">
      <h3 className="text-lg font-bold">Nueva campaña</h3>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-bold text-tenue">1. ¿Qué hacemos?</legend>
        {(Object.keys(ACCIONES) as AccionCampana[]).map((a) => (
          <label
            key={a}
            className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 transition-colors ${accion === a ? "border-marca bg-marca-claro" : "border-linea hover:border-marca"}`}
          >
            <input type="radio" name="accion" value={a} checked={accion === a} onChange={() => setAccion(a)} className="mt-1 h-4 w-4 accent-[var(--color-marca)]" />
            <span className="flex flex-col">
              <span className="font-bold">{ACCIONES[a].nombre}</span>
              <span className="text-sm text-tenue">{ACCIONES[a].detalle}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-tenue">2. ¿A quién?</p>
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
          <label className="flex flex-col gap-1 text-sm font-bold text-tenue">
            Edad desde
            <input
              type="number"
              min={18}
              max={99}
              value={segmento.edadMin}
              onChange={(e) => cambiar({ edadMin: Math.max(18, Math.min(99, Number(e.target.value) || 18)) })}
              className="min-h-10 w-24 rounded-lg border-2 border-linea bg-superficie px-2 text-base text-tinta"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-tenue">
            hasta
            <input
              type="number"
              min={18}
              max={99}
              value={segmento.edadMax}
              onChange={(e) => cambiar({ edadMax: Math.max(18, Math.min(99, Number(e.target.value) || 99)) })}
              className="min-h-10 w-24 rounded-lg border-2 border-linea bg-superficie px-2 text-base text-tinta"
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

      <div className="rounded-xl bg-fondo p-3" aria-live="polite">
        {alcance ? (
          <>
            <p className="text-2xl font-bold tabular-nums">
              {entero(alcance.clientes)} <span className="text-base font-normal text-tenue">clientes</span>
            </p>
            <p className="text-sm text-tenue">
              {entero(alcance.porApp)} reciben el aviso en la app · {entero(alcance.porSms)} por SMS · {entero(alcance.opsVentanillaMes)} operaciones en
              ventanilla al mes
            </p>
          </>
        ) : (
          <p className="text-tenue">Calculando alcance…</p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-bold text-tenue">
        3. Nombre
        <input
          value={nombreFinal}
          maxLength={80}
          onChange={(e) => {
            setNombre(e.target.value);
            setNombreEditado(true);
          }}
          className="min-h-11 rounded-lg border-2 border-linea bg-superficie px-3 text-base font-normal text-tinta"
        />
      </label>

      {error && <p className="text-error">{error}</p>}
      <button
        type="submit"
        disabled={enviando || !alcance?.clientes}
        className="rounded-boton bg-marca px-5 py-3 text-lg font-bold text-white transition-colors hover:bg-marca-oscuro disabled:bg-linea disabled:text-tenue"
      >
        {enviando ? "Lanzando…" : alcance && !alcance.clientes ? "Ningún cliente en este segmento" : "Lanzar campaña"}
      </button>
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

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-linea bg-superficie p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-marca">{ACCIONES[c.accion].nombre}</p>
          <h4 className="text-lg font-bold leading-tight">{c.nombre}</h4>
          <p className="text-sm text-tenue">
            {resumenSegmento(c.segmento, nombreDistrito)} · {entero(c.alcance.clientes)} clientes
          </p>
        </div>
        <span className="rounded-full bg-fondo px-3 py-1 text-sm font-bold tabular-nums">
          {c.diasSimulados === 0 ? "Día 0" : `Día ${c.diasSimulados}`}
        </span>
      </header>

      {c.diasSimulados === 0 ? (
        <p className="rounded-xl bg-fondo p-3 text-sm text-tenue">Campaña lista. Simula 30 días para ver cómo responde el segmento.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2" aria-label="Embudo de la campaña">
            {pasos.map((p) => (
              <li key={p.nombre} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-2 text-sm">
                <span className="truncate">{p.nombre}</span>
                <span className="h-3 overflow-hidden rounded-r bg-fondo" aria-hidden>
                  <span className="block h-full rounded-r bg-marca transition-[width] duration-500" style={{ width: `${(p.n / max) * 100}%` }} />
                </span>
                <span className="w-16 text-right font-bold tabular-nums">
                  {entero(p.n)} <span className="text-xs font-normal text-tenue">{pct(p.n / max)}</span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Dato titulo="Ops. que dejan la ventanilla" valor={`${entero(c.opsMigradasMes)}/mes`} />
            <Dato titulo="Ahorro" valor={`${soles(c.ahorroMes)}/mes`} />
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
          className="min-h-11 rounded-boton bg-marca px-4 font-bold text-white hover:bg-marca-oscuro disabled:bg-linea disabled:text-tenue"
        >
          {ocupado === "simular" ? "Simulando…" : c.diasSimulados >= 90 ? "Campaña terminada (90 días)" : "Simular 30 días"}
        </button>
        <button
          type="button"
          onClick={borrar}
          onBlur={() => setConfirmarBorrar(false)}
          disabled={ocupado !== null}
          className="min-h-11 rounded-boton border-2 border-linea px-4 font-bold text-tenue hover:border-error hover:text-error"
        >
          {confirmarBorrar ? "Toca otra vez para borrar" : "Borrar"}
        </button>
      </div>
      <p className="text-xs text-tenue">
        Proyección (valor esperado) con datos ficticios · ahorro de {soles(supuestos.costoOpVentanilla - supuestos.costoOpDigital)} por operación que pasa de ventanilla a la app
      </p>
    </article>
  );
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl bg-fondo p-2.5">
      <dt className="text-xs text-tenue">{titulo}</dt>
      <dd className="text-lg font-bold tabular-nums leading-tight">{valor}</dd>
      {nota && <dd className="text-xs text-tenue">{nota}</dd>}
    </div>
  );
}
