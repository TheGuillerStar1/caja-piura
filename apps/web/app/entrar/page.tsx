"use client";
// Dueño: Agente A. Inicio de sesión guiado (fase 2): DNI → método (cara, huella o clave) → /bienvenida o /inicio.
// Biometría simulada. La clave NUNCA se muestra ni se insinúa; 2 errores → salida a agencia.
import type { ClienteDemo, LoginReq, LoginRes, MeRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { api, ApiFallo } from "@/lib/api";
import { iniciarFlujo, track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { Escaner } from "../_entrada/Escaner";
import { PuntosClave, Teclado } from "../_entrada/Teclado";

type Paso = "dni" | "metodo" | "escaneo" | "clave" | "entrando" | "bloqueado";
const P = "entrar";

export default function Entrar() {
  const router = useRouter();
  const { setVista } = useVista();
  const [paso, setPaso] = useState<Paso>("dni");
  const [dni, setDni] = useState("");
  const [nombreDemo, setNombreDemo] = useState("");
  const [demo, setDemo] = useState<ClienteDemo[]>([]);
  const [metodo, setMetodo] = useState<"ROSTRO" | "HUELLA">("HUELLA");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    track(P, "ver", { flujo: "LOGIN" });
    iniciarFlujo("LOGIN");
    api<ClienteDemo[]>("/auth/clientes-demo").then(setDemo).catch(() => {});
    return () => clearTimeout(temporizador.current);
  }, []);

  async function despuesDeEntrar() {
    track(P, "completar", { flujo: "LOGIN" });
    setPaso("entrando");
    try {
      const me = await api<MeRes>("/me");
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
      await api<LoginRes>("/auth/login", { cuerpo });
      await despuesDeEntrar();
    } catch (e) {
      const f = e instanceof ApiFallo ? e : new ApiFallo(0, "INTERNO", "Ocurrió un error. Inténtalo de nuevo.");
      if (f.codigo === "BLOQUEADO") {
        track(P, "abandonar", { flujo: "LOGIN" });
        setPaso("bloqueado");
      } else if (f.codigo === "CLAVE_INCORRECTA") {
        track(P, "error", { flujo: "LOGIN" });
        setClave("");
        setError(f.message);
      } else if (f.codigo === "NO_EXISTE") {
        track(P, "error", { flujo: "LOGIN" });
        setError(f.message);
        setPaso("dni");
      } else {
        track(P, "error", { flujo: "LOGIN" });
        setError(f.message);
        setPaso((p) => (p === "escaneo" ? "metodo" : p));
      }
    } finally {
      setEnviando(false);
    }
  }

  function elegirDni(valor: string, nombre = "") {
    setDni(valor);
    setNombreDemo(nombre);
    setError("");
    track(P, "tocar", { flujo: "LOGIN" });
    setPaso("metodo");
  }

  function biometria(m: "ROSTRO" | "HUELLA") {
    track(P, "tocar", { flujo: "LOGIN" });
    setMetodo(m);
    setError("");
    setPaso("escaneo");
    temporizador.current = setTimeout(() => login({ metodo: m, dni }), 1500);
  }

  function digitoClave(d: string) {
    if (enviando || clave.length >= 6) return;
    const nueva = clave + d;
    setClave(nueva);
    setError("");
    if (nueva.length === 6) login({ metodo: "CLAVE", dni, clave: nueva });
  }

  // ── Bloqueado: salida a agencia ─────────────────
  if (paso === "bloqueado") {
    return (
      <Pantalla titulo="Recupera tu clave">
        <Mascota mensaje="No te preocupes, esto pasa. Por tu seguridad pausamos el ingreso con clave." />
        <Tarjeta tono="aviso">
          <p className="text-lg">
            Acércate a una agencia o llama al <b>(073) 284-500</b> para recuperar tu clave.
          </p>
        </Tarjeta>
        <a href="tel:073284500" className="text-center text-lg font-bold text-marca underline underline-offset-4">
          Llamar al (073) 284-500
        </a>
        <Tarjeta>
          <p className="text-tenue">También puedes entrar con tu cara o tu huella.</p>
        </Tarjeta>
        <div className="mt-auto flex flex-col gap-3">
          <Boton
            onClick={() => {
              setClave("");
              setPaso("metodo");
            }}
          >
            Entrar con mi cara o huella
          </Boton>
          <Boton variante="secundario" href="/">
            Volver al inicio
          </Boton>
        </div>
      </Pantalla>
    );
  }

  // ── Escaneo simulado / entrando ─────────────────
  if (paso === "escaneo" || paso === "entrando") {
    return (
      <Pantalla titulo="Ingresar">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {paso === "escaneo" ? <Escaner tipo={metodo} /> : <p className="text-xl font-bold text-exito">¡Listo! Entrando…</p>}
        </div>
      </Pantalla>
    );
  }

  // ── Clave con teclado propio ────────────────────
  if (paso === "clave") {
    return (
      <Pantalla titulo="Usar mi clave">
        <Mascota mensaje="Es la clave de 6 números que creaste en la agencia." />
        <p className="text-sm text-tenue">Caja Piura nunca te pedirá tu clave por teléfono ni por mensaje. Nadie debe verla.</p>
        <div className="py-2">
          <PuntosClave largo={clave.length} error={Boolean(error)} />
        </div>
        {error && (
          <p role="alert" className="text-center text-lg font-bold text-error">
            {error}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3">
          <Teclado onDigito={digitoClave} onBorrar={() => setClave((c) => c.slice(0, -1))} deshabilitado={enviando} />
          <Boton variante="fantasma" onClick={() => setPaso("metodo")}>
            Prefiero usar mi cara o huella
          </Boton>
        </div>
      </Pantalla>
    );
  }

  // ── Método ─────────────────────────────────────
  if (paso === "metodo") {
    return (
      <Pantalla titulo="Ingresar">
        <Mascota animada mensaje={<>{nombreDemo ? `Hola, ${nombreDemo.split(" ")[0]}. ` : ""}¿Cómo quieres ingresar?</>} />
        {error && <MensajeError mensaje={error} />}
        <div className="flex flex-col gap-3">
          <BotonMetodo icono="🙂" texto="Ingresar con mi cara" ayuda="Solo mira a la cámara" guia onClick={() => biometria("ROSTRO")} />
          <BotonMetodo icono="👆" texto="Ingresar con mi huella" ayuda="Apoya tu dedo" onClick={() => biometria("HUELLA")} />
          <BotonMetodo
            icono="🔢"
            texto="Usar mi clave"
            ayuda="Tu clave de 6 números"
            onClick={() => {
              track(P, "tocar", { flujo: "LOGIN" });
              setError("");
              setClave("");
              setPaso("clave");
            }}
          />
        </div>
        <button type="button" className="mt-auto text-tenue underline underline-offset-4" onClick={() => setPaso("dni")}>
          No es mi DNI ({dni.replace(/^(\d{2})\d{4}/, "$1****")})
        </button>
      </Pantalla>
    );
  }

  // ── DNI ────────────────────────────────────────
  const dniValido = /^\d{8}$/.test(dni);
  return (
    <Pantalla titulo="Ingresar" volver="/">
      <Mascota mensaje="Escribe tu número de DNI." />
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (dniValido) elegirDni(dni);
        }}
      >
        <label htmlFor="dni" className="text-lg font-bold">
          Número de DNI
        </label>
        <input
          id="dni"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{8}"
          maxLength={8}
          value={dni}
          onChange={(e) => {
            setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
            setError("");
          }}
          placeholder="8 números"
          className="h-16 rounded-boton border-2 border-linea bg-superficie px-4 text-center text-3xl font-bold tracking-[0.3em] text-tinta outline-none focus:border-marca"
        />
        {error && <MensajeError mensaje={error} />}
        <Boton type="submit" guia={dniValido} disabled={!dniValido}>
          Continuar
        </Boton>
      </form>

      {demo.length > 0 && (
        <section className="mt-2 flex flex-col gap-2">
          <h2 className="font-bold text-tenue">O elige un cliente de prueba</h2>
          {demo.map((c) => (
            <button
              key={c.dni}
              type="button"
              onClick={() => elegirDni(c.dni, c.nombre)}
              className="flex items-center gap-3 rounded-2xl border-2 border-linea bg-superficie p-3 text-left active:bg-marca-claro"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marca-claro text-xl font-bold text-marca">
                {c.nombre[0]}
              </span>
              <span className="flex-1">
                <span className="block font-bold">
                  {c.nombre}, {c.edad}
                </span>
                <span className="block text-sm text-tenue">{c.descripcion}</span>
              </span>
              <span className="rounded-full bg-aviso-claro px-2 py-0.5 text-xs font-bold text-aviso">Demo</span>
            </button>
          ))}
        </section>
      )}
    </Pantalla>
  );
}

function BotonMetodo({ icono, texto, ayuda, guia, onClick }: { icono: string; texto: string; ayuda: string; guia?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border-2 border-marca bg-superficie p-4 text-left active:bg-marca-claro ${guia ? "guia-toca" : ""}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {icono}
      </span>
      <span>
        <span className="block text-xl font-bold text-marca">{texto}</span>
        <span className="block text-tenue">{ayuda}</span>
      </span>
    </button>
  );
}
