"use client";
// Dueño: Agente D. Panel del jurado (público): indicadores en vivo, se actualiza cada 5 s.
// Mismo estilo de marca que el Centro de mando (/gestion): ver components/gestion/Marca.tsx.
import type { KpisRes } from "@cp/shared";
import { Activity, ArrowLeftRight, ChevronRight, CircleCheck, Filter, Smartphone, Sparkles, Timer, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Cargando } from "@/components/ui";
import { DEGRADADO_BARRA, DEGRADADO_MARCA, TARJETA } from "@/components/gestion/formato";
import { Funciona } from "@/components/gestion/Funciona";
import { Encabezado, PieMarca, Portada, Tile } from "@/components/gestion/Marca";
import { api } from "@/lib/api";

const NOMBRES: Record<string, string> = {
  inicio: "Inicio",
  "pagar-cuota": "Pagar cuota",
  "pagar-frecuentes": "Pagos frecuentes",
  "pagar-recibo": "Pagar recibo (foto)",
  confirmar: "Confirmar pago",
  exito: "Pago exitoso",
  entrar: "Ingreso (DNI y clave)",
  "guardar-frecuente": "Guardar pago frecuente",
  "pago-fallido": "Pago fallido",
  "leer-recibo": "Leer recibo con foto",
  "pagar-servicios": "Pagar servicios",
  "pagar-creditos": "Pagar créditos",
};
/** Nombre legible de una pantalla; si no está en la lista, «guardar-frecuente» → «Guardar frecuente». */
const nombreDe = (p: string) => NOMBRES[p] ?? (p.charAt(0).toUpperCase() + p.slice(1)).replace(/-/g, " ");
const FLUJOS: { id: keyof KpisRes["tiempoMedioSeg"]; nombre: string }[] = [
  { id: "CUOTA", nombre: "Cuota" },
  { id: "FRECUENTE", nombre: "Frecuente" },
  { id: "RECIBO", nombre: "Recibo con foto" },
];

