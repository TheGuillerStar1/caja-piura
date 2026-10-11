"use client";
// Pantalla de acceso, réplica de la app oficial: logo, "Hola Pedro" (último usuario del celular), botón "Ingresar"
// y accesos inferiores (Ubícanos, Contáctenos, Token Digital, Para ti).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IcAuricular, IcParaTi, IcToken, IcUbicacion, IcUsuario } from "@/components/app/IconosApp";
import { leerUsuario, recordarUsuario, type UsuarioRecordado } from "@/lib/cliente";
import { track } from "@/lib/track";
import { FondoAcceso } from "./_entrada/FondoAcceso";
import { LogoCajaPiura } from "./_entrada/Logo";

const sombra = "[text-shadow:0_1px_3px_rgb(70_50_150/0.45)]";
const info = (n: string) => `/servicio?n=${encodeURIComponent(n)}&v=/`;

export default function Principal() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioRecordado | null>(null);

  useEffect(() => {
    track("principal", "ver");
    setUsuario(leerUsuario());
    router.prefetch("/entrar");
  }, [router]);

  return (
    <FondoAcceso>
      <header className="flex justify-center px-6 pt-10">
        <LogoCajaPiura variante="blanco" className="h-14" />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-2 px-6 pb-10">
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--cp-brand)]">
          <IcUsuario />
        </span>
        <h1 className={`text-4xl font-medium ${sombra}`}>{usuario ? `Hola ${usuario.nombre.split(" ")[0]}` : "Hola"}</h1>
        <p className={`text-white/95 ${sombra}`}>¿Qué vas a realizar hoy?</p>
        <Link
          href="/entrar"
          onClick={() => track("principal", "tocar")}
          className="mt-5 flex min-h-13 items-center justify-center rounded-lg bg-[var(--cp-surface-dark)] text-lg font-medium text-[color-mix(in_srgb,var(--cp-app-blue)_55%,white)] shadow-lg active:bg-black"
        >
          Ingresar
        </Link>
        <Link
          href="/entrar?otra=1"
          onClick={() => {
            recordarUsuario(null);
            track("principal-otra-cuenta", "tocar");
          }}
          className={`self-center px-2 py-1 text-sm text-white ${sombra}`}
        >
          {usuario ? "¿Quieres ingresar con otra cuenta?" : "¿Primera vez? Ingresa con tu DNI"}
        </Link>
      </main>

      <nav aria-label="Accesos" className={`grid grid-cols-4 px-2 pb-6 text-xs ${sombra}`}>
        {[
          { t: "Ubícanos", I: IcUbicacion },
          { t: "Contáctenos", I: IcAuricular },
          { t: "Token Digital", I: IcToken },
          { t: "Para ti", I: IcParaTi },
        ].map(({ t, I }) => (
          <Link key={t} href={info(t)} className="flex flex-col items-center justify-center gap-1 text-white">
            <I className="h-8 w-8" />
            {t}
          </Link>
        ))}
      </nav>
    </FondoAcceso>
  );
}
