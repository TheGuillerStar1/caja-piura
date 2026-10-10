// Dueño: Agente C. "¿Lo guardo?" tras pagar un recibo nuevo (ruta C). searchParams es Promise en Next 16.
import { GuardarFrecuente } from "./GuardarFrecuente";

export default async function Page({ searchParams }: { searchParams: Promise<{ recibo?: string }> }) {
  const { recibo } = await searchParams;
  return <GuardarFrecuente reciboId={Number(recibo)} />;
}
