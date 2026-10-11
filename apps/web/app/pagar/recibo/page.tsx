"use client";
// Dueño: Agente C. Ruta C: foto del recibo → la IA lee SOLO el código → Caja Piura da el monto real → confirmar.
import type { LeerReciboRes, ReciboRes } from "@cp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { comprimirFoto } from "@/components/ia/comprimir";
import { TecladoCodigo } from "@/components/ia/TecladoCodigo";
import { ICONO_RUBRO, largoCodigo, type ServicioOpcion } from "@/components/ia/tipos";
import { Boton, Cargando, Mascota, MensajeError, Pantalla, Tarjeta } from "@/components/ui";
import { ApiFallo, api, esSinSesion } from "@/lib/api";
import { fechaCorta, soles } from "@/lib/formato";
import { iniciarFlujo, marcarAyuda, track, usoAyuda } from "@/lib/track";
import { useVista } from "@/lib/vista";
import { hablar, montoHablado } from "@/lib/voz";

type Demo = { key: string; url: string; empresa: string };
type Estado =
  | { paso: "inicio" }
  | { paso: "leyendo" }
  | { paso: "buscando" }
  | { paso: "listo"; recibo: ReciboRes }
  | { paso: "nolei"; motivo: string }
  | { paso: "escribir" }
  | { paso: "sindeuda" };

const FLUJO = { flujo: "RECIBO" as const };

