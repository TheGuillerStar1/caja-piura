"use client";
// Mapa coroplético de la región Piura por distrito, dibujado en SVG desde /geo/piura-distritos.geojson
// (INEI; ver scripts/geo-piura.mjs). Sin librerías ni teselas externas: funciona igual sin internet en la demo.
import type { DistritoGestion } from "@cp/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorTramo, METRICAS, type Metrica, tramoDe, tramos, valor } from "./formato";

type Anillo = [number, number][];
type Geo = {
  features: { properties: { ubigeo: string; nombre: string; provincia: string }; geometry: { type: "Polygon"; coordinates: Anillo[] } | { type: "MultiPolygon"; coordinates: Anillo[][] } }[];
};
type Forma = { ubigeo: string; nombre: string; provincia: string; d: string; centro: [number, number] };

const ANCHO = 600;

/** Proyección equirectangular corregida por la latitud media: a esta escala (≈ 300 km) la deformación es mínima. */
function proyectar(geo: Geo): { formas: Forma[]; alto: number } {
  const anillosDe = (g: Geo["features"][number]["geometry"]) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const f of geo.features)
    for (const pol of anillosDe(f.geometry))
      for (const [lon, lat] of pol[0]) {
        x0 = Math.min(x0, lon);
        x1 = Math.max(x1, lon);
        y0 = Math.min(y0, lat);
        y1 = Math.max(y1, lat);
      }
  const cos = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const k = ANCHO / ((x1 - x0) * cos);
  const p = ([lon, lat]: [number, number]): [number, number] => [(lon - x0) * cos * k, (y1 - lat) * k];

  const formas = geo.features.map((f) => {
    let d = "";
    let mejor = { area: -1, centro: [0, 0] as [number, number] };
    for (const pol of anillosDe(f.geometry)) {
      pol.forEach((anillo, i) => {
        const pts = anillo.map(p);
        d += "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
        if (i > 0) return;
        // Centroide del anillo exterior más grande: ahí va la etiqueta.
        let a = 0, cx = 0, cy = 0;
        for (let j = 0; j < pts.length - 1; j++) {
          const [xa, ya] = pts[j], [xb, yb] = pts[j + 1];
          const c = xa * yb - xb * ya;
          a += c;
          cx += (xa + xb) * c;
          cy += (ya + yb) * c;
        }
        if (Math.abs(a) > mejor.area) mejor = { area: Math.abs(a), centro: [cx / (3 * a), cy / (3 * a)] };
      });
    }
    return { ...f.properties, d, centro: mejor.centro };
  });
  return { formas, alto: (y1 - y0) * k };
}

// Ajustes de etiqueta donde los distritos son chicos y vecinos (en unidades del SVG).
const DESPLAZAR: Record<string, [number, number]> = { "200101": [-4, 0], "200104": [14, -6] };