const pct = (x: number) => `${Math.round(x * 100)} %`;
const seg = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`);
const LILA = "bg-[color-mix(in_srgb,var(--cp-login-light)_45%,var(--color-superficie))]";

export default function PanelPage() {
  const [kpis, setKpis] = useState<KpisRes | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      api<KpisRes>("/panel/kpis")
        .then((k) => {
          if (!vivo) return;
          setKpis(k);
          setActualizado(new Date());
          setError(false);
        })
        .catch(() => vivo && setError(true));
    cargar();
    const t = setInterval(cargar, 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-fondo">
      <Portada
        etiqueta="Panel del jurado"
        titulo="¿Lo logran solos y más rápido?"
        texto="Indicadores en vivo de quienes prueban la app ahora mismo: si terminan el pago sin ayuda, cuánto tardan y dónde se traban."
        secciones={[
          { href: "#funciona", texto: "¿Funciona?", icono: Activity },
          { href: "#antes-ahora", texto: "Hoy vs. con Pía", icono: ArrowLeftRight },
          { href: "#indicadores", texto: "Rapidez", icono: Timer },
          { href: "#embudo", texto: "Abandono", icono: Filter },
          { href: "#vistas", texto: "Vistas", icono: Users },
        ]}
        insignia="Modo Acompaña · prototipo"
        enlace={{ href: "/gestion", texto: "Centro de mando →" }}
        actualizado={actualizado}
        error={error}
      />

      <main className="relative mx-auto -mt-36 flex w-full max-w-7xl flex-col gap-10 px-4 pb-10 sm:px-8 lg:px-12">
        <Funciona />
        <AntesYAhora />
        {!kpis ? (
          <div className={`${TARJETA} py-6`}>
            <Cargando texto="Cargando indicadores…" />
          </div>
        ) : (
          <Contenido k={kpis} />
        )}
      </main>

      <PieMarca>
        <p>
          <b>Éxito sin ayuda</b> = pagos exitosos sin asistente ni guía ÷ intentos de pago (pagos registrados + abandonos en la confirmación).{" "}
          <b>Tiempo</b> = promedio desde que se inicia la operación hasta la constancia. <b>Referencia actual</b>: tiempo estimado del flujo de la app
          actual (provisional). Prototipo con datos ficticios.
        </p>
      </PieMarca>
    </div>
  );
}

/** Pagar la cuota en la app de hoy (según capturas de la app oficial del 10 oct) frente a la ayuda de Pía. */
function AntesYAhora() {
  const hoy = ["Pagos", "Pago de créditos propios", "«Pagaré»", "«Cuenta origen»", "«Operación»", "Continuar", "Confirmar"];
  const pia = ["¿Necesitas ayuda?", "Pagar mi cuota", "Sí, prepáralo tú", "Confirmar pago"];
  return (
    <section id="antes-ahora" aria-labelledby="t-antes" className="flex scroll-mt-4 flex-col gap-4">
      <h2 id="t-antes" className="sr-only">
        Pagar la cuota: hoy y con Pía
      </h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <div className={`${TARJETA} flex flex-col gap-3 p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-tenue">Hoy en la app</p>
          <p className="text-4xl font-bold">
            ~10 <span className="text-xl font-medium text-tenue">toques</span>
          </p>
          <ol className="flex flex-wrap items-center gap-1 text-sm" aria-label="Pasos hoy">
            {hoy.map((p, i) => (
              <li key={p} className="flex items-center gap-1">
                <span className={`rounded-lg px-2 py-1 ${p.startsWith("«") ? "bg-error-claro font-bold text-error" : "bg-fondo"}`}>{p}</span>
                {i < hoy.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-tenue" aria-hidden />}
              </li>
            ))}
          </ol>
          <p className="text-sm text-tenue">
            <b className="text-error">3 palabras técnicas</b> antes de pagar, y cada lista son 2 toques. Muchos abandonan aquí y vuelven a la ventanilla.
          </p>
        </div>

        <div className="flex items-center justify-center" aria-hidden>
          <span className="flex items-center gap-1 rounded-full bg-acento px-4 py-2 text-sm font-bold text-white shadow-md lg:flex-col lg:px-3 lg:py-4">
            −60 %<span className="lg:text-xs"> toques</span>
          </span>
        </div>

        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 text-white shadow-[0_14px_32px_-12px_rgb(0_84_159/0.6)]" style={{ background: DEGRADADO_MARCA }}>
          <Sparkles className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-white/10" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wider text-white/85">Con Pía, sin cambiar la app</p>
          <p className="text-4xl font-bold">
            4 <span className="text-xl font-medium text-white/80">toques</span>
          </p>
          <ol className="flex flex-wrap items-center gap-1 text-sm" aria-label="Pasos con Pía">
            {pia.map((p, i) => (
              <li key={p} className="flex items-center gap-1">
                <span className="rounded-lg bg-white/18 px-2 py-1 font-bold">{p}</span>
                {i < pia.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-white/70" aria-hidden />}
              </li>
            ))}
          </ol>
          <p className="relative text-sm text-white/90">
            Sin palabras técnicas. O «Guíame»: Pía le señala cada paso en la app de siempre, para que aprenda a hacerlo solo.
          </p>
        </div>
      </div>
    </section>
  );
}

function Contenido({ k }: { k: KpisRes }) {
  const tiempos = FLUJOS.map((f) => k.tiempoMedioSeg[f.id]).filter((t): t is number => t != null);
  const tiempoMedio = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
  const mejora = tiempoMedio != null ? 1 - tiempoMedio / k.tiempoReferenciaActualSeg : null;

  return (
    <>
      <section id="indicadores" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-ind">
        <Encabezado
          icono={CircleCheck}
          id="t-ind"
          antetitulo="Rapidez y uso"
          titulo="Más rápido que la app de hoy"
          texto="Tiempo desde que empieza el pago hasta la constancia, y pagos hechos en el prototipo. Se actualizan cada 5 segundos."
        />
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Tile
            icono={Timer}
            titulo="Tiempo medio por operación"
            valor={tiempoMedio != null ? seg(tiempoMedio) : "—"}
            nota={
              mejora != null
                ? mejora >= 0
                  ? `${Math.round(mejora * 100)} % más rápido que hoy (${seg(k.tiempoReferenciaActualSeg)})`
                  : `${Math.round(-mejora * 100)} % más lento que hoy (${seg(k.tiempoReferenciaActualSeg)})`
                : `Referencia actual: ${seg(k.tiempoReferenciaActualSeg)}`
            }
          >
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {FLUJOS.map((f) => (
                <li key={f.id} className={`flex justify-between rounded-lg ${LILA} px-2.5 py-1`}>
                  <span className="text-tenue">{f.nombre}</span>
                  <span className="font-bold tabular-nums">{k.tiempoMedioSeg[f.id] != null ? seg(k.tiempoMedioSeg[f.id]!) : "—"}</span>
                </li>
              ))}
            </ul>
          </Tile>
          <Tile destacado etiqueta="En vivo" icono={Smartphone} titulo="Pagos desde el celular" valor={String(k.pagosTotales)} nota="pagos exitosos en el prototipo" />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-4">
        <section id="embudo" className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="t-emb">
          <Encabezado icono={Filter} id="t-emb" antetitulo="Embudo" titulo="¿Dónde se abandona?" texto="Visitas y abandonos en cada pantalla del pago." />
          <Embudo filas={k.embudo} />
        </section>
        <section id="vistas" className="flex scroll-mt-4 flex-col gap-4 self-start" aria-labelledby="t-vis">
          <Encabezado icono={Users} id="t-vis" antetitulo="Personalización" titulo="Vista recomendada" texto="Lo que el motor recomienda a cada perfil." />
          <Distribucion d={k.distribucionVistas} />
        </section>
      </div>
    </>
  );
}

