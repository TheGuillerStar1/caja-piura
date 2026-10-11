"use client";
// Dueño: Agente D. Panel del jurado (público): indicadores en vivo, se actualiza cada 5 s.
import type { KpisRes } from "@cp/shared";
import { useEffect, useState } from "react";
import { Cargando } from "@/components/ui";
import { api } from "@/lib/api";

const NOMBRES: Record<string, string> = {
  inicio: "Inicio",
  "pagar-cuota": "Pagar cuota",
  "pagar-frecuentes": "Pagos frecuentes",
  "pagar-recibo": "Pagar recibo (foto)",
  confirmar: "Confirmar pago",
  exito: "Pago exitoso",
};
const FLUJOS: { id: keyof KpisRes["tiempoMedioSeg"]; nombre: string }[] = [
  { id: "CUOTA", nombre: "Cuota" },
  { id: "FRECUENTE", nombre: "Frecuente" },
  { id: "RECIBO", nombre: "Recibo con foto" },
];

const pct = (x: number) => `${Math.round(x * 100)} %`;
const seg = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`);

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
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-marca">Caja Piura · Modo Acompaña</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Panel de indicadores</h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-tenue">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${error ? "bg-error" : "bg-exito"}`} aria-hidden />
          {error ? "Sin conexión, reintentando…" : actualizado ? `En vivo · ${actualizado.toLocaleTimeString("es-PE")}` : "Conectando…"}
        </p>
      </header>

      <AntesYAhora />

      {!kpis ? <Cargando texto="Cargando indicadores…" /> : <Contenido k={kpis} />}

      <footer className="mt-auto border-t border-linea pt-3 text-xs leading-relaxed text-tenue">
        <p>
          <b>Éxito sin ayuda</b> = pagos exitosos sin asistente ni guía ÷ intentos de pago (pagos registrados + abandonos en la confirmación).{" "}
          <b>Tiempo</b> = promedio desde que se inicia la operación hasta la constancia. <b>Referencia actual</b>: tiempo estimado del flujo de la app
          actual (provisional). Prototipo con datos ficticios.
        </p>
      </footer>
    </div>
  );
}

/** Pagar la cuota en la app de hoy (según capturas de la app oficial del 10 oct) frente a la ayuda de Pía. */
function AntesYAhora() {
  return (
    <section aria-labelledby="antes-ahora" className="grid gap-3 sm:grid-cols-2">
      <h2 id="antes-ahora" className="sr-only">
        Pagar la cuota: hoy y con Pía
      </h2>
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-linea bg-superficie p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-tenue">Hoy en la app</p>
        <p className="text-3xl font-bold">~10 toques</p>
        <p>
          Pagos › Pago de créditos propios › elegir <b>«Pagaré»</b>, <b>«Cuenta origen»</b> y <b>«Operación»</b> (pago interés, amortización,
          cancelación) › Continuar › Confirmar. Cada lista son 2 toques.
        </p>
        <p className="text-sm text-tenue">3 palabras técnicas antes de pagar. Muchos abandonan aquí y vuelven a la ventanilla.</p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-marca bg-marca-claro p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-marca">Con Pía, sin cambiar la app</p>
        <p className="text-3xl font-bold">4 toques</p>
        <p>
          «¿Necesitas ayuda?» › <b>Pagar mi cuota</b> › «Sí, prepáralo tú» › <b>Confirmar pago</b>. Sin palabras técnicas.
        </p>
        <p className="text-sm text-tenue">O «Guíame»: Pía le señala cada paso en la app de siempre, para que aprenda a hacerlo solo.</p>
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
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Indicadores principales">
        <Indicador titulo="Éxito sin ayuda" valor={pct(k.tasaExitoSinAyuda)} nota="de los intentos de pago terminaron sin ayuda">
          <Barra valor={k.tasaExitoSinAyuda} color="bg-exito" />
        </Indicador>

        <Indicador
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
          <ul className="mt-1 flex flex-col gap-0.5 text-sm text-tenue">
            {FLUJOS.map((f) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.nombre}</span>
                <span className="font-bold text-tinta">{k.tiempoMedioSeg[f.id] != null ? seg(k.tiempoMedioSeg[f.id]!) : "—"}</span>
              </li>
            ))}
          </ul>
        </Indicador>

        <Indicador titulo="Pagos desde el celular" valor={String(k.pagosTotales)} nota="pagos exitosos en el prototipo" />
      </section>

      <section className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <Embudo filas={k.embudo} />
        <Distribucion d={k.distribucionVistas} />
      </section>
    </>
  );
}

