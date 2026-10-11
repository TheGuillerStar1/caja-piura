"use client";
// "Pago de créditos propios" igual que la app oficial (fotos del 10 oct): paso 1 de 3 con Pagaré, Cuenta origen y
// Operación (cuota, solo interés, adelanto o amortización con monto); luego la confirmación (pasos 2 y 3).
// Todas las operaciones se procesan. La cancelación total del crédito sigue en la agencia.
import type { CuotaRes, MeRes, PrepararPagoRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OpcionesCredito, paramsCredito, type DatosCredito, type EleccionCredito } from "@/components/pago/OpcionesCredito";
import { ElegirOpcion } from "@/components/pago/ElegirOpcion";
import { CampoApp, PasosApp } from "@/components/pago/PasosApp";
import { rutaConfirmar } from "@/components/pago/almacen";
import { Boton, Cargando, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, track } from "@/lib/track";


export default function PagoCreditos() {
  const router = useRouter();
  const [cuota, setCuota] = useState<CuotaRes | null | undefined>(undefined);
  const [me, setMe] = useState<MeRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagare, setPagare] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [eleccion, setEleccion] = useState<EleccionCredito | null>(null);
  const [datos, setDatos] = useState<DatosCredito | undefined>(undefined);
  const [aPagar, setAPagar] = useState<{ monto: number } | { error: string } | null>(null);

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

  // El monto lo calcula Caja Piura (servidor) según la operación: interés estimado, cuotas adelantadas o monto a amortizar.
  useEffect(() => {
    if (!cuota) return;
    let vivo = true;
    const t = setTimeout(() => {
      api<PrepararPagoRes>("/pagos/preparar", {
        cuerpo: { tipo: "CUOTA", referenciaId: cuota.id, ...(eleccion ? { operacion: eleccion.operacion, cantidad: eleccion.cantidad } : {}) },
      })
        .then((p) => {
          if (!vivo) return;
          if (p.credito) setDatos(p.credito);
          setAPagar(eleccion ? { monto: p.monto } : null);
        })
        .catch((e) => vivo && setAPagar({ error: e instanceof ApiFallo ? e.message : "No pudimos calcular el monto." }));
    }, 350);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [cuota, eleccion]);

  useEffect(() => {
    iniciarFlujo("CUOTA");
    track("pagar-creditos", "ver", { flujo: "CUOTA" });
    cargar();
  }, [cargar]);

  const listo = Boolean(cuota && pagare && cuenta && eleccion && aPagar && "monto" in aPagar);

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
            <ElegirOpcion
              nombre="pagare"
              paso="pagare"
              valor={pagare}
              onCambio={setPagare}
              opciones={[{ valor: String(cuota.id), texto: `Crédito ${cuota.credito}`, detalle: `Cuota a pagar ${soles(cuota.monto)}` }]}
            />
          </CampoApp>
          {pagare && (
            <p className="-mt-3 text-sm text-tenue">
              Cuota {cuota.numero} de {cuota.totalCuotas} · vence el {fechaCorta(cuota.vencimiento)}
            </p>
          )}

          <CampoApp etiqueta="Cuenta origen" ayuda="Es la cuenta de la que sale el dinero para pagar.">
            <ElegirOpcion
              nombre="cuenta"
              paso="cuenta"
              valor={cuenta}
              onCambio={setCuenta}
              opciones={me.cuentas.filter((k) => k.paraPagar).map((k) => ({ valor: String(k.id), texto: `${k.tipo} ${k.numeroOculto}`, detalle: `Saldo ${soles(k.saldo)}` }))}
            />
          </CampoApp>
          {me.cuentas.some((k) => !k.paraPagar) && <p className="-mt-3 text-sm text-tenue">La CTS y los depósitos a plazo fijo no se usan para pagar.</p>}

          <div data-paso="operacion">
            <OpcionesCredito datos={datos} valor={eleccion} onCambio={setEleccion} />
          </div>
          {!eleccion && <p className="-mt-3 text-sm text-tenue">Elige una operación.</p>}
          {aPagar && "monto" in aPagar && (
            <p className="rounded-xl bg-marca-claro px-3 py-2 text-lg">
              Vas a pagar <b>{soles(aPagar.monto)}</b>
            </p>
          )}
          {aPagar && "error" in aPagar && <p className="rounded-xl bg-aviso-claro px-3 py-2 font-bold">{aPagar.error}</p>}
          <p className="text-sm text-tenue">La cancelación total del crédito se hace en la agencia.</p>

          <Boton
            data-paso="continuar"
            disabled={!listo}
            onClick={() => {
              track("pagar-creditos", "tocar", { flujo: "CUOTA" });
              router.push(`${rutaConfirmar("CUOTA", cuota.id)}&cuenta=${cuenta}${eleccion ? paramsCredito(eleccion) : ""}`);
            }}
          >
            Continuar
          </Boton>
        </section>
      )}
    </Pantalla>
  );
}
