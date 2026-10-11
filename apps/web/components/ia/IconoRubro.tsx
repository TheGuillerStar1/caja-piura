// Ícono de cada rubro de servicio (librería Lucide).
import { Droplet, Lightbulb, ReceiptText, Smartphone, Wifi } from "lucide-react";

const ICONO = { LUZ: Lightbulb, AGUA: Droplet, TELEFONIA: Smartphone, INTERNET: Wifi } as const;

export function IconoRubro({ rubro, className = "h-6 w-6" }: { rubro: string; className?: string }) {
  const I = ICONO[rubro as keyof typeof ICONO] ?? ReceiptText;
  return <I className={className} aria-hidden />;
}