export function MapaPiura({
  distritos,
  metrica,
  seleccionado,
  alSeleccionar,
}: {
  distritos: DistritoGestion[];
  metrica: Metrica;
  seleccionado: string | null;
  alSeleccionar: (ubigeo: string) => void;
}) {
  const [geo, setGeo] = useState<{ formas: Forma[]; alto: number } | null>(null);
  const [error, setError] = useState(false);
  const [encima, setEncima] = useState<{ ubigeo: string; x: number; y: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/geo/piura-distritos.geojson")
      .then((r) => r.json())
      .then((g: Geo) => setGeo(proyectar(g)))
      .catch(() => setError(true));
  }, []);

  const porUbigeo = useMemo(() => new Map(distritos.map((d) => [d.ubigeo, d])), [distritos]);
  const m = METRICAS[metrica];
  const cortes = tramos(Math.max(0, ...distritos.map((d) => valor(d, metrica))), m.esPct);

  if (error) return <p className="py-10 text-center text-tenue">No se pudo cargar el mapa.</p>;
  if (!geo) return <div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-superficie-2" aria-hidden />;

  const sobre = encima ? geo.formas.find((f) => f.ubigeo === encima.ubigeo) : null;
  const datoSobre = encima ? porUbigeo.get(encima.ubigeo) : null;
  const sel = seleccionado ? geo.formas.find((f) => f.ubigeo === seleccionado) : null;

  return (
    <div className="flex flex-col gap-3">
      <div ref={caja} className="relative">
        <svg
          viewBox={`-4 -4 ${ANCHO + 8} ${geo.alto + 8}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Mapa de la región Piura por distrito: ${m.nombre}. El ranking a la derecha tiene los mismos datos.`}
          onMouseLeave={() => setEncima(null)}
        >
          {geo.formas.map((f) => {
            const d = porUbigeo.get(f.ubigeo);
            const tramo = d ? tramoDe(valor(d, metrica), cortes) : -1;
            return (
              <path
                key={f.ubigeo}
                d={f.d}
                fill={d ? colorTramo(tramo) : "var(--color-superficie-2)"}
                stroke="var(--color-superficie)"
                strokeWidth={1.2}
                strokeLinejoin="round"
                className={d ? "cursor-pointer outline-none transition-[fill] duration-300 hover:opacity-85 focus-visible:opacity-85" : ""}
                tabIndex={d ? 0 : undefined}
                role={d ? "button" : undefined}
                aria-label={d ? `${f.nombre}: ${m.formato(valor(d, metrica))}` : undefined}
                onClick={d ? () => alSeleccionar(f.ubigeo) : undefined}
                onKeyDown={d ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), alSeleccionar(f.ubigeo)) : undefined}
                onMouseMove={(e) => {
                  const r = caja.current!.getBoundingClientRect();
                  setEncima({ ubigeo: f.ubigeo, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
              />
            );
          })}
          {/* Contorno del seleccionado encima de todos (si no, los vecinos lo tapan). */}
          {sel && <path d={sel.d} fill="none" stroke="var(--color-tinta)" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />}
          {geo.formas
            .filter((f) => porUbigeo.has(f.ubigeo))
            .map((f) => {
              const [dx, dy] = DESPLAZAR[f.ubigeo] ?? [0, 0];
              return (
                <text
                  key={f.ubigeo}
                  x={f.centro[0] + dx}
                  y={f.centro[1] + dy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  className="fill-tinta text-[11px] font-bold"
                  style={{ paintOrder: "stroke", stroke: "var(--color-superficie)", strokeWidth: 3, strokeLinejoin: "round" }}
                >
                  {/* El nombre con que la Caja conoce el distrito (Talara, no Pariñas); Piura agrupa dos. */}
                  {porUbigeo.get(f.ubigeo)!.nombres.length === 1 ? porUbigeo.get(f.ubigeo)!.nombres[0] : f.nombre}
                </text>
              );
            })}
        </svg>

        {encima && sobre && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-56 rounded-lg border border-linea bg-superficie px-3 py-2 text-sm shadow-lg"
            style={{
              left: Math.min(encima.x + 14, (caja.current?.clientWidth ?? 0) - 200),
              top: encima.y + 14,
            }}
          >
            <p className="font-bold">{datoSobre?.nombres.join(" y ") ?? sobre.nombre}</p>
            <p className="text-xs text-tenue">Provincia de {sobre.provincia}</p>
            {datoSobre ? (
              <p className="mt-1">
                {m.nombre}: <b className="tabular-nums">{m.formato(valor(datoSobre, metrica))}</b>
                <span className="text-tenue"> · {datoSobre.clientes} clientes</span>
              </p>
            ) : (
              <p className="mt-1 text-tenue">Sin clientes en los datos de prueba</p>
            )}
          </div>
        )}
      </div>

      <Leyenda cortes={cortes} formato={m.formato} />
    </div>
  );
}

function Leyenda({ cortes, formato }: { cortes: number[]; formato: (n: number) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tenue">
      <span className="flex items-center gap-2 tabular-nums">
        {formato(0)}
        <span className="flex gap-0.5" aria-hidden>
          {cortes.map((_, i) => (
            <span key={i} className="block h-3 w-9 rounded-sm" style={{ background: colorTramo(i) }} />
          ))}
        </span>
        {formato(cortes[cortes.length - 1])}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm border border-linea bg-superficie-2" /> sin clientes
      </span>
    </div>
  );
}
