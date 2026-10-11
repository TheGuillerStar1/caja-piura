"use client";
// Confirmar un envío a contacto. Es el ÚNICO lugar donde se mueve dinero en un envío, y solo cuando el cliente
// toca "Confirmar envío" y pone su huella, rostro o clave. Pía nunca llega aquí sola: solo deja el borrador.
import type { Billetera, ConfirmarTransferenciaRes, PrepararTransferenciaRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EstilosPago } from "@/components/pago/EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "@/components/pago/HojaAutenticacion";
import { IconoCheck } from "@/components/pago/Iconos";
import { NOMBRE_BILLETERA, borrarBorrador, formatoCelular, guardarBorrador, leerBorrador, type Borrador } from "@/components/transferir/contactos";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaHora, soles } from "@/lib/formato";
import { track } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { callar, hablar, montoHablado } from "@/lib/voz";

type Estado =
  | { fase: "cargando" }
  | { fase: "listo" }
  | { fase: "autenticando" }
  | { fase: "procesando" }
  | { fase: "exito"; r: ConfirmarTransferenciaRes }
  | { fase: "cancelado" }
  | { fase: "otraBilletera"; mensaje: string; disponibles: Billetera[] }
  | { fase: "error"; mensaje: string; trasConfirmar: boolean };

const flujo = "TRANSFERENCIA" as const;