function Indicador({ titulo, valor, nota, children }: { titulo: string; valor: string; nota: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-linea bg-superficie p-4">
      <h2 className="text-sm font-bold text-tenue">{titulo}</h2>
      <p className="text-4xl font-bold tabular-nums text-tinta sm:text-5xl">{valor}</p>
      <p className="text-sm leading-snug text-tenue">{nota}</p>
      {children}
    </div>
  );
}

function Barra({ valor, color }: { valor: number; color: string }) {
  return (
    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-fondo">
      <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${Math.min(100, valor * 100)}%` }} />
    </div>
  );
}

function Embudo({ filas }: { filas: KpisRes["embudo"] }) {
  const max = Math.max(1, ...filas.map((f) => f.vistas));
  const peor = filas
    .filter((f) => f.abandonos > 0)
    .sort((a, b) => b.abandonos / Math.max(1, b.vistas) - a.abandonos / Math.max(1, a.vistas))[0];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-linea bg-superficie p-4">
      <div>
        <h2 className="text-lg font-bold">¿Dónde se abandona?</h2>
        <p className="text-sm text-tenue">
          {peor ? (
            <>
              Más abandono en <b className="text-tinta">{NOMBRES[peor.pantalla] ?? peor.pantalla}</b> ({pct(peor.abandonos / Math.max(1, peor.vistas))} de
              sus visitas)
            </>
          ) : (
            "Aún no hay abandonos registrados"
          )}
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {filas.map((f) => (
          <li key={f.pantalla} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-bold">{NOMBRES[f.pantalla] ?? f.pantalla}</span>
              <span className="tabular-nums text-tenue">
                {f.vistas} {f.vistas === 1 ? "visita" : "visitas"}
                {f.abandonos > 0 && <span className="font-bold text-error"> · {f.abandonos} abandonos</span>}
              </span>
            </div>
            <div className="relative h-4 overflow-hidden rounded bg-fondo" aria-hidden>
              <div className="absolute inset-y-0 left-0 rounded bg-marca/80 transition-[width] duration-500" style={{ width: `${(f.vistas / max) * 100}%` }} />
              <div
                className="absolute inset-y-0 rounded-r bg-error transition-[width] duration-500"
                style={{ left: `${(Math.max(0, f.vistas - f.abandonos) / max) * 100}%`, width: `${(Math.min(f.abandonos, f.vistas) / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="flex gap-4 text-xs text-tenue">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-marca/80" /> visitas
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-error" /> abandonos
        </span>
      </p>
    </div>
  );
}

function Distribucion({ d }: { d: KpisRes["distribucionVistas"] }) {
  const total = d.ASISTIDA + d.ESTANDAR;
  const pa = total ? d.ASISTIDA / total : 0;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-linea bg-superficie p-4">
      <div>
        <h2 className="text-lg font-bold">Vista recomendada por el motor</h2>
        <p className="text-sm text-tenue">Sobre {total} perfiles de clientes (datos ficticios con el esquema de Caja Piura)</p>
      </div>
      <div className="flex h-8 overflow-hidden rounded-lg" aria-hidden>
        <div className="flex items-center justify-center bg-marca text-sm font-bold text-white" style={{ width: `${pa * 100}%` }}>
          {pa >= 0.12 && pct(pa)}
        </div>
        <div className="flex items-center justify-center bg-marca-claro text-sm font-bold text-marca" style={{ width: `${(1 - pa) * 100}%` }}>
          {1 - pa >= 0.12 && pct(1 - pa)}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-fondo p-2">
          <dt className="flex items-center gap-1 text-tenue">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-marca" /> Asistida
          </dt>
          <dd className="text-2xl font-bold tabular-nums">{d.ASISTIDA}</dd>
        </div>
        <div className="rounded-xl bg-fondo p-2">
          <dt className="flex items-center gap-1 text-tenue">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-marca/40 bg-marca-claro" /> Estándar
          </dt>
          <dd className="text-2xl font-bold tabular-nums">{d.ESTANDAR}</dd>
        </div>
      </dl>
      <p className="text-xs text-tenue">El motor solo recomienda: cada cliente elige su vista y puede cambiarla cuando quiera.</p>
    </div>
  );
}
