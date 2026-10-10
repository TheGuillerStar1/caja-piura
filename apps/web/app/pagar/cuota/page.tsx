"use client";
// Dueño: Agente B. Ruta A: pagar mi cuota.
import type { CuotaRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { rutaConfirmar } from "@/components/pago/almacen";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, marcarAyuda, track, usoAyuda } from "@/lib/track";
import { useVista } from "@/lib/vista";

function textoVence(dias: number, iso: string) {
  if (dias < 0) return `Venció el ${fechaCorta(iso)}. Págala hoy para evitar más moras.`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence el ${fechaCorta(iso)} (en ${dias} días)`;
}

export default function PagarCuota() {
  const router = useRouter();
  const { asistida } = useVista();
  const [cuota, setCuota] = useState<CuotaRes | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCuota(await api<CuotaRes | null>("/cuotas/proxima"));
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "Ocurrió un error. Inténtalo de nuevo.");
      track("pagar-cuota", "error", { flujo: "CUOTA" });
    }
  }, [router]);

  useEffect(() => {
    // Si viene del asistente (Ayuda), la operación sigue contando como "con ayuda".
    const conAyuda = usoAyuda();
    iniciarFlujo("CUOTA");
    if (conAyuda) marcarAyuda();
    track("pagar-cuota", "ver", { flujo: "CUOTA" });
    cargar();
  }, [cargar]);

  return (
    <Pantalla titulo="Pagar mi cuota" volver="/pagos">
      {error ? (
        <MensajeError mensaje={error} reintentar={cargar} />
      ) : cuota === undefined ? (
        <Cargando texto="Buscando tu cuota…" />
      ) : cuota === null ? (
        <>
          <Tarjeta tono="exito" className="text-center">
            <p className="text-2xl font-bold">¡Estás al día!</p>
            <p className="mt-2 text-lg">No tienes cuotas pendientes.</p>
          </Tarjeta>
          <Boton variante="secundario" href="/inicio">
            Volver al inicio
          </Boton>
        </>
      ) : (
        <>
          {asistida && <Mascota mensaje="Esta es tu próxima cuota. Toca el botón para pagarla." />}
          <Tarjeta tono={cuota.diasRestantes <= 3 ? "aviso" : "normal"} className="flex flex-col gap-2 text-center">
            <p className="text-lg text-tenue">
              Cuota {cuota.numero} de {cuota.totalCuotas}
            </p>
            <p className="text-5xl font-bold tracking-tight">{soles(cuota.monto)}</p>
            <p className="text-lg font-bold">{textoVence(cuota.diasRestantes, cuota.vencimiento)}</p>
            <p className="text-tenue">Crédito {cuota.credito}</p>
          </Tarjeta>
          <Boton
            guia={asistida}
            onClick={() => {
              track("pagar-cuota", "tocar", { flujo: "CUOTA" });
              router.push(rutaConfirmar("CUOTA", cuota.id));
            }}
          >
            Pagar esta cuota
          </Boton>
        </>
      )}
    </Pantalla>
  );
}
