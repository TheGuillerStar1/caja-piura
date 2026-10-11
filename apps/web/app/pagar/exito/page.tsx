"use client";
// Dueño: Agente B. Pago exitoso: constancia, puntos y "¿Lo guardo?" (ruta C).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { guardarResultado, leerResultado, type ResultadoPago } from "@/components/pago/almacen";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { IconoCheck } from "@/components/pago/Iconos";
import { Boton, Pantalla, Tarjeta } from "@/components/ui";
import { fechaHora, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { hablar, montoHablado } from "@/lib/voz";

function textoConstancia(r: ResultadoPago) {
  return [
    "Constancia de pago · Caja Piura",
    `Monto: ${soles(r.monto)}`,
    r.descripcion,
    `Para: ${r.destinatario}`,
    `N.º de operación: ${r.operacion ?? "-"}`,
    `Fecha: ${fechaHora(r.fecha)}`,
  ].join("\n");
}

export default function PagoExito() {
  const router = useRouter();
  const { asistida } = useVista();
  const [r, setR] = useState<ResultadoPago | null>(null);
  const [copiado, setCopiado] = useState(false);
  const registrado = useRef(false);

  useEffect(() => {
    const res = leerResultado();
    if (!res || res.estado !== "EXITOSO") {
      router.replace("/inicio");
      return;
    }
    setR(res);
    if (registrado.current) return;
    registrado.current = true;
    track("exito", "ver", { flujo: res.tipo });
    // "completar" una sola vez por pago (recargar esta pantalla no debe contar otra operación en el panel).
    if (!res.repetido && !res.registrado) {
      track("exito", "completar", { flujo: res.tipo });
      guardarResultado({ ...res, registrado: true });
    }
    // Cierra la operación: la marca de ayuda no debe pasar al siguiente pago.
    iniciarFlujo(res.tipo);
    if (asistida) hablar(`Listo. Pagaste ${montoHablado(res.monto)}. Te ahorraste una visita a la agencia.`);
  }, [router, asistida]);

  if (!r) return null;

  const compartir = async () => {
    track("exito", "tocar", { flujo: r.tipo });
    const texto = textoConstancia(r);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Constancia de pago Caja Piura", text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // El cliente cerró el menú de compartir o no hay portapapeles: no pasa nada.
    }
  };

  return (
    <Pantalla titulo="Pago realizado">
      <EstilosPago />
      <div className="anim-aparece flex flex-col items-center gap-2 pt-2 text-center">
        <IconoCheck className="h-24 w-24" />
        <h2 className="text-2xl font-bold text-exito">¡Pago realizado!</h2>
        <p className="text-5xl font-bold tracking-tight">{soles(r.monto)}</p>
        <p className="text-lg">{r.descripcion}</p>
        {r.repetido && <p className="text-tenue">Este pago ya estaba hecho. No se cobró otra vez.</p>}
      </div>

      <Tarjeta className="flex flex-col gap-1">
        <p className="flex justify-between gap-2">
          <span className="text-tenue">Para</span>
          <b className="text-right">{r.destinatario}</b>
        </p>
        <p className="flex justify-between gap-2">
          <span className="text-tenue">N.º de operación</span>
          <b>{r.operacion}</b>
        </p>
        <p className="flex justify-between gap-2">
          <span className="text-tenue">Fecha</span>
          <b>{fechaHora(r.fecha)}</b>
        </p>
      </Tarjeta>

      <Tarjeta tono="exito" className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">{r.mensaje}</p>
        {r.puntosGanados > 0 && (
          <Link
            href="/progreso"
            onClick={() => track("exito", "tocar", { flujo: r.tipo })}
            className="shrink-0 rounded-full bg-exito px-3 py-2 font-bold text-white"
          >
            +{r.puntosGanados} puntos
          </Link>
        )}
      </Tarjeta>

      <div className="mt-auto flex flex-col gap-3">
        {r.ofrecerGuardar && (
          <Boton guia={asistida} href={`/pagar/guardar?recibo=${r.referenciaId}`}>
            ¿Lo guardo para la próxima?
          </Boton>
        )}
        {/* La constancia se manda por WhatsApp a quien el cliente elija (abre WhatsApp con el texto listo). */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textoConstancia(r))}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("exito-whatsapp", "tocar", { flujo: r.tipo })}
          className="flex min-h-13 items-center justify-center gap-2 rounded-boton bg-[#1f8f4e] px-5 text-lg font-bold text-white active:bg-[#17733e]"
        >
          <span aria-hidden>💬</span> Enviar constancia por WhatsApp
        </a>
        <Boton variante="secundario" onClick={compartir}>
          {copiado ? "Constancia copiada" : "Compartir constancia"}
        </Boton>
        <Boton variante={r.ofrecerGuardar ? "fantasma" : "primario"} guia={asistida && !r.ofrecerGuardar} href="/inicio">
          Volver al inicio
        </Boton>
      </div>
    </Pantalla>
  );
}
