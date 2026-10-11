"use client";
// Sección "Transferencias" de la app oficial, con las mismas opciones (todas funcionan: app/transferir/[tipo]).
import { ChipFrecuentes, PanelLista } from "@/components/app/Lista";
import { IcBanco, IcBilletera, IcCelular, IcPersonas } from "@/components/app/IconosApp";
import { Pantalla } from "@/components/ui";
import { track } from "@/lib/track";

export default function Transferencias() {
  return (
    <Pantalla titulo="Transferencias" pestana="transferencias" plano>
      <PanelLista
        items={[
          { texto: "Entre cuentas propias", ruta: "/transferir/propias", Icono: IcBilletera },
          { texto: "A terceros", ruta: "/transferir/terceros", Icono: IcPersonas },
          { texto: "Interbancarias en línea", ruta: "/transferir/interbancaria", Icono: IcBanco },
          { texto: "A contacto", ruta: "/transferir/contacto", Icono: IcCelular },
        ].map((i) => ({ ...i, onClick: () => track(`transferencias-${i.texto}`, "tocar") }))}
      />
      <ChipFrecuentes onClick={() => track("transferencias-frecuentes", "tocar")} />
    </Pantalla>
  );
}
