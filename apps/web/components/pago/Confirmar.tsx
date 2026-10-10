"use client";
// Dueño: Agente B. Confirmación común de pagos: /pagar/confirmar?tipo=CUOTA|FRECUENTE|RECIBO&ref=<id>[&fallar=1]
import type { ConfirmarPagoRes, PrepararPagoRes, TipoPago } from "@cp/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { soles } from "@/lib/formato";
import { iniciarFlujo, marcarAyuda, track, usoAyuda } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { callar, hablar, montoHablado } from "@/lib/voz";
import { borrarKey, guardarKey, guardarResultado, leerKey } from "./almacen";
import { EstilosPago } from "./EstilosPago";
import { HojaAutenticacion, type MetodoAuth } from "./HojaAutenticacion";
import { IconoX } from "./Iconos";

const TIPOS: TipoPago[] = ["CUOTA", "FRECUENTE", "RECIBO"];
type Estado =
  | { fase: "cargando" }
  | { fase: "listo" }
  | { fase: "autenticando" }
  | { fase: "procesando" }
  | { fase: "fallido" }
  | { fase: "cancelado" }
  | { fase: "error"; codigo: string; mensaje: string };

const PASOS = [
  { id: "monto", texto: "Esto es lo que vas a pagar. Revisa que el monto sea correcto." },
  { id: "destinatario", texto: "Aquí ves a quién le pagas. Así sabes que el dinero va al lugar correcto." },
  { id: "cuenta", texto: "El dinero sale de esta cuenta tuya. Solo mostramos los últimos 4 números, para cuidarte." },
  { id: "boton", texto: "Si todo está bien, toca Confirmar pago. Luego pon tu huella. Sin tu huella no se mueve nada." },
] as const;
type Paso = (typeof PASOS)[number]["id"];

const empresaDe = (destinatario: string) => destinatario.split(" · ")[0];

