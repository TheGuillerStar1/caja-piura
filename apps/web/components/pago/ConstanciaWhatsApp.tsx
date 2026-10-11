"use client";
// Constancia como imagen, al estilo Yape: se dibuja una tarjeta (check, monto, a quién, operación y fecha) y se comparte
// la imagen. En el celular abre el menú de compartir (WhatsApp y el contacto); si el navegador no puede compartir
// archivos (computadora), descarga la imagen y abre WhatsApp con el texto.
import { useState } from "react";
import { fechaHora, soles } from "@/lib/formato";
import { track } from "@/lib/track";
import { IconoWhatsApp } from "./Iconos";

export type DatosConstancia = { monto: number; descripcion: string; destinatario: string; operacion: string | null; fecha: string; transferencia?: boolean };
const nombreDe = (d: DatosConstancia) => (d.transferencia ? "transferencia" : "pago");

function partirTexto(ctx: CanvasRenderingContext2D, texto: string, ancho: number) {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let linea = "";
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && linea) {
      lineas.push(linea);
      linea = p;
    } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

/** Dibuja la constancia en un canvas 1080 × 1350 (formato que WhatsApp muestra completo) y devuelve el PNG. */
export async function imagenConstancia(d: DatosConstancia): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const fuente = (peso: number, px: number) => `${peso} ${px}px Roboto, "Segoe UI", system-ui, sans-serif`;
  // Fondo y cabecera azul de la app
  x.fillStyle = "#eae1f4"; // lila del manual
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#0b4ed4";
  x.fillRect(0, 0, W, 220);
  x.fillStyle = "#ffffff";
  x.font = fuente(700, 56);
  x.fillText("Caja Piura", 80, 130);
  x.font = fuente(400, 34);
  x.fillText(`Constancia de ${nombreDe(d)}`, 80, 180);
  // Tarjeta blanca
  const tx = 60;
  const ty = 260;
  const tw = W - 120;
  const th = 960;
  x.fillStyle = "#ffffff";
  x.beginPath();
  x.roundRect(tx, ty, tw, th, 40);
  x.fill();
  // Check azul de la app
  x.fillStyle = "#0b4ed4";
  x.beginPath();
  x.arc(W / 2, ty + 140, 80, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#ffffff";
  x.lineWidth = 18;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  x.moveTo(W / 2 - 36, ty + 142);
  x.lineTo(W / 2 - 8, ty + 170);
  x.lineTo(W / 2 + 40, ty + 112);
  x.stroke();
  // Título y monto
  x.textAlign = "center";
  x.fillStyle = "#0b4ed4";
  x.font = fuente(700, 52);
  x.fillText(d.transferencia ? "¡Transferencia realizada!" : "¡Pago realizado!", W / 2, ty + 300);
  x.fillStyle = "#1c1f24";
  x.font = fuente(700, 120);
  x.fillText(soles(d.monto), W / 2, ty + 440);
  x.fillStyle = "#00549f";
  x.font = fuente(400, 36);
  partirTexto(x, d.descripcion, tw - 120).forEach((l, i) => x.fillText(l, W / 2, ty + 510 + i * 46));
  // Detalle
  x.textAlign = "left";
  const filas: [string, string][] = [
    ["Para", d.destinatario],
    ["N.º de operación", d.operacion ?? "-"],
    ["Fecha", fechaHora(d.fecha)],
  ];
  let y = ty + 650;
  x.strokeStyle = "#eae1f4";
  x.lineWidth = 2;
  for (const [k, v] of filas) {
    x.beginPath();
    x.moveTo(tx + 50, y - 50);
    x.lineTo(tx + tw - 50, y - 50);
    x.stroke();
    x.fillStyle = "#00549f";
    x.font = fuente(400, 36);
    x.fillText(k, tx + 60, y);
    x.fillStyle = "#1c1f24";
    x.font = fuente(700, 36);
    x.textAlign = "right";
    x.fillText(v, tx + tw - 60, y);
    x.textAlign = "left";
    y += 100;
  }
  // Pie
  x.textAlign = "center";
  x.fillStyle = "#00549f";
  x.font = fuente(400, 30);
  x.fillText(`${d.transferencia ? "Hecha" : "Pagado"} desde la app · Te ahorraste una visita a la agencia`, W / 2, H - 70);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), "image/png"));
}

const texto = (d: DatosConstancia) =>
  `Constancia de ${nombreDe(d)} · Caja Piura\n${d.descripcion}\nMonto: ${soles(d.monto)}\nPara: ${d.destinatario}\nN.º de operación: ${d.operacion ?? "-"}`;

export function BotonConstanciaWhatsApp({ datos, className = "" }: { datos: DatosConstancia; className?: string }) {
  const [estado, setEstado] = useState<"" | "preparando" | "descargada">("");

  async function enviar() {
    track("constancia-whatsapp", "tocar");
    setEstado("preparando");
    try {
      const blob = await imagenConstancia(datos);
      const archivo = new File([blob], `constancia-${datos.operacion ?? "pago"}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Constancia de ${nombreDe(datos)}`, text: `Constancia de ${nombreDe(datos)} · Caja Piura` });
        setEstado("");
        return;
      }
      // Computadora: se descarga la imagen y se abre WhatsApp para adjuntarla.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      window.open(`https://wa.me/?text=${encodeURIComponent(texto(datos))}`, "_blank", "noopener");
      setEstado("descargada");
    } catch {
      // El cliente cerró el menú de compartir: no pasa nada.
      setEstado("");
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={enviar}
        disabled={estado === "preparando"}
        className="flex min-h-13 items-center justify-center gap-2 rounded-boton bg-marca px-5 text-lg font-bold text-white hover:bg-marca-oscuro active:bg-marca-oscuro disabled:opacity-70"
      >
        <IconoWhatsApp className="h-6 w-6" />
        {estado === "preparando" ? "Preparando la constancia…" : "Enviar constancia por WhatsApp"}
      </button>
      {estado === "descargada" && <p className="text-center text-sm text-tenue">La imagen se descargó: adjúntala en el chat de WhatsApp que se abrió.</p>}
    </div>
  );
}
