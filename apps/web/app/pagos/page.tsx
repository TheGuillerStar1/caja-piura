"use client";
// Sección "Pagos" de la app oficial, con las mismas opciones. Pía acompaña los pagos que la demo procesa:
// servicios (recibos de luz, agua, teléfono) y créditos propios (cuota).
import { ChipFrecuentes, PanelLista } from "@/components/app/Lista";
import { IcAgua, IcBanco, IcBilletera, IcCreditoTerceros, IcTarjetaPago } from "@/components/app/IconosApp";
import { Pantalla } from "@/components/ui";
import { iniciarFlujo, track } from "@/lib/track";

export default function Pagos() {
  const otro = (n: string) => `/servicio?n=${encodeURIComponent(n)}&v=/pagos`;
  return (
    <Pantalla titulo="Pagos" pestana="pagos" plano>
      <PanelLista
        items={[
          { texto: "Pago de servicios", ruta: "/pagar/servicios", paso: "pago-servicios", Icono: IcAgua, onClick: () => (iniciarFlujo("RECIBO"), track("pagos-servicios", "tocar", { flujo: "RECIBO" })) },
          { texto: "Pago de créditos propios", ruta: "/pagar/creditos", paso: "pago-creditos", Icono: IcBilletera, onClick: () => (iniciarFlujo("CUOTA"), track("pagos-creditos", "tocar", { flujo: "CUOTA" })) },
          { texto: "Pago de créditos de terceros", ruta: otro("Pago de créditos de terceros"), Icono: IcCreditoTerceros },
          { texto: "Pago de tarjeta de crédito", ruta: otro("Pago de tarjeta de crédito"), Icono: IcTarjetaPago },
          { texto: "Pago de tarjetas de otros bancos", ruta: otro("Pago de tarjetas de otros bancos"), Icono: IcBanco },
        ]}
      />
      <ChipFrecuentes onClick={() => track("pagos-frecuentes", "tocar")} />
    </Pantalla>
  );
}
