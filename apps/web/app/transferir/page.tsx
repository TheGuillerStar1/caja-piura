"use client";
// Transferencias › A contacto: el mismo paso a paso que ofrece Pía en el chat, sin escribir nada.
import { EnviarAContacto } from "@/components/transferir/EnviarAContacto";
import { Pantalla } from "@/components/ui";
import { useVista } from "@/lib/vista";

export default function EnviarContacto() {
  const { asistida } = useVista();
  return (
    <Pantalla titulo="Enviar a un contacto" volver="/transferencias">
      <EnviarAContacto nombre={null} monto={null} billetera={null} guia={asistida} />
    </Pantalla>
  );
}
