"use client";
// Datos del cliente para la cabecera y el menú lateral ("Hola, Pedro Baca"). Se piden una vez por sesión
// (GET /me) y se guardan en memoria. El último usuario que ingresó se recuerda en el celular, como la app oficial
// ("Hola Pedro" en la pantalla de acceso): solo nombre y DNI, nunca la clave.
import type { MeRes } from "@cp/shared";
import { useEffect, useState } from "react";
import { api } from "./api";

let cache: MeRes | null = null;
let pendiente: Promise<MeRes> | null = null;

export function cargarCliente(forzar = false): Promise<MeRes> {
  if (cache && !forzar) return Promise.resolve(cache);
  if (!pendiente || forzar) {
    pendiente = api<MeRes>("/me")
      .then((m) => (cache = m))
      .finally(() => (pendiente = null));
  }
  return pendiente;
}

export function olvidarCliente() {
  cache = null;
}

export function useCliente() {
  const [me, setMe] = useState<MeRes | null>(cache);
  useEffect(() => {
    let vivo = true;
    cargarCliente()
      .then((m) => vivo && setMe(m))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return me;
}

export type UsuarioRecordado = { dni: string; nombre: string };
const CLAVE_USUARIO = "cp_usuario";

export function leerUsuario(): UsuarioRecordado | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "null");
    return v && typeof v.dni === "string" && typeof v.nombre === "string" ? v : null;
  } catch {
    return null;
  }
}

export function recordarUsuario(u: UsuarioRecordado | null) {
  try {
    if (u) localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u));
    else localStorage.removeItem(CLAVE_USUARIO);
  } catch {}
}