export default function ConfirmarEnvio() {
  const router = useRouter();
  const { asistida } = useVista();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [envio, setEnvio] = useState<PrepararTransferenciaRes | null>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const leido = useRef(false);
  const metodo = useRef<MetodoAuth>("HUELLA");

  const cuerpo = (b: Borrador) => ({ telefono: b.contacto.telefono, nombre: b.contacto.nombre, billetera: b.billetera, monto: b.monto });

  const preparar = useCallback(
    async (b: Borrador) => {
      setBorrador(b);
      setEstado({ fase: "cargando" });
      try {
        const p = await api<PrepararTransferenciaRes>("/transferencias/preparar", { cuerpo: cuerpo(b) });
        // Si ya hubo un intento (se cortó la conexión, recargó), se reutiliza su key: nunca se envía dos veces.
        const conKey = { ...b, idempotencyKey: b.idempotencyKey ?? p.idempotencyKey };
        guardarBorrador(conKey);
        setBorrador(conKey);
        setEnvio(p);
        setEstado({ fase: "listo" });
      } catch (e) {
        if (esSinSesion(e)) return router.replace("/entrar");
        track("confirmar-envio", "error", { flujo });
        if (e instanceof ApiFallo && e.codigo === "NO_AFILIADO") {
          const disponibles = (e.datos?.disponibles as Billetera[] | undefined) ?? [];
          return setEstado({ fase: "otraBilletera", mensaje: e.message, disponibles });
        }
        setEstado({ fase: "error", mensaje: e instanceof ApiFallo ? e.message : "No pudimos preparar el envío.", trasConfirmar: false });
      }
    },
    [router],
  );

  useEffect(() => {
    const b = leerBorrador();
    if (!b) {
      router.replace("/ayuda");
      return;
    }
    track("confirmar-envio", "ver", { flujo });
    preparar(b);
    return () => callar();
  }, [router, preparar]);

  const leerEnVoz = useCallback((p: PrepararTransferenciaRes) => {
    hablar(`Vas a enviar ${montoHablado(p.monto)} a ${p.nombre}, por ${NOMBRE_BILLETERA[p.billetera]}`);
  }, []);

  useEffect(() => {
    if (estado.fase !== "listo" || !envio || leido.current) return;
    leido.current = true;
    if (asistida && envio.saldoSuficiente) leerEnVoz(envio);
  }, [estado.fase, envio, asistida, leerEnVoz]);

  const enviar = useCallback(
    async (m: MetodoAuth) => {
      if (!borrador?.idempotencyKey) return;
      metodo.current = m;
      setEstado({ fase: "procesando" });
      try {
        const r = await api<ConfirmarTransferenciaRes>("/transferencias/confirmar", {
          cuerpo: { ...cuerpo(borrador), idempotencyKey: borrador.idempotencyKey, autenticacion: m },
        });
        borrarBorrador();
        setEstado({ fase: "exito", r });
        track("envio-exito", "ver", { flujo });
        if (!r.repetido) track("envio-exito", "completar", { flujo });
        if (asistida) hablar(`Listo. Enviaste ${montoHablado(r.monto)} a ${r.nombre}.`);
      } catch (e) {
        if (esSinSesion(e)) return router.replace("/entrar");
        track("confirmar-envio", "error", { flujo });
        const f = e instanceof ApiFallo ? e : new ApiFallo(0, "INTERNO", "No tenemos respuesta del envío todavía.");
        if (f.codigo === "SALDO_INSUFICIENTE") {
          setEnvio((p) => (p ? { ...p, saldoSuficiente: false } : p));
          return setEstado({ fase: "listo" });
        }
        if (f.codigo === "KEY_REUTILIZADA") {
          const limpio = { ...borrador, idempotencyKey: undefined };
          return preparar(limpio);
        }
        // Sin respuesta: la key se conserva; volver a revisar no envía dos veces.
        setEstado({ fase: "error", mensaje: f.message, trasConfirmar: true });
      }
    },
    [borrador, asistida, router, preparar],
  );

  const cancelar = useCallback(() => {
    callar();
    borrarBorrador();
    track("confirmar-envio", "abandonar", { flujo });
    setEstado({ fase: "cancelado" });
  }, []);

  // ── Estados ───────────────────────────────────────
  if (estado.fase === "cargando" || estado.fase === "procesando") {
    return (
      <Pantalla titulo="Confirmar envío">
        <Cargando texto={estado.fase === "procesando" ? "Enviando…" : "Preparando tu envío…"} />
      </Pantalla>
    );
  }

  if (estado.fase === "exito") {
    const r = estado.r;
    return (
      <Pantalla titulo="Envío realizado">
        <EstilosPago />
        <div className="anim-aparece flex flex-col items-center gap-2 pt-2 text-center">
          <IconoCheck className="h-24 w-24" />
          <h2 className="text-2xl font-bold text-exito">¡Envío realizado!</h2>
          <p className="text-5xl font-bold tracking-tight">{soles(r.monto)}</p>
          <p className="text-lg">
            A {r.nombre} por {NOMBRE_BILLETERA[r.billetera]}
          </p>
          {r.repetido && <p className="text-tenue">Este envío ya estaba hecho. No se cobró otra vez.</p>}
        </div>
        <Tarjeta>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-lg">
            <dt className="text-tenue">Titular</dt>
            <dd className="text-right font-bold">{r.titularOculto}</dd>
            <dt className="text-tenue">Celular</dt>
            <dd className="text-right">{r.telefonoOculto}</dd>
            <dt className="text-tenue">N.º de operación</dt>
            <dd className="text-right font-bold">{r.operacion}</dd>
            <dt className="text-tenue">Fecha</dt>
            <dd className="text-right">{fechaHora(r.fecha)}</dd>
          </dl>
        </Tarjeta>
        <div className="mt-auto flex flex-col gap-3">
          <Boton guia={asistida} href="/inicio">
            Volver al inicio
          </Boton>
          <Boton variante="secundario" href="/ayuda">
            Hablar con Pía
          </Boton>
        </div>
      </Pantalla>
    );
  }

  if (estado.fase === "cancelado") {
    return (
      <Pantalla titulo="Envío cancelado">
        <EstilosPago />
        <Tarjeta tono="marca" className="anim-aparece text-center">
          <p className="text-2xl font-bold">Cancelaste el envío</p>
          <p className="mt-2 text-lg">No se movió dinero de tu cuenta.</p>
        </Tarjeta>
        {envio && (
          <Tarjeta className="anim-aparece text-center">
            <p className="text-tenue">Tu saldo sigue igual</p>
            <p className="text-3xl font-bold">{soles(envio.cuenta.saldo)}</p>
          </Tarjeta>
        )}
        <Boton guia={asistida} href="/ayuda">
          Volver con Pía
        </Boton>
        <Boton variante="secundario" href="/inicio">
          Ir al inicio
        </Boton>
      </Pantalla>
    );
  }

  if (estado.fase === "otraBilletera" && borrador) {
    return (
      <Pantalla titulo="Confirmar envío" volver="/ayuda">
        <Tarjeta tono="aviso">
          <p className="text-xl font-bold">{estado.mensaje}</p>
          <p className="mt-2 text-tenue">No se movió dinero.</p>
        </Tarjeta>
        <p className="font-bold">Enviar a {borrador.contacto.nombre} por:</p>
        {estado.disponibles.map((b) => (
          <Boton
            key={b}
            variante="secundario"
            onClick={() => {
              track("confirmar-envio", "tocar", { flujo });
              preparar({ ...borrador, billetera: b, idempotencyKey: undefined });
            }}
          >
            {NOMBRE_BILLETERA[b]}
          </Boton>
        ))}
        <Boton variante="fantasma" onClick={cancelar}>
          Cancelar
        </Boton>
      </Pantalla>
    );
  }

  if (estado.fase === "error") {
    return (
      <Pantalla titulo="Confirmar envío" volver="/inicio">
        {estado.trasConfirmar ? (
          <>
            <Tarjeta tono="aviso" className="text-center">
              <p className="text-2xl font-bold">Estamos verificando tu envío</p>
              <p className="mt-2 text-lg">No vuelvas a enviar todavía.</p>
            </Tarjeta>
            <p className="text-center text-tenue">Toca «Revisar el envío» en un momento. Aunque lo toques varias veces, no se envía dos veces.</p>
            <Boton onClick={() => enviar(metodo.current)}>Revisar el envío</Boton>
          </>
        ) : (
          <MensajeError mensaje={estado.mensaje} reintentar={borrador ? () => preparar(borrador) : undefined} />
        )}
        <Boton variante="secundario" href="/inicio">
          Volver al inicio
        </Boton>
      </Pantalla>
    );
  }

  if (!envio || !borrador) return null;

  return (
    <Pantalla
      titulo="Confirmar envío"
      volver="/ayuda"
      pie={
        envio.saldoSuficiente ? (
          <div className="flex flex-col gap-2">
            <Boton
              guia={asistida}
              onClick={() => {
                callar();
                track("confirmar-envio", "tocar", { flujo });
                setEstado({ fase: "autenticando" });
              }}
            >
              Confirmar envío
            </Boton>
            <Boton variante="fantasma" onClick={cancelar}>
              Cancelar
            </Boton>
          </div>
        ) : (
          <Boton variante="secundario" onClick={cancelar}>
            Cancelar
          </Boton>
        )
      }
    >
      <EstilosPago />
      {asistida && envio.saldoSuficiente && <Mascota tamano={56} mensaje="Revisa a quién le envías y toca Confirmar envío." />}

      <section className="rounded-2xl bg-superficie p-4 text-center">
        <p className="text-lg text-tenue">Vas a enviar</p>
        <p className="text-5xl font-bold tracking-tight text-tinta">{soles(envio.monto)}</p>
        <p className="mt-1 text-lg">
          por <strong>{NOMBRE_BILLETERA[envio.billetera]}</strong> · Sin comisión
        </p>
      </section>

      {asistida && (
        <Boton variante="fantasma" bloque={false} className="self-center" onClick={() => leerEnVoz(envio)}>
          🔊 Escuchar de nuevo
        </Boton>
      )}

      <section className="rounded-2xl bg-superficie p-4">
        <p className="text-tenue">A quién le envías</p>
        <p className="text-2xl font-bold">{envio.nombre}</p>
        <p className="text-lg">{formatoCelular(borrador.contacto.telefono)}</p>
        <p className="mt-2 rounded-xl bg-fondo px-3 py-2">
          <span className="text-tenue">{NOMBRE_BILLETERA[envio.billetera]} dice que el número es de: </span>
          <strong>{envio.titularOculto}</strong>
        </p>
        <p className="mt-1 text-sm text-tenue">Si no es la persona que buscas, cancela.</p>
      </section>

      <section className="rounded-2xl bg-superficie p-4">
        <p className="text-tenue">Desde tu cuenta</p>
        <p className="text-2xl font-bold">
          {envio.cuenta.tipo} {envio.cuenta.numeroOculto}
        </p>
        <p className="text-tenue">Saldo disponible: {soles(envio.cuenta.saldo)}</p>
      </section>

      {!envio.saldoSuficiente && (
        <Tarjeta tono="aviso">
          <p className="text-xl font-bold">Tu cuenta no tiene saldo suficiente</p>
          <p className="mt-2 text-lg">Te faltan {soles(Math.max(0, envio.monto - envio.cuenta.saldo))}. No se movió dinero.</p>
        </Tarjeta>
      )}

      {estado.fase === "autenticando" && <HojaAutenticacion asistida={asistida} onOk={enviar} onCancelar={cancelar} />}
    </Pantalla>
  );
}
