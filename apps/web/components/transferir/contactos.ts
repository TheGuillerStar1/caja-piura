"use client";
// Contactos del cliente para enviar a celular. Viven SOLO en este celular (localStorage): no se suben a Caja Piura
// ni se mandan a Pía. Al servidor solo va el contacto elegido, cuando el cliente revisa el envío.
// Fuente: selector de contactos del celular (Contact Picker API, Chrome en Android) o una agenda de prueba.
import type { Billetera, ContactoDemo } from "@cp/shared";
import { api } from "@/lib/api";

export type Contacto = { id: string; nombre: string; telefono: string };
export type Agenda = { origen: "CELULAR" | "PRUEBA"; contactos: Contacto[] };

const CLAVE_AGENDA = "cp_contactos";
const CLAVE_BORRADOR = "cp_envio_borrador";

/** Igual que LIMITE_TRANSFERENCIA de @cp/shared (la web solo importa tipos de shared para no cargar zod en el celular). */
export const LIMITE_TRANSFERENCIA = 500;

export const NOMBRE_BILLETERA: Record<Billetera, string> = { YAPE: "Yape", PLIN: "Plin", BIM: "Bim", DALE: "Dale", SIP: "Sip" };

export function leerAgenda(): Agenda | null {
  try {
    const v = localStorage.getItem(CLAVE_AGENDA);
    const a = v ? (JSON.parse(v) as Agenda) : null;
    return a?.contactos?.length ? a : null;
  } catch {
    return null;
  }
}
function guardarAgenda(a: Agenda) {
  try {
    localStorage.setItem(CLAVE_AGENDA, JSON.stringify(a));
  } catch {}
}
export function olvidarAgenda() {
  try {
    localStorage.removeItem(CLAVE_AGENDA);
  } catch {}
}

/** "+51 987-654-321" → "987654321"; null si no es un celular peruano. */
export function normalizarCelular(tel: string): string | null {
  let d = tel.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("51")) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? d : null;
}
/** "987654321" → "987 654 321" */
export const formatoCelular = (t: string) => `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}`;

type ContactoNativo = { name?: string[]; tel?: string[] };
type SelectorContactos = { select: (props: string[], opts: { multiple: boolean }) => Promise<ContactoNativo[]> };
const selector = () => (typeof navigator !== "undefined" ? (navigator as Navigator & { contacts?: SelectorContactos }).contacts : undefined);

/** ¿El celular deja elegir contactos? (Chrome en Android sí; iPhone y computadoras no). */
export const hayAgendaDelCelular = () => typeof window !== "undefined" && "ContactsManager" in window && Boolean(selector());

/** Abre el selector del celular: el cliente marca qué contactos compartir. Se suman a los ya conectados. */
export async function conectarDelCelular(): Promise<Agenda | null> {
  const s = selector();
  if (!s) return null;
  const elegidos = await s.select(["name", "tel"], { multiple: true });
  const nuevos: Contacto[] = [];
  for (const c of elegidos) {
    const nombre = c.name?.[0]?.trim();
    if (!nombre) continue;
    for (const tel of c.tel ?? []) {
      const t = normalizarCelular(tel);
      if (t) nuevos.push({ id: t, nombre: nombre.slice(0, 60), telefono: t });
    }
  }
  if (!nuevos.length) return leerAgenda();
  const previa = leerAgenda();
  const todos = new Map((previa?.origen === "CELULAR" ? previa.contactos : []).map((c) => [c.id, c]));
  for (const c of nuevos) todos.set(c.id, c);
  const a: Agenda = { origen: "CELULAR", contactos: [...todos.values()] };
  guardarAgenda(a);
  return a;
}

/** Agenda ficticia para la demo (celulares sin selector de contactos). */
export async function conectarPrueba(): Promise<Agenda> {
  const lista = await api<ContactoDemo[]>("/transferencias/contactos-demo");
  const a: Agenda = { origen: "PRUEBA", contactos: lista.map((c) => ({ id: c.telefono, nombre: c.nombre, telefono: c.telefono })) };
  guardarAgenda(a);
  return a;
}

const sinTildes = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Contactos que coinciden con lo que dijo el cliente ("sergio" → los tres Sergio). Primero los que tienen todas las palabras. */
export function buscarContactos(contactos: Contacto[], busqueda: string): Contacto[] {
  const q = sinTildes(busqueda);
  const ordenar = (l: Contacto[]) => [...l].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (!q) return ordenar(contactos);
  const soloDigitos = q.replace(/\D/g, "");
  if (soloDigitos.length >= 3 && soloDigitos === q.replace(/ /g, "")) return ordenar(contactos.filter((c) => c.telefono.includes(soloDigitos)));
  const palabras = q.split(" ");
  const tiene = (c: Contacto, p: string) => sinTildes(c.nombre).split(" ").some((w) => w.startsWith(p));
  const todas = contactos.filter((c) => palabras.every((p) => tiene(c, p)));
  if (todas.length) return ordenar(todas);
  return ordenar(contactos.filter((c) => palabras.some((p) => p.length >= 3 && tiene(c, p))));
}

// ── Borrador del envío: de la conversación a la pantalla de confirmación (sin datos en la URL) ──
export type Borrador = { contacto: Contacto; monto: number; billetera: Billetera; idempotencyKey?: string };

export function guardarBorrador(b: Borrador) {
  try {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(b));
  } catch {}
}
export function leerBorrador(): Borrador | null {
  try {
    const v = sessionStorage.getItem(CLAVE_BORRADOR);
    return v ? (JSON.parse(v) as Borrador) : null;
  } catch {
    return null;
  }
}
export function borrarBorrador() {
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR);
  } catch {}
}
