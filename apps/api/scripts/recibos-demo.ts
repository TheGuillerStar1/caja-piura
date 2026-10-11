// Dueño: Agente C. Genera 3 recibos de demo (SVG → JPEG con sharp), los guarda en prisma/demo-recibos/ y los sube a R2.
// Uso (desde apps/api): npx tsx --env-file=../../.env scripts/recibos-demo.ts [--sin-subir]
// Monto, vencimiento y titular impresos = los de RECIBOS_DEMO (prisma/demo.ts): lo que lee Pía coincide con la foto.
// El monto igual sale de la base, nunca de la foto.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { subirArchivo } from "../src/lib/r2.js";

type Demo = {
  key: string;
  archivo: string;
  empresa: string;
  subtitulo: string;
  color: string;
  etiquetaCodigo: string;
  codigo: string;
  titular: string;
  direccion: string;
  periodo: string;
  vence: string;
  consumo: string;
  detalle: [string, string][];
  montoImpreso: string; // igual a RECIBOS_DEMO.monto
  extra: [string, string][]; // otros números del recibo (para que sea realista)
};

const demos: Demo[] = [
  {
    key: "demo/recibo-enosa.jpg",
    archivo: "recibo-enosa.jpg",
    empresa: "ENOSA",
    subtitulo: "Electronoroeste S.A. · Distribución eléctrica",
    color: "#f39200",
    etiquetaCodigo: "N.º DE SUMINISTRO",
    codigo: "31264587",
    titular: "ELENA QUISPE",
    direccion: "Caserío Santa Rosa Mz. B Lt. 4, Tambogrande, Piura",
    periodo: "Setiembre 2026",
    vence: "28/10/2026",
    consumo: "96 kWh",
    detalle: [
      ["Cargo fijo", "3.12"],
      ["Energía activa (96 kWh)", "52.80"],
      ["Alumbrado público", "6.45"],
      ["IGV", "10.84"],
      ["Redondeo", "-0.01"],
    ],
    montoImpreso: "68.90",
    extra: [
      ["Medidor", "M-0458721"],
      ["Tarifa", "BT5B"],
      ["Recibo N.º", "S001-00987412"],
    ],
  },
  {
    key: "demo/recibo-epsgrau.jpg",
    archivo: "recibo-epsgrau.jpg",
    empresa: "EPS GRAU",
    subtitulo: "Agua potable y alcantarillado · Piura",
    color: "#0072bc",
    etiquetaCodigo: "CÓDIGO DE SUMINISTRO",
    codigo: "2045871",
    titular: "ELENA QUISPE",
    direccion: "Jr. Libertad 1450, Castilla, Piura",
    periodo: "Setiembre 2026",
    vence: "25/10/2026",
    consumo: "14 m³",
    detalle: [
      ["Agua potable (14 m³)", "21.40"],
      ["Alcantarillado", "9.10"],
      ["Cargo fijo", "2.30"],
      ["IGV", "5.85"],
    ],
    montoImpreso: "35.20",
    extra: [
      ["Medidor", "A-778103"],
      ["Categoría", "Doméstico"],
      ["Recibo N.º", "R12-0045126"],
    ],
  },
  {
    key: "demo/recibo-movistar.jpg",
    archivo: "recibo-movistar.jpg",
    empresa: "Movistar",
    subtitulo: "Telefonía móvil · Plan postpago",
    color: "#019df4",
    etiquetaCodigo: "N.º DE SERVICIO (TELÉFONO)",
    codigo: "912345678",
    titular: "JUAN CHAVEZ",
    direccion: "Av. Grau 875, Piura",
    periodo: "Setiembre 2026",
    vence: "22/10/2026",
    consumo: "Plan Ilimitado 39.90",
    detalle: [
      ["Plan mensual", "39.90"],
      ["Servicios adicionales", "0.00"],
      ["IGV incluido", "—"],
    ],
    montoImpreso: "39.90",
    extra: [
      ["Código de cliente", "CLI-55021"],
      ["Recibo N.º", "M7-11203344"],
    ],
  },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(d: Demo) {
  const W = 900;
  const H = 1320;
  const f = "Arial, Helvetica, sans-serif";
  const filas = d.detalle
    .map(
      ([c, m], i) =>
        `<text x="70" y="${880 + i * 38}" font-size="24" fill="#333">${esc(c)}</text>` +
        `<text x="830" y="${880 + i * 38}" font-size="24" fill="#333" text-anchor="end">${esc(m)}</text>`,
    )
    .join("");
  const extras = d.extra
    .map(
      ([c, v], i) =>
        `<text x="70" y="${640 + i * 36}" font-size="22" fill="#666">${esc(c)}:</text>` +
        `<text x="300" y="${640 + i * 36}" font-size="22" fill="#222">${esc(v)}</text>`,
    )
    .join("");
  const yTotal = 880 + d.detalle.length * 38 + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${f}">
  <rect width="${W}" height="${H}" fill="#fbfaf6"/>
  <rect x="0" y="0" width="${W}" height="150" fill="${d.color}"/>
  <text x="50" y="92" font-size="64" font-weight="bold" fill="#fff">${esc(d.empresa)}</text>
  <text x="52" y="128" font-size="22" fill="#fff" opacity=".95">${esc(d.subtitulo)}</text>
  <text x="850" y="70" font-size="22" fill="#fff" text-anchor="end">RECIBO DE SERVICIO</text>
  <text x="850" y="102" font-size="20" fill="#fff" text-anchor="end">Periodo: ${esc(d.periodo)}</text>

  <rect x="510" y="180" width="350" height="140" rx="12" fill="#fff" stroke="${d.color}" stroke-width="4"/>
  <text x="685" y="220" font-size="20" font-weight="bold" fill="#555" text-anchor="middle">${esc(d.etiquetaCodigo)}</text>
  <text x="685" y="290" font-size="56" font-weight="bold" fill="#111" text-anchor="middle" letter-spacing="3">${esc(d.codigo)}</text>

  <text x="50" y="215" font-size="20" fill="#666">TITULAR</text>
  <text x="50" y="250" font-size="30" font-weight="bold" fill="#111">${esc(d.titular)}</text>
  <text x="50" y="295" font-size="20" fill="#666">DIRECCIÓN DE SUMINISTRO</text>
  <text x="50" y="326" font-size="18" fill="#222">${esc(d.direccion)}</text>

  <line x1="50" y1="370" x2="850" y2="370" stroke="#ccc" stroke-width="2"/>
  <text x="50" y="420" font-size="22" fill="#666">Consumo del mes</text>
  <text x="50" y="460" font-size="34" font-weight="bold" fill="#111">${esc(d.consumo)}</text>
  <text x="480" y="420" font-size="22" fill="#666">Fecha de vencimiento</text>
  <text x="480" y="460" font-size="34" font-weight="bold" fill="#111">${esc(d.vence)}</text>

  <rect x="50" y="500" width="800" height="90" rx="8" fill="#eef2f6"/>
  ${[60, 45, 70, 50, 80, 65]
    .map((h, i) => `<rect x="${90 + i * 120}" y="${580 - h}" width="60" height="${h}" fill="${d.color}" opacity="${i === 5 ? 1 : 0.45}"/>`)
    .join("")}
  ${extras}

  <line x1="50" y1="800" x2="850" y2="800" stroke="#ccc" stroke-width="2"/>
  <text x="50" y="840" font-size="24" font-weight="bold" fill="#111">DETALLE DE LA FACTURACIÓN</text>
  ${filas}
  <rect x="50" y="${yTotal - 10}" width="800" height="90" rx="10" fill="${d.color}"/>
  <text x="80" y="${yTotal + 48}" font-size="34" font-weight="bold" fill="#fff">TOTAL A PAGAR</text>
  <text x="820" y="${yTotal + 50}" font-size="44" font-weight="bold" fill="#fff" text-anchor="end">S/ ${esc(d.montoImpreso)}</text>

  <text x="450" y="${yTotal + 125}" font-size="18" fill="#777" text-anchor="middle">Paga en agencias, agentes y apps autorizadas. Conserva este recibo.</text>
  <g transform="translate(240 ${yTotal + 150})">
    ${Array.from({ length: 70 }, (_, i) => `<rect x="${i * 6}" y="0" width="${i % 3 === 0 ? 4 : 2}" height="36" fill="#222"/>`).join("")}
  </g>
</svg>`;
}

const aqui = dirname(fileURLToPath(import.meta.url));
const carpeta = join(aqui, "..", "prisma", "demo-recibos");
mkdirSync(carpeta, { recursive: true });
const subir = !process.argv.includes("--sin-subir");

for (const d of demos) {
  const jpg = await sharp(Buffer.from(svg(d))).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  writeFileSync(join(carpeta, d.archivo), jpg);
  if (subir) await subirArchivo(d.key, jpg, "image/jpeg");
  console.log(`✔ ${d.archivo} (${Math.round(jpg.length / 1024)} KB)${subir ? ` → R2 ${d.key}` : ""}`);
}
