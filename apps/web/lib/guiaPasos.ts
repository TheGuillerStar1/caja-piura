"use client";
// Guía paso a paso de Pía («Guíame»): en vez de pagar desde el chat, lleva al cliente por la app de siempre y le señala
// qué tocar en cada pantalla (components/GuiaPasos.tsx). Cada paso apunta a un elemento con data-paso="…".
export type IdGuia = "CUOTA" | "RECIBO" | "FRECUENTE";
export type PasoGuia = { ruta: string; sel: string; texto: string; evento?: "click" | "change" | "submit" };

export const GUIAS: Record<IdGuia, PasoGuia[]> = {
  CUOTA: [
    { ruta: "/inicio", sel: "tab-pagos", texto: "Toca «Pagos», abajo en la barra." },
    { ruta: "/pagos", sel: "pago-creditos", texto: "Toca «Pago de créditos propios»." },
    { ruta: "/pagar/creditos", sel: "pagare", evento: "change", texto: "Elige el crédito que vas a pagar. En la app se llama «pagaré»." },
    { ruta: "/pagar/creditos", sel: "cuenta", evento: "change", texto: "Elige de qué cuenta sale el dinero (cuenta origen)." },
    { ruta: "/pagar/creditos", sel: "operacion", evento: "change", texto: "En «Operación», elige «Pago de cuota»." },
    { ruta: "/pagar/creditos", sel: "continuar", texto: "Toca «Continuar»." },
    { ruta: "/pagar/confirmar", sel: "confirmar", texto: "Revisa el monto y toca «Confirmar pago». Después confirmas con tu rostro, huella o clave." },
  ],
  RECIBO: [
    { ruta: "/inicio", sel: "tab-pagos", texto: "Toca «Pagos», abajo en la barra." },
    { ruta: "/pagos", sel: "pago-servicios", texto: "Toca «Pago de servicios»." },
    { ruta: "/pagar/servicios", sel: "rubro", evento: "change", texto: "Elige el rubro de tu recibo: por ejemplo «Agua» o «Energía eléctrica»." },
    { ruta: "/pagar/servicios", sel: "empresa", texto: "Toca la empresa que sale en tu recibo." },
    { ruta: "/pagar/servicios", sel: "servicio", texto: "Elige el servicio que vas a pagar." },
    { ruta: "/pagar/servicios", sel: "codigo", evento: "submit", texto: "Escribe el código de tu recibo con el teclado y toca «Buscar deuda»." },
    { ruta: "/pagar/servicios", sel: "cuenta", evento: "change", texto: "Elige de qué cuenta sale el dinero (cuenta origen)." },
    { ruta: "/pagar/servicios", sel: "continuar", texto: "Toca «Continuar»." },
    { ruta: "/pagar/confirmar", sel: "confirmar", texto: "Revisa el monto y toca «Confirmar pago». Después confirmas con tu rostro, huella o clave." },
  ],
  FRECUENTE: [
    { ruta: "/inicio", sel: "tab-frecuentes", texto: "Toca «Frecuentes», abajo en la barra." },
    { ruta: "/pagar/frecuentes", sel: "frecuente", texto: "Toca el pago que quieres hacer." },
    { ruta: "/pagar/confirmar", sel: "confirmar", texto: "Revisa el monto y toca «Confirmar pago». Después confirmas con tu rostro, huella o clave." },
  ],
};

const CLAVE = "cp_guia_pasos";
type Estado = { id: IdGuia; paso: number };

export function leerGuia(): Estado | null {
  try {
    const g = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
    return g && GUIAS[g.id as IdGuia] ? g : null;
  } catch {
    return null;
  }
}

function guardar(g: Estado | null) {
  try {
    if (g) sessionStorage.setItem(CLAVE, JSON.stringify(g));
    else sessionStorage.removeItem(CLAVE);
  } catch {}
  dispatchEvent(new Event("cp-guia"));
}

export const empezarGuia = (id: IdGuia) => guardar({ id, paso: 0 });
export const irAPaso = (id: IdGuia, paso: number) => guardar({ id, paso });
export const terminarGuia = () => guardar(null);
