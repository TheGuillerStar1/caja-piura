"use client";
// Ingreso, réplica de la app oficial: DNI (solo la primera vez o con "otra cuenta") → PIN de 6 dígitos con teclado
// aleatorio → /bienvenida (primer ingreso) o /inicio. La clave NUNCA se muestra; 2 errores → salida a agencia.
import type { ClienteDemo, LoginReq, LoginRes, MeRes } from "@cp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IcAtras, IcUsuario } from "@/components/app/IconosApp";
import { Boton, Mascota, Pantalla, Tarjeta } from "@/components/ui";
import { api, ApiFallo } from "@/lib/api";
import { cargarCliente, leerUsuario, recordarUsuario } from "@/lib/cliente";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { FondoAcceso } from "../_entrada/FondoAcceso";
import { BarraClave, Teclado } from "../_entrada/Teclado";

type Paso = "dni" | "clave" | "entrando" | "bloqueado";
const P = "entrar";
const sombra = "[text-shadow:0_1px_3px_rgb(70_50_150/0.45)]";

export default function Entrar() {
  const router = useRouter();
  const { setVista } = useVista();
  const [paso, setPaso] = useState<Paso>("dni");
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [demo, setDemo] = useState<ClienteDemo[]>([]);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    track(P, "ver", { flujo: "LOGIN" });
    iniciarFlujo("LOGIN");
    const otra = new URLSearchParams(location.search).has("otra");
    const u = otra ? null : leerUsuario();
    if (u) {
      setDni(u.dni);
      setNombre(u.nombre);
      setPaso("clave");
    }
    api<ClienteDemo[]>("/auth/clientes-demo").then(setDemo).catch(() => {});
  }, []);

  async function despuesDeEntrar() {
    track(P, "completar", { flujo: "LOGIN" });
    setPaso("entrando");
    try {
      const me: MeRes = await cargarCliente(true);
      if (me.vistaPreferida === null) {
        setVista(me.recomendacion.vista);
        router.replace("/bienvenida");
      } else {
        setVista(me.vistaPreferida);
        router.replace("/inicio");
      }
    } catch {
      router.replace("/inicio");
    }
  }

  async function login(cuerpo: LoginReq) {
    setEnviando(true);
    setError("");
    try {
      const r = await api<LoginRes>("/auth/login", { cuerpo });
      recordarUsuario({ dni: cuerpo.dni, nombre: r.nombre });
      await despuesDeEntrar();
    } catch (e) {
      const f = e instanceof ApiFallo ? e : new ApiFallo(0, "INTERNO", "Ocurrió un error. Inténtalo de nuevo.");
      track(P, f.codigo === "BLOQUEADO" ? "abandonar" : "error", { flujo: "LOGIN" });
      setClave("");
      if (f.codigo === "BLOQUEADO") setPaso("bloqueado");
      else if (f.codigo === "NO_EXISTE") {
        recordarUsuario(null);
        setError(f.message);
        setPaso("dni");
      } else setError(f.message);
    } finally {
      setEnviando(false);
    }
  }

  function elegirDni(valor: string, n = "") {
    setDni(valor);
    setNombre(n);
    setError("");
    setClave("");
    track(P, "tocar", { flujo: "LOGIN" });
    setPaso("clave");
  }

  // ── Bloqueado: salida a agencia ─────────────────
  if (paso === "bloqueado") {
    return (
      <Pantalla titulo="Recupera tu clave" volver="/">
        <div className="rounded-lg bg-superficie p-4">
          <Mascota mensaje="No te preocupes, esto pasa. Por tu seguridad pausamos el ingreso con clave." />
        </div>
        <Tarjeta tono="aviso">
          <p className="text-lg">
            Acércate a una agencia o llama al <b>(073) 284-500</b> para recuperar tu clave.
          </p>
        </Tarjeta>
        <a href="tel:073284500" className="text-center text-lg font-bold text-marca underline underline-offset-4">
          Llamar al (073) 284-500
        </a>
        <div className="mt-auto">
          <Boton variante="secundario" href="/">
            Volver al inicio
          </Boton>
        </div>
      </Pantalla>
    );
  }

  if (paso === "entrando") {
    return (
      <FondoAcceso>
        <div className="flex flex-1 flex-col items-center justify-center gap-4" role="status">
          <span aria-hidden="true" className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white" />
          <p className={`text-lg font-medium ${sombra}`}>Ingresando…</p>
        </div>
      </FondoAcceso>
    );
  }

  const enDni = paso === "dni";
  const dniValido = /^\d{8}$/.test(dni);
  const primerNombre = nombre.split(" ")[0];

  function digito(d: string) {
    if (enviando) return;
    setError("");
    if (enDni) return setDni((v) => (v.length < 8 ? v + d : v));
    if (clave.length >= 6) return;
    const nueva = clave + d;
    setClave(nueva);
    if (nueva.length === 6) login({ metodo: "CLAVE", dni, clave: nueva });
  }

  return (
    <FondoAcceso>
      <header className="flex h-14 items-center px-1">
        {enDni ? (
          <Link href="/" aria-label="Volver" className="flex w-12 items-center justify-center">
            <IcAtras />
          </Link>
        ) : (
          <button
            type="button"
            aria-label="Volver"
            className="flex w-12 items-center justify-center"
            onClick={() => (leerUsuario() ? router.push("/") : setPaso("dni"))}
          >
            <IcAtras />
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col justify-end gap-3 px-6 pb-6">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#3d3a8c]">
          <IcUsuario />
        </span>
        <h1 className={`text-center text-4xl font-medium ${sombra}`}>{enDni ? "Hola" : primerNombre || "Hola"}</h1>
        <p className={`text-center text-white/95 ${sombra}`}>{enDni ? "Ingresa tu número de DNI" : "Ingresa tu pin de 6 dígitos"}</p>

        {enDni ? (
          <div className="flex h-14 items-center rounded-lg bg-fondo px-4" aria-live="polite">
            <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M6 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 13.5h3" />
            </svg>
            <span className={`flex-1 text-center text-2xl font-medium tracking-[0.3em] ${dni ? "text-white" : "text-white/40"}`}>{dni || "DNI"}</span>
          </div>
        ) : (
          <BarraClave largo={clave.length} error={Boolean(error)} />
        )}

        {error && (
          <p role="alert" className="rounded-md bg-fondo/85 px-3 py-2 text-center font-medium text-white">
            {error}
          </p>
        )}

        {enDni ? (
          demo.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className={`text-center text-sm ${sombra}`}>O elige un cliente de prueba:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {demo.map((c) => (
                  <button
                    key={c.dni}
                    type="button"
                    onClick={() => elegirDni(c.dni, c.nombre)}
                    className="min-h-10! rounded-full bg-white/90 px-3 text-sm font-medium text-[#2d2a6e] active:bg-white"
                    title={c.descripcion}
                  >
                    {c.nombre.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <Link href="/servicio?n=Recuperar%20clave&v=/entrar" className={`self-center px-2 text-sm ${sombra}`}>
            ¿Olvidaste tu clave?
          </Link>
        )}
      </main>

      <Teclado
        deshabilitado={enviando}
        onDigito={digito}
        onBorrar={() => (enDni ? setDni((v) => v.slice(0, -1)) : setClave((c) => c.slice(0, -1)))}
        listoActivo={enDni ? dniValido : clave.length === 6}
        onListo={() => (enDni ? elegirDni(dni) : login({ metodo: "CLAVE", dni, clave }))}
      />
    </FondoAcceso>
  );
}