function Embudo({ filas }: { filas: KpisRes["embudo"] }) {
  const max = Math.max(1, ...filas.map((f) => f.vistas));
  const peor = filas
    .filter((f) => f.abandonos > 0)
    .sort((a, b) => b.abandonos / Math.max(1, b.vistas) - a.abandonos / Math.max(1, a.vistas))[0];
  return (
    <div className={`${TARJETA} flex flex-1 flex-col gap-4 p-5`}>
      <p className={`rounded-xl px-3 py-2 text-sm ${peor ? "bg-error-claro" : LILA}`}>
        {peor ? (
          <>
            Más abandono en <b className="text-error">{nombreDe(peor.pantalla)}</b>: {pct(peor.abandonos / Math.max(1, peor.vistas))} de sus visitas
          </>
        ) : (
          "Aún no hay abandonos registrados"
        )}
      </p>
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.pantalla} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-bold">{nombreDe(f.pantalla)}</span>
              <span className="tabular-nums text-tenue">
                {f.vistas} {f.vistas === 1 ? "visita" : "visitas"}
                {f.abandonos > 0 && <span className="font-bold text-error"> · {f.abandonos} {f.abandonos === 1 ? "abandono" : "abandonos"}</span>}
              </span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-fondo" aria-hidden>
              <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${(f.vistas / max) * 100}%`, background: DEGRADADO_BARRA }} />
              <div
                className="absolute inset-y-0 rounded-r-full bg-error transition-[width] duration-500"
                style={{ left: `${(Math.max(0, f.vistas - f.abandonos) / max) * 100}%`, width: `${(Math.min(f.abandonos, f.vistas) / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="flex gap-4 text-xs text-tenue">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-full" style={{ background: DEGRADADO_BARRA }} /> visitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-full bg-error" /> abandonos
        </span>
      </p>
    </div>
  );
}

function Distribucion({ d }: { d: KpisRes["distribucionVistas"] }) {
  const total = d.ASISTIDA + d.ESTANDAR;
  const pa = total ? d.ASISTIDA / total : 0;
  return (
    <div className={`${TARJETA} flex flex-col gap-4 p-5`}>
      <p className="text-sm text-tenue">Sobre {total} perfiles de clientes (datos ficticios con el esquema de Caja Piura)</p>
      <div className="flex h-10 gap-0.5 overflow-hidden rounded-xl" aria-hidden>
        <div className="flex items-center justify-center text-sm font-bold text-white" style={{ width: `${pa * 100}%`, background: DEGRADADO_MARCA }}>
          {pa >= 0.12 && pct(pa)}
        </div>
        <div className={`flex items-center justify-center text-sm font-bold text-[var(--cp-brand)] ${LILA}`} style={{ width: `${(1 - pa) * 100}%` }}>
          {1 - pa >= 0.12 && pct(1 - pa)}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl p-3 text-white" style={{ background: DEGRADADO_MARCA }}>
          <dt className="text-white/85">Asistida</dt>
          <dd className="text-3xl font-bold tabular-nums">{d.ASISTIDA}</dd>
          <dd className="text-xs text-white/80">pantallas simples, paso a paso</dd>
        </div>
        <div className={`rounded-xl p-3 ${LILA}`}>
          <dt className="text-tenue">Estándar</dt>
          <dd className="text-3xl font-bold tabular-nums">{d.ESTANDAR}</dd>
          <dd className="text-xs text-tenue">todas las opciones a la vista</dd>
        </div>
      </dl>
      <p className="text-xs text-tenue">El motor solo recomienda: cada cliente elige su vista y puede cambiarla cuando quiera.</p>
    </div>
  );
}
