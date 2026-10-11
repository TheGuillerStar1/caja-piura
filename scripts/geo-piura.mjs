// Recorta el GeoJSON distrital del Perú (INEI, vía github.com/juaneladio/peru-geojson) a la región Piura.
// Uso: node scripts/geo-piura.mjs <peru_distrital_simple.geojson>
// Salida: apps/web/public/geo/piura-distritos.geojson (propiedades: ubigeo, nombre, provincia; coordenadas a 4 decimales ≈ 11 m).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const entrada = process.argv[2];
if (!entrada) throw new Error("Falta la ruta del GeoJSON del Perú");

// El GeoJSON viene en mayúsculas y sin tildes.
const NOMBRES = {
  "TAMBO GRANDE": "Tambogrande",
  "EL TALLAN": "El Tallán",
  "LA UNION": "La Unión",
  "BELLAVISTA DE LA UNION": "Bellavista de la Unión",
  MORROPON: "Morropón",
  COLAN: "Colán",
  FRIAS: "Frías",
  SONDOR: "Sóndor",
  JILILI: "Jililí",
  SICCHEZ: "Sícchez",
  MANCORA: "Máncora",
  "LOS ORGANOS": "Los Órganos",
  "SAN MIGUEL DE EL FAIQUE": "San Miguel de El Faique",
  "EL CARMEN DE LA FRONTERA": "El Carmen de la Frontera",
  "SANTA CATALINA DE MOSSA": "Santa Catalina de Mossa",
  "SAN JUAN DE BIGOTE": "San Juan de Bigote",
  "CRISTO NOS VALGA": "Cristo Nos Valga",
  "PARIÑAS": "Pariñas (Talara)",
};
const PROVINCIAS = { PUIRA: "Piura", MORROPON: "Morropón" };
const MENORES = new Set(["de", "la", "el", "los", "las", "del"]);
const titulo = (s) =>
  s
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");

const r4 = (n) => Math.round(n * 1e4) / 1e4;
const redondear = (c) => (typeof c[0] === "number" ? [r4(c[0]), r4(c[1])] : c.map(redondear));

const peru = JSON.parse(readFileSync(entrada, "utf8"));
const features = peru.features
  .filter((f) => f.properties.NOMBDEP === "PIURA" && f.geometry)
  .map((f) => {
    const p = f.properties;
    return {
      type: "Feature",
      properties: {
        ubigeo: p.IDDIST,
        nombre: NOMBRES[p.NOMBDIST] ?? titulo(p.NOMBDIST),
        provincia: PROVINCIAS[p.NOMBPROV] ?? titulo(p.NOMBPROV),
      },
      geometry: { type: f.geometry.type, coordinates: redondear(f.geometry.coordinates) },
    };
  })
  .sort((a, b) => a.properties.ubigeo.localeCompare(b.properties.ubigeo));

mkdirSync("apps/web/public/geo", { recursive: true });
const salida = "apps/web/public/geo/piura-distritos.geojson";
writeFileSync(salida, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${features.length} distritos → ${salida}`);