export function Confirmar() {
  const params = useSearchParams();
  const router = useRouter();
  const { asistida } = useVista();
  const tipoParam = (params.get("tipo") ?? "").toUpperCase() as TipoPago;
  const tipo = TIPOS.includes(tipoParam) ? tipoParam : null;
  const ref = Number(params.get("ref"));
  const fallar = params.get("fallar") === "1";
  const flujo = tipo ?? undefined;

  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [pago, setPago] = useState<PrepararPagoRes | null>(null);
  const [saldoInsuficiente, setSaldoInsuficiente] = useState(false);
  const [guia, setGuia] = useState<number | null>(null);
  const intentos = useRef(0);
  const leido = useRef(false);
  const metodo = useRef<MetodoAuth>("HUELLA");
  const bloques = useRef<Partial<Record<Paso, HTMLElement | null>>>({});

  const leerEnVoz = useCallback((p: PrepararPagoRes) => {
    hablar(`Vas a pagar ${montoHablado(p.monto)} a ${empresaDe(p.destinatario)}, desde tu cuenta terminada en ${p.cuenta.numeroOculto.slice(-4)}`);
  }, []);

  const preparar = useCallback(async () => {
    if (!tipo || !Number.isInteger(ref) || ref <= 0) {
      setEstado({ fase: "error", codigo: "VALIDACION", mensaje: "No encontramos este pago. Vuelve al inicio e inténtalo otra vez." });
      return;
    }
    setEstado({ fase: "cargando" });
    try {
      const p = await api<PrepararPagoRes>("/pagos/preparar", { cuerpo: { tipo, referenciaId: ref } });
      // Si hubo un intento anterior (falló o se recargó la página), se reutiliza su key: nunca se cobra dos veces.
      const previa = leerKey(tipo, ref);
      if (!previa) guardarKey(tipo, ref, p.idempotencyKey);
      setPago(previa ? { ...p, idempotencyKey: previa } : p);
      setSaldoInsuficiente(!p.saldoSuficiente);
      setEstado({ fase: "listo" });
    } catch (e) {
      if (esSinSesion(e)) return router.replace("/entrar");
      const f = e instanceof ApiFallo ? e : new ApiFallo(0, "INTERNO", "Ocurrió un error. Inténtalo de nuevo.");
      if (f.codigo === "YA_PAGADO") borrarKey(tipo, ref);
      setEstado({ fase: "error", codigo: f.codigo, mensaje: f.message });
      track("confirmar", "error", { flujo });
    }
  }, [tipo, ref, router, flujo]);

  useEffect(() => {
    // Llegó desde el asistente (Ayuda navega directo aquí): el tiempo se mide desde ahora, sin perder la marca de ayuda.
    // Sin esto, "completar" usaría el inicio de una operación anterior y el panel mostraría tiempos inflados.
    if (flujo && usoAyuda()) {
      iniciarFlujo(flujo);
      marcarAyuda();
    }
    track("confirmar", "ver", { flujo });
    preparar();
    return () => callar();
  }, [preparar, flujo]);

  // En vista asistida se lee el resumen en voz alta al cargar (una vez).
  useEffect(() => {
    if (estado.fase !== "listo" || !pago || leido.current) return;
    leido.current = true;
    if (asistida && pago.saldoSuficiente) leerEnVoz(pago);
  }, [estado.fase, pago, asistida, leerEnVoz]);

  // Modo guía: lleva cada bloque a la vista y lo lee.
  useEffect(() => {
    if (guia === null) return;
    bloques.current[PASOS[guia].id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    hablar(PASOS[guia].texto);
  }, [guia]);

  const enviar = useCallback(
    async (m: MetodoAuth) => {
      if (!pago || !tipo) return;
      metodo.current = m;
      setEstado({ fase: "procesando" });
      const simularFallo = fallar && intentos.current === 0;
      intentos.current += 1;
      try {
        const r = await api<ConfirmarPagoRes>("/pagos/confirmar", {
          cuerpo: {
            tipo,
            referenciaId: ref,
            idempotencyKey: pago.idempotencyKey,
            autenticacion: m,
            conAyuda: usoAyuda(),
            ...(simularFallo ? { simularFallo: true } : {}),
          },
        });
        if (r.estado === "FALLIDO") {
          setEstado({ fase: "fallido" });
          track("pago-fallido", "ver", { flujo });
          track("pago-fallido", "error", { flujo });
          if (asistida) hablar("No se realizó el pago. No se cobró nada. Puedes intentar de nuevo.");
          return;
        }
        borrarKey(tipo, ref);
        guardarResultado({ ...r, tipo, referenciaId: ref, destinatario: pago.destinatario });
        router.replace("/pagar/exito");
      } catch (e) {
        if (esSinSesion(e)) return router.replace("/entrar");
        const f = e instanceof ApiFallo ? e : new ApiFallo(0, "INTERNO", "Ocurrió un error. Inténtalo de nuevo.");
        track("confirmar", "error", { flujo });
        if (f.codigo === "SALDO_INSUFICIENTE") {
          setSaldoInsuficiente(true);
          setEstado({ fase: "listo" });
          return;
        }
        if (f.codigo === "KEY_REUTILIZADA") {
          borrarKey(tipo, ref);
          return preparar();
        }
        if (f.codigo === "YA_PAGADO") borrarKey(tipo, ref);
        // Sin conexión o error del servidor: la key se conserva; reintentar no cobra dos veces.
        setEstado({ fase: "error", codigo: f.codigo, mensaje: f.message });
      }
    },
    [pago, tipo, ref, fallar, asistida, router, flujo, preparar],
  );

  const cancelar = useCallback(() => {
    callar();
    track("confirmar", "abandonar", { flujo });
    setEstado({ fase: "cancelado" });
    setTimeout(() => {
      if (window.history.length > 1) router.back();
      else router.replace("/inicio");
    }, 1400);
  }, [router, flujo]);

  const empezarGuia = () => {
    marcarAyuda();
    track("confirmar", "ayuda", { flujo, ayudaUsada: true });
    setGuia(0);
  };

  const activo = guia !== null ? PASOS[guia].id : null;
  const marcar = (id: Paso) => (activo === id ? "guia-toca ring-4 ring-marca/40" : "");
  const registrar = (id: Paso) => (el: HTMLElement | null) => {
    bloques.current[id] = el;
  };

  // ── Pantallas de estado ─────────────────────────────
  if (estado.fase === "cargando" || estado.fase === "procesando") {
    return (
      <Pantalla titulo="Confirmar pago">
        <Cargando texto={estado.fase === "procesando" ? "Procesando tu pago…" : "Preparando tu pago…"} />
      </Pantalla>
    );
  }

  if (estado.fase === "cancelado") {
    return (
      <Pantalla titulo="Pago cancelado">
        <EstilosPago />
        <Tarjeta tono="marca" className="anim-aparece text-center">
          <p className="text-2xl font-bold">Cancelaste el pago</p>
          <p className="mt-2 text-lg">No se movió dinero de tu cuenta.</p>
        </Tarjeta>
      </Pantalla>
    );
  }

  if (estado.fase === "fallido") {
    return (
      <Pantalla titulo="Pago no realizado" volver="/inicio">
        <EstilosPago />
        <div className="anim-aparece flex flex-col items-center gap-3 pt-4 text-center">
          <IconoX />
          <h2 className="text-2xl font-bold">No se realizó el pago</h2>
          <p className="text-xl">No se cobró nada.</p>
          <p className="text-tenue">Tu dinero sigue en tu cuenta. Puedes intentarlo otra vez sin miedo: no se cobrará dos veces.</p>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Boton
            guia={asistida}
            onClick={() => {
              track("pago-fallido", "tocar", { flujo });
              enviar(metodo.current);
            }}
          >
            Intentar de nuevo
          </Boton>
          <Boton variante="secundario" href="/inicio">
            Volver al inicio
          </Boton>
        </div>
      </Pantalla>
    );
  }

  if (estado.fase === "error") {
    const yaPagado = estado.codigo === "YA_PAGADO";
    const sinDeuda = estado.codigo === "SIN_DEUDA";
    return (
      <Pantalla titulo="Confirmar pago" volver="/inicio">
        {yaPagado || sinDeuda ? (
          <Tarjeta tono="exito" className="text-center">
            <p className="text-2xl font-bold">{yaPagado ? "Este pago ya está hecho" : "No tienes deuda pendiente"}</p>
            <p className="mt-2 text-lg">{yaPagado ? "No se volverá a cobrar." : estado.mensaje}</p>
          </Tarjeta>
        ) : (
          <MensajeError mensaje={estado.mensaje} reintentar={pago ? () => setEstado({ fase: "listo" }) : preparar} />
        )}
        <Boton variante={yaPagado || sinDeuda ? "primario" : "secundario"} href="/inicio">
          Volver al inicio
        </Boton>
      </Pantalla>
    );
  }

  if (!pago) return null;

  return (
    <Pantalla
      titulo="Confirmar pago"
      volver="/inicio"
      pie={
        saldoInsuficiente ? (
          <Boton variante="secundario" href="/inicio">
            Volver al inicio
          </Boton>
        ) : (
          <div className="flex flex-col gap-2">
            <div ref={registrar("boton")} className={`rounded-boton ${marcar("boton")}`}>
              <Boton
                guia={asistida && guia === null}
                onClick={() => {
                  callar();
                  track("confirmar", "tocar", { flujo });
                  setGuia(null);
                  setEstado({ fase: "autenticando" });
                }}
              >
                Confirmar pago
              </Boton>
            </div>
            <Boton variante="fantasma" onClick={cancelar}>
              Cancelar
            </Boton>
          </div>
        )
      }
    >
      <EstilosPago />

      {guia !== null && (
        <div className="sticky top-16 z-30 rounded-2xl border-2 border-marca bg-superficie p-3 shadow-lg" aria-live="polite">
          <Mascota tamano={56} mensaje={PASOS[guia].texto} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-tenue">
              Paso {guia + 1} de {PASOS.length}
            </span>
            <Boton bloque={false} onClick={() => setGuia(guia + 1 < PASOS.length ? guia + 1 : null)}>
              {guia + 1 < PASOS.length ? "Siguiente" : "Entendido"}
            </Boton>
          </div>
        </div>
      )}

      {asistida && guia === null && !saldoInsuficiente && <Mascota tamano={56} mensaje="Revisa y toca Confirmar pago." />}

      <section ref={registrar("monto")} className={`rounded-2xl bg-superficie p-4 text-center ${marcar("monto")}`}>
        <p className="text-lg text-tenue">Vas a pagar</p>
        <p className="text-5xl font-bold tracking-tight text-tinta">{soles(pago.monto)}</p>
        <p className="mt-1 text-lg">{pago.descripcion}</p>
      </section>

      {/* Ayudas arriba: en un celular de 5" quedaban tapadas por el pie fijo con "Confirmar pago". */}
      {!saldoInsuficiente && (asistida || guia === null) && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {asistida && (
            <Boton
              variante="fantasma"
              bloque={false}
              onClick={() => {
                track("confirmar", "tocar", { flujo });
                leerEnVoz(pago);
              }}
            >
              🔊 Escuchar de nuevo
            </Boton>
          )}
          {guia === null && (
            <Boton variante="fantasma" bloque={false} className="text-base" onClick={empezarGuia}>
              Enséñame paso a paso
            </Boton>
          )}
        </div>
      )}

      <section ref={registrar("destinatario")} className={`rounded-2xl bg-superficie p-4 ${marcar("destinatario")}`}>
        <p className="text-tenue">A quién le pagas</p>
        <p className="text-2xl font-bold">{pago.destinatario}</p>
      </section>

      <section ref={registrar("cuenta")} className={`rounded-2xl bg-superficie p-4 ${marcar("cuenta")}`}>
        <p className="text-tenue">Desde tu cuenta</p>
        <p className="text-2xl font-bold">
          {pago.cuenta.tipo} {pago.cuenta.numeroOculto}
        </p>
        <p className="text-tenue">Saldo disponible: {soles(pago.cuenta.saldo)}</p>
      </section>

      {saldoInsuficiente && (
        <Tarjeta tono="aviso">
          <p className="text-xl font-bold">Tu cuenta no tiene saldo suficiente</p>
          <p className="mt-2 text-lg">
            Te faltan {soles(Math.max(0, pago.monto - pago.cuenta.saldo))}. Deposita en cualquier agencia o agente Caja Piura, o recibe una
            transferencia. Luego vuelve aquí y paga en 2 toques.
          </p>
          <p className="mt-2 text-tenue">No se movió dinero.</p>
        </Tarjeta>
      )}

      {estado.fase === "autenticando" && <HojaAutenticacion asistida={asistida} onOk={enviar} onCancelar={cancelar} />}
    </Pantalla>
  );
}
