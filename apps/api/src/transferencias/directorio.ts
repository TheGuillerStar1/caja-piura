// Envíos a celular: directorio SIMULADO de las billeteras (lo que en producción responde la red interoperable).
// Dice a nombre de quién está un número y en qué billeteras está afiliado. Datos ficticios.
import type { Billetera, ContactoDemo } from "@cp/shared";

type Afiliado = { titular: string; billeteras: Billetera[] };

/** Agenda de prueba: tres "Sergio" para mostrar el "¿cuál Sergio?". */
const AGENDA_DEMO: (ContactoDemo & Afiliado)[] = [
  { nombre: "Sergio Castillo", telefono: "987654321", titular: "SERGIO CASTILLO RUIZ", billeteras: ["YAPE", "PLIN"] },
  { nombre: "Sergio Mototaxi", telefono: "912345678", titular: "SERGIO IPANAQUE PAZ", billeteras: ["YAPE"] },
  { nombre: "Sergio Vílchez (primo)", telefono: "956781234", titular: "SERGIO VILCHEZ MORE", billeteras: ["PLIN", "BIM"] },
  { nombre: "Mamá", telefono: "945112233", titular: "MARIA ZAPATA CHUNGA", billeteras: ["YAPE"] },
  { nombre: "Lucía Chunga", telefono: "934556677", titular: "LUCIA CHUNGA SERNAQUE", billeteras: ["YAPE", "PLIN", "DALE"] },
  { nombre: "Don Pedro verduras", telefono: "923334455", titular: "PEDRO SERNAQUE ALAMA", billeteras: ["YAPE", "SIP"] },
  { nombre: "Juana Sernaqué", telefono: "976543210", titular: "JUANA SERNAQUE TIMANA", billeteras: ["BIM"] },
];

export const NOMBRE_BILLETERA: Record<Billetera, string> = { YAPE: "Yape", PLIN: "Plin", BIM: "Bim", DALE: "Dale", SIP: "Sip" };

export const agendaDemo = (): ContactoDemo[] => AGENDA_DEMO.map(({ nombre, telefono }) => ({ nombre, telefono }));

/**
 * ¿A nombre de quién está el número y en qué billeteras? Los números de la agenda de prueba tienen datos fijos;
 * cualquier otro (contactos reales del celular) se simula afiliado a todas, con el nombre que tiene guardado el cliente.
 */
export function consultarNumero(telefono: string, nombreContacto: string): Afiliado {
  const d = AGENDA_DEMO.find((c) => c.telefono === telefono);
  if (d) return { titular: d.titular, billeteras: d.billeteras };
  const titular = nombreContacto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-ZñÑ ]+/g, " ")
    .trim()
    .toUpperCase();
  return { titular: titular || "TITULAR", billeteras: ["YAPE", "PLIN", "BIM", "DALE", "SIP"] };
}

/** "987654321" → "987 *** 321" */
export const ocultarTelefono = (t: string) => `${t.slice(0, 3)} *** ${t.slice(-3)}`;
