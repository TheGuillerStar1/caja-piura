"use client";
// Sección "Transferencias" de la app oficial, con las mismas opciones.
import { ChipFrecuentes, PanelLista } from "@/components/app/Lista";
import { IcBanco, IcBilletera, IcCelular, IcPersonas } from "@/components/app/IconosApp";
import { Pantalla } from "@/components/ui";
import { track } from "@/lib/track";

export default function Transferencias() {
  const otro = (n: string) => `/servicio?n=${encodeURIComponent(n)}&v=/transferencias`;
  return (
    <Pantalla titulo="Transferencias" pestana="transferencias" plano>
      <PanelLista
        items={[
          { texto: "Entre cuentas propias", ruta: otro("Entre cuentas propias"), Icono: IcBilletera },
          { texto: "A terceros", ruta: otro("Transferencias a terceros"), Icono: IcPersonas },
          { texto: "Interbancarias en línea", ruta: otro("Interbancarias en línea"), Icono: IcBanco },
          { texto: "A contacto", ruta: "/transferir", Icono: IcCelular },
        ].map((i) => ({ ...i, onClick: () => track(`transferencias-${i.texto}`, "tocar") }))}
      />
      <ChipFrecuentes onClick={() => track("transferencias-frecuentes", "tocar")} />
    </Pantalla>
  );
}
