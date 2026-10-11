"use client";
// Contactos para enviar a celular desde el chat. Viven SOLO en este celular (localStorage): no se suben a Caja Piura
// ni se mandan a Pía. Al servidor solo va el celular elegido, cuando el cliente confirma el envío.
// Fuente: el selector de contactos del celular (Chrome en Android) o una agenda de prueba ficticia.

export type Contacto = { nombre: string; telefono: string };
export type Billetera = "YAPE" | "PLIN" | "BIM" | "DALE" | "SIP";
export const NOMBRE_BILLETERA: Record<Billetera, string> = { YAPE: "Yape", PLIN: "Plin", BIM: "Bim", DALE: "Dale", SIP: "Sip" };
/** Tope por envío a celular en el chat (como Yape/Plin interoperable). */
export const TOPE_ENVIO = 500;

const CLAVE = "cp_contactos";

/** Agenda de prueba (datos ficticios): tres «Sergio» para mostrar el «¿cuál Sergio?». */
const AGENDA_PRUEBA: Contacto[] = [
  { nombre: "Sergio Castillo", telefono: "987654321" },
  { nombre: "Sergio Mototaxi", telefono: "912345678" },
  { nombre: "Sergio Vílchez (primo)", telefono: "956781234" },
  { nombre: "Brian Zapata", telefono: "934112233" },
  { nombre: "Mamá", telefono: "945112233" },
  { nombre: "Lucía Chunga", telefono: "934556677" },
  { nombre: "Don Pedro verduras", telefono: "923334455" },
  { nombre: "Juana Sernaqué", telefono: "976543210" },
];

export function leerAgenda(): Contacto[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Contacto[] | null;
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  }
}
function guardar(c: Contacto[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {}
  return c;
}
export function olvidarAgenda() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {}
}
export const usarAgendaPrueba = () => guardar(AGENDA_PRUEBA);

/** "+51 987-654-321" → "987654321"; null si no es un celular peruano. */
export function normalizarCelular(tel: string): string | null {
  let d = tel.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("51")) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? d : null;
}
/** "987654321" → "987 654 321" */
export const formatoCelular = (t: string) => `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}`;

type Nativo = { name?: string[]; tel?: string[] };
type Selector = { select: (p: string[], o: { multiple: boolean }) => Promise<Nativo[]> };
const selector = () => (typeof navigator !== "undefined" ? (navigator as Navigator & { contacts?: Selector }).contacts : undefined);

/** ¿El celular deja elegir contactos? (Chrome en Android sí; iPhone y computadoras no). */
export const hayAgendaDelCelular = () => typeof window !== "undefined" && "ContactsManager" in window && Boolean(selector());

/** Abre el selector del celular: el cliente marca qué contactos compartir. Se suman a los que ya había. */
export async function conectarDelCelular(): Promise<Contacto[] | null> {
  const s = selector();
  if (!s) return null;
  const elegidos = await s.select(["name", "tel"], { multiple: true });
  const todos = new Map((leerAgenda() ?? []).filter((c) => !AGENDA_PRUEBA.some((p) => p.telefono === c.telefono)).map((c) => [c.telefono, c]));
  for (const c of elegidos) {
    const nombre = c.name?.[0]?.trim();
    for (const tel of c.tel ?? []) {
      const t = normalizarCelular(tel);
      if (nombre && t) todos.set(t, { nombre: nombre.slice(0, 60), telefono: t });
    }
  }
  return todos.size ? guardar([...todos.values()]) : leerAgenda();
}

const plano = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .trim();

/** Contactos que coinciden con lo que dijo el cliente ("sergio" → los tres Sergio). Por número también. */
export function buscar(contactos: Contacto[], q: string): Contacto[] {
  const orden = (l: Contacto[]) => [...l].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const b = plano(q);
  if (!b) return orden(contactos);
  const digitos = b.replace(/\D/g, "");
  if (digitos.length >= 3 && digitos === b.replace(/ /g, "")) return orden(contactos.filter((c) => c.telefono.includes(digitos)));
  const palabras = b.split(/\s+/);
  const tiene = (c: Contacto, p: string) => plano(c.nombre).split(/\s+/).some((w) => w.startsWith(p));
  const todas = contactos.filter((c) => palabras.every((p) => tiene(c, p)));
  return orden(todas.length ? todas : contactos.filter((c) => palabras.some((p) => p.length >= 3 && tiene(c, p))));
}
