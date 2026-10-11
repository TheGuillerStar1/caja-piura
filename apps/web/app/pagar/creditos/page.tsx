"use client";
// "Pago de créditos propios" igual que la app oficial (fotos del 10 oct): paso 1 de 3 con Pagaré, Cuenta origen y
// Operación; luego la confirmación (pasos 2 y 3). Se mantienen todas las operaciones de la app para no quitar funciones;
// en la demo solo se procesa "Pago de cuota".
import type { CuotaRes, MeRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CampoApp, claseSelect, PasosApp } from "@/components/pago/PasosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";

const OPERACIONES = [
  { id: "CUOTA", texto: "Pago de cuota" },
  { id: "INTERES", texto: "Pago interés" },
  { id: "ADELANTO", texto: "Adelanto de cuotas" },
  { id: "AMORTIZACION", texto: "Amortización" },
  { id: "CANCELACION", texto: "Cancelación" },
] as const;

export default function PagoCreditos() {
  const router = useRouter();
  const [cuota, setCuota] = useState<CuotaRes | null | undefined>(undefined);
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagare, setPagare] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [operacion, setOperacion] = useState("");

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [c, m] = await Promise.all([api<CuotaRes | null>("/cuotas/proxima"), api<MeRes>("/me")]);
      setCuota(c);
      setMe(m);
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
    }
  }, [router]);

  useEffect(() => {
    iniciarFlujo("CUOTA");
    track("pagar-creditos", "ver", { flujo: "CUOTA" });
    cargar();
  }, [cargar]);

  const listo = Boolean(cuota && pagare && cuenta && operacion === "CUOTA");
  const otraOperacion = operacion !== "" && operacion !== "CUOTA";

  return (
    <Pantalla titulo="Pago de créditos propios" volver="/pagos">
      {error ? (
        <MensajeError mensaje={error} reintentar={cargar} />
      ) : cuota === undefined || !me ? (
        <Cargando texto="Buscando tus créditos…" />
      ) : cuota === null ? (
        <Tarjeta tono="exito" className="text-center">
          <p className="text-2xl font-bold">Estás al día</p>
          <p className="mt-2 text-lg">No tienes cuotas pendientes.</p>
        </Tarjeta>
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl bg-superficie p-4 shadow-sm">
          <PasosApp total={3} actual={1} />
          <h2 className="text-center text-xl font-bold text-marca">Ingresa tus datos</h2>

          <CampoApp etiqueta="Pagaré">
            <select data-paso="pagare" value={pagare} onChange={(e) => setPagare(e.target.value)} className={claseSelect}>
              <option value="">Elige un pagaré</option>
              <option value={cuota.id}>
                {cuota.credito} · Cuota a pagar {soles(cuota.monto)}
              </option>
            </select>
          </CampoApp>
          {pagare && (
            <p className="-mt-3 text-sm text-tenue">
              Cuota {cuota.numero} de {cuota.totalCuotas} · vence el {fechaCorta(cuota.vencimiento)}
            </p>
          )}

          <CampoApp etiqueta="Cuenta origen" ayuda="Es la cuenta de la que sale el dinero para pagar.">
            <select data-paso="cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={claseSelect}>
              <option value="">Elige tu cuenta</option>
              {me.cuentas.filter((k) => k.paraPagar).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.tipo} {k.numeroOculto} · Saldo {soles(k.saldo)}
                </option>
              ))}
            </select>
          </CampoApp>
          {me.cuentas.some((k) => !k.paraPagar) && <p className="-mt-3 text-sm text-tenue">La CTS y los depósitos a plazo fijo no se usan para pagar.</p>}

          <CampoApp etiqueta="Operación">
            <select data-paso="operacion" value={operacion} onChange={(e) => setOperacion(e.target.value)} className={claseSelect}>
              <option value="">Elige una operación</option>
              {OPERACIONES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.texto}
                </option>
              ))}
            </select>
          </CampoApp>
          {otraOperacion && (
            <Tarjeta tono="aviso">
              <p>Esta operación está en la app de Caja Piura. En esta demo solo se procesa el «Pago de cuota».</p>
            </Tarjeta>
          )}

          <Boton
            data-paso="continuar"
            disabled={!listo}
            onClick={() => {
              track("pagar-creditos", "tocar", { flujo: "CUOTA" });
              router.push(`${rutaConfirmar("CUOTA", cuota.id)}&cuenta=${cuenta}`);
            }}
          >
            Continuar
          </Boton>
        </section>
      )}
    </Pantalla>
  );
}