export default function PagarRecibo() {
  const router = useRouter();
  const { asistida } = useVista();
  const [estado, setEstado] = useState<Estado>({ paso: "inicio" });
  const [demos, setDemos] = useState<Demo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fallos, setFallos] = useState(0);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Si viene del asistente (Ayuda), la operación sigue contando como "con ayuda".
    const conAyuda = usoAyuda();
    iniciarFlujo("RECIBO");
    if (conAyuda) marcarAyuda();
    track("pagar-recibo", "ver", FLUJO);
    api<Demo[]>("/recibos/demo")
      .then(setDemos)
      .catch((e) => esSinSesion(e) && router.replace("/entrar"));
  }, [router]);

  function fallo(e: unknown) {
    if (esSinSesion(e)) return router.replace("/entrar");
    setError(e instanceof ApiFallo ? e.message : "No pudimos cargar tus datos. Vuelve a intentar.");
    setEstado({ paso: "inicio" });
  }

  async function consultar(codigo: string, servicioId: number): Promise<boolean> {
    setEstado({ paso: "buscando" });
    try {
      const recibo = await api<ReciboRes>(`/recibos/${codigo}?servicioId=${servicioId}`);
      setEstado({ paso: "listo", recibo });
      track("pagar-recibo", "completar", FLUJO);
      if (asistida) hablar(`Recibo de ${recibo.empresa}. Monto según Caja Piura: ${montoHablado(recibo.monto)}.`);
      return true;
    } catch (e) {
      if (e instanceof ApiFallo && e.codigo === "NO_HAY_DEUDA") {
        setEstado({ paso: "sindeuda" });
        return true;
      }
      if (e instanceof ApiFallo && e.codigo === "CODIGO_INVALIDO") {
        setError(e.message);
        setEstado({ paso: "escribir" });
        return false;
      }
      fallo(e);
      return false;
    }
  }

  async function leer(cuerpo: { demoKey: string } | FormData) {
    setError(null);
    setEstado({ paso: "leyendo" });
    track("leer-recibo", "ver", FLUJO);
    try {
      const r = await api<LeerReciboRes>("/recibos/leer", cuerpo instanceof FormData ? { formData: cuerpo } : { cuerpo });
      if (!r.ok) {
        track("leer-recibo", "error", FLUJO);
        setFallos((n) => n + 1);
        setEstado({ paso: "nolei", motivo: r.motivo });
        return;
      }
      track("leer-recibo", "completar", FLUJO);
      await consultar(r.codigo, r.servicioId);
    } catch (e) {
      track("leer-recibo", "error", FLUJO);
      if (esSinSesion(e)) return router.replace("/entrar");
      setFallos((n) => n + 1);
      // Nunca un error técnico en pantalla: siempre queda el camino de escribir el código con guía.
      setEstado({
        paso: "nolei",
        motivo: e instanceof ApiFallo && e.codigo === "SIN_CONEXION" ? e.message : "No pude leer la foto ahora. Escribe el código del recibo: yo te guío.",
      });
    }
  }

  async function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEstado({ paso: "leyendo" });
    let blob: Blob = file;
    try {
      blob = await comprimirFoto(file);
    } catch {
      /* si no se puede comprimir, se intenta con la original */
    }
    const fd = new FormData();
    // El nombre original ayuda a reconocer los recibos de demo si la IA no responde.
    fd.append("imagen", blob, file.name || "recibo.jpg");
    leer(fd);
  }

  function tomarFoto(origen: "camara" | "galeria") {
    track("pagar-recibo", "tocar", FLUJO);
    (origen === "camara" ? camara : galeria).current?.click();
  }

  function pagar(recibo: ReciboRes) {
    track("pagar-recibo", "tocar", FLUJO);
    router.push(`/pagar/confirmar?tipo=RECIBO&ref=${recibo.id}`);
  }

  const inputs = (
    <>
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegirFoto} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={alElegirFoto} />
    </>
  );

  return (
    <Pantalla titulo="Pagar un recibo" volver="/pagos">
      {inputs}
      {error && <MensajeError mensaje={error} />}

      {estado.paso === "inicio" && (
        <>
          <Mascota mensaje={asistida ? "Toma una foto de tu recibo. Solo leo el código, nada más." : "Foto del recibo o código: tú eliges."} />
          <Boton guia={asistida} onClick={() => tomarFoto("camara")} className="py-5 text-xl">
            <IconoCamara /> Tomar foto
          </Boton>
          <Boton variante="secundario" onClick={() => tomarFoto("galeria")}>
            Elegir de mi galería
          </Boton>
          <Boton
            variante="fantasma"
            onClick={() => {
              track("pagar-recibo", "tocar", FLUJO);
              setEstado({ paso: "escribir" });
            }}
          >
            Prefiero escribir el código
          </Boton>
          {demos.length > 0 && (
            <section className="mt-2 flex flex-col gap-2">
              <h2 className="text-lg font-bold">Recibos de ejemplo (demo)</h2>
              <p className="text-tenue">{asistida ? "Toca uno para probar sin cámara." : "Prueba sin cámara."}</p>
              <div className="grid grid-cols-3 gap-2">
                {demos.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      track("pagar-recibo", "tocar", FLUJO);
                      leer({ demoKey: d.key });
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border-2 border-linea bg-superficie p-2 active:bg-marca-claro"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.url} alt={`Recibo de ejemplo de ${d.empresa}`} loading="lazy" width={90} height={130} className="h-28 w-full rounded-lg object-cover object-top" />
                    <span className="text-sm font-bold">{d.empresa}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {(estado.paso === "leyendo" || estado.paso === "buscando") && (
        <>
          <Mascota animada mensaje={estado.paso === "leyendo" ? "Leyendo tu recibo…" : "Consultando a Caja Piura…"} />
          <Cargando texto={estado.paso === "leyendo" ? "Solo leo el código, nada más." : "Buscando el monto real…"} />
        </>
      )}

      {estado.paso === "listo" && (
        <>
          <Mascota mensaje={asistida ? "¡Lo encontré! Revisa que sea tu recibo." : "Recibo encontrado."} />
          <Tarjeta className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {ICONO_RUBRO[estado.recibo.rubro] ?? "🧾"}
              </span>
              <div>
                <p className="text-xl font-bold">{estado.recibo.empresa}</p>
                <p className="text-tenue">Código {estado.recibo.codigo}</p>
              </div>
            </div>
            <p className="text-lg">
              Titular: <span className="font-bold">{estado.recibo.titularOculto}</span>
            </p>
            <div className="rounded-xl bg-marca-claro p-3 text-center">
              <p className="text-tenue">Monto según Caja Piura</p>
              <p className="text-4xl font-bold">{soles(estado.recibo.monto)}</p>
              <p className="text-tenue">Vence el {fechaCorta(estado.recibo.vencimiento)}</p>
            </div>
            <p className="text-sm text-tenue">No usamos el monto de la foto. El monto real lo da Caja Piura.</p>
          </Tarjeta>
          <Boton guia onClick={() => pagar(estado.recibo)} className="py-5 text-xl">
            Pagar
          </Boton>
          <Boton variante="fantasma" onClick={() => setEstado({ paso: "inicio" })}>
            No es mi recibo
          </Boton>
        </>
      )}

      {estado.paso === "nolei" && (() => {
        // Si la IA no está disponible o ya falló 2 veces, lo primero es escribir el código (siempre funciona).
        const escribirPrimero = fallos >= 2 || !estado.motivo.startsWith("No pude leer el código");
        const botonFoto = (
          <Boton key="foto" guia={asistida && !escribirPrimero} variante={escribirPrimero ? "secundario" : undefined} onClick={() => tomarFoto("camara")}>
            <IconoCamara /> Tomar otra foto
          </Boton>
        );
        const botonEscribir = (
          <Boton key="escribir" guia={asistida && escribirPrimero} variante={escribirPrimero ? undefined : "secundario"} onClick={() => setEstado({ paso: "escribir" })}>
            Escribir el código
          </Boton>
        );
        return (
          <>
            <Mascota
              mensaje={
                escribirPrimero
                  ? asistida
                    ? "Escribe el código del recibo. Está arriba, cerca de tu nombre."
                    : "Escribe el código del recibo."
                  : asistida
                    ? "No pude leerlo. Prueba con más luz y el recibo derecho."
                    : "No se pudo leer. Toma otra foto o escribe el código."
              }
            />
            <Tarjeta tono="aviso">
              <p className="text-lg">{estado.motivo}</p>
            </Tarjeta>
            {escribirPrimero ? [botonEscribir, botonFoto] : [botonFoto, botonEscribir]}
          </>
        );
      })()}

      {estado.paso === "sindeuda" && (
        <>
          <Tarjeta tono="exito" className="text-center">
            <p className="text-2xl font-bold">Este recibo no tiene deuda pendiente</p>
            <p className="mt-2 text-lg">No necesitas pagar nada por ahora.</p>
          </Tarjeta>
          <Boton variante="secundario" onClick={() => setEstado({ paso: "inicio" })}>
            Pagar otro recibo
          </Boton>
          <Boton variante="fantasma" href="/inicio">
            Volver al inicio
          </Boton>
        </>
      )}

      {estado.paso === "escribir" && (
        <EscribirCodigo
          asistida={asistida}
          onBuscar={async (codigo, servicioId) => {
            setError(null);
            track("pagar-recibo", "tocar", FLUJO);
            return consultar(codigo, servicioId);
          }}
          onFoto={() => setEstado({ paso: "inicio" })}
        />
      )}
    </Pantalla>
  );
}

function EscribirCodigo({
  asistida,
  onBuscar,
  onFoto,
}: {
  asistida: boolean;
  onBuscar: (codigo: string, servicioId: number) => Promise<boolean>;
  onFoto: () => void;
}) {
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [elegido, setElegido] = useState<ServicioOpcion | null>(null);
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    api<ServicioOpcion[]>("/recibos/servicios")
      .then(setServicios)
      .catch(() => setServicios([]));
  }, []);

  if (!servicios) return <Cargando texto="Cargando empresas…" />;

  if (!elegido) {
    return (
      <>
        <Mascota mensaje="¿De qué empresa es tu recibo?" />
        <div className="grid grid-cols-2 gap-3">
          {servicios.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                track("pagar-recibo", "tocar", FLUJO);
                setElegido(s);
                setCodigo("");
              }}
              className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-marca bg-superficie p-3 text-lg font-bold text-marca active:bg-marca-claro ${asistida && i === 0 ? "guia-toca" : ""}`}
            >
              <span className="text-3xl" aria-hidden>
                {ICONO_RUBRO[s.rubro] ?? "🧾"}
              </span>
              {s.empresa}
            </button>
          ))}
        </div>
        <Boton variante="fantasma" onClick={onFoto}>
          Mejor tomo una foto
        </Boton>
      </>
    );
  }

  const largo = largoCodigo(elegido.formatoCodigo);
  const completo = codigo.length === largo;
  return (
    <>
      <Mascota mensaje={elegido.ayudaCodigo} />
      <p className="text-center text-lg">
        <span className="font-bold">{elegido.empresa}</span> ·{" "}
        <button type="button" className="text-marca underline underline-offset-4" onClick={() => setElegido(null)}>
          cambiar empresa
        </button>
      </p>
      <TecladoCodigo valor={codigo} largo={largo} onCambio={setCodigo} etiqueta={elegido.rubro === "TELEFONIA" ? "Número de celular" : "Código"} />
      <Boton guia={asistida && completo} disabled={!completo} onClick={() => onBuscar(codigo, elegido.id)}>
        {completo ? "Buscar mi recibo" : `Faltan ${largo - codigo.length} números`}
      </Boton>
    </>
  );
}

function IconoCamara() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
