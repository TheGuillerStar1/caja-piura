"use client";
// Pagar un servicio DENTRO del chat de Pía: rubro → empresa → código del recibo → Pía busca la deuda en la empresa.
// Con el recibo encontrado sigue la tarjeta de pago del chat (monto, cuenta, «Confirmar pago» y huella).
// Esta tarjeta no paga nada: solo consulta. Si no encuentra el código, puede tomarle una foto al recibo.
import type { ReciboRes } from "@cp/shared";
import { Camera, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconoRubro } from "@/components/ia/IconoRubro";
import { largoCodigo, type ServicioOpcion } from "@/components/ia/tipos";
import { Boton } from "@/components/ui";
import { ApiFallo, api } from "@/lib/api";
import { track } from "@/lib/track";

type Rubro = "LUZ" | "AGUA" | "TELEFONIA" | "INTERNET";
type Props = {
  rubro: Rubro | null;
  empresa: string | null;
  codigo: string | null;
  /** true solo en el último mensaje de Pía: marca con «Toca aquí» lo que hay que tocar. */
  activo: boolean;
  alEncontrar: (r: ReciboRes) => void;
  alFoto: () => void;
};

const RUBROS: Record<string, string> = { LUZ: "Luz", AGUA: "Agua", TELEFONIA: "Celular", INTERNET: "Internet" };
const NOMBRE_CODIGO: Record<string, string> = { LUZ: "Código de suministro", AGUA: "Código de suministro", TELEFONIA: "Número de celular", INTERNET: "Código de cliente" };
/** Recibos de prueba de la demo (los mismos de las fotos de ejemplo). */
const CODIGO_PRUEBA: Record<string, string> = { Enosa: "31264587", "EPS Grau": "2045871", Movistar: "912345678" };

export function ServicioEnChat({ rubro: rubroDicho, empresa: empresaDicha, codigo: codigoDicho, activo, alEncontrar, alFoto }: Props) {
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [rubro, setRubro] = useState<string | null>(rubroDicho);
  const [elegido, setElegido] = useState<ServicioOpcion | null>(null);
  const [codigo, setCodigo] = useState(codigoDicho ?? "");
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [hecho, setHecho] = useState(false);
  // Una sola consulta automática aunque el efecto corra dos veces (modo estricto de React en desarrollo).
  const iniciada = useRef(false);

  const consultar = useCallback(
    async (s: ServicioOpcion, c: string) => {
      if (hecho) return;
      setBuscando(true);
      setAviso("");
      try {
        const r = await api<ReciboRes>(`/recibos/${c.replace(/\D/g, "")}?servicioId=${s.id}`);
        track("servicio-chat", "tocar", { flujo: "RECIBO" });
        setHecho(true);
        alEncontrar(r);
      } catch (e) {
        setAviso(e instanceof ApiFallo ? e.message : "No pudimos consultar el recibo. Vuelve a intentar.");
      } finally {
        setBuscando(false);
      }
    },
    [alEncontrar, hecho],
  );

  // Empresas de la app. Si Pía ya sabe la empresa (o el rubro tiene una sola), queda elegida; con código, busca sola.
  useEffect(() => {
    if (iniciada.current) return;
    iniciada.current = true;
    track("servicio-chat", "ver", { flujo: "RECIBO" });
    api<ServicioOpcion[]>("/recibos/servicios").then(
      (lista) => {
        setServicios(lista);
        const porNombre = empresaDicha ? lista.find((s) => s.empresa.toLowerCase() === empresaDicha.toLowerCase()) : undefined;
        const delRubro = rubroDicho ? lista.filter((s) => s.rubro === rubroDicho) : [];
        const s = porNombre ?? (delRubro.length === 1 ? delRubro[0] : undefined);
        if (s) {
          setElegido(s);
          setRubro(s.rubro);
          if (codigoDicho && new RegExp(s.formatoCodigo).test(codigoDicho)) consultar(s, codigoDicho);
        }
      },
      () => setAviso("No pudimos cargar las empresas. Vuelve a intentar."),
    );
    // Solo al aparecer la tarjeta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caja = "ml-10 flex flex-col gap-3 rounded-2xl border-2 border-marca/40 bg-superficie p-4";
  if (hecho) return null;
  if (!servicios) return <p className="ml-10 text-tenue">{aviso || "Cargando empresas…"}</p>;

  const foto = (
    <button type="button" onClick={alFoto} className="flex min-h-11 items-center gap-2 self-start font-bold text-marca underline underline-offset-4">
      <Camera className="h-5 w-5" aria-hidden /> Mejor le tomo foto al recibo
    </button>
  );

  // ── 1. ¿Qué servicio y qué empresa? ───────────────
  if (!elegido) {
    const rubros = [...new Set(servicios.map((s) => s.rubro))];
    const empresas = servicios.filter((s) => !rubro || s.rubro === rubro);
    return (
      <div className={caja}>
        <p className="text-lg font-bold">¿Qué servicio pagas?</p>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {rubros.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rubro === r}
              onClick={() => setRubro(r)}
              className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 font-bold ${rubro === r ? "border-marca bg-marca-claro text-marca" : "border-linea bg-fondo"}`}
            >
              <IconoRubro rubro={r} className="h-5 w-5 shrink-0 text-marca" />
              {RUBROS[r] ?? r}
            </button>
          ))}
        </div>
        <p className="font-bold">Empresa</p>
        <ul className="flex flex-col gap-2">
          {empresas.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setElegido(s);
                  setRubro(s.rubro);
                  setCodigo("");
                }}
                className={`${activo && i === 0 && rubro ? "guia-toca " : ""}flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-linea bg-fondo px-3 text-left text-lg font-bold hover:border-marca active:bg-marca-claro`}
              >
                <IconoRubro rubro={s.rubro} className="h-6 w-6 shrink-0 text-marca" />
                <span className="flex-1">{s.empresa}</span>
                <ChevronRight className="h-5 w-5 text-marca" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {foto}
      </div>
    );
  }

  // ── 2. Código del recibo ──────────────────────────
  const largo = largoCodigo(elegido.formatoCodigo);
  const limpio = codigo.replace(/\D/g, "");
  const valido = new RegExp(elegido.formatoCodigo).test(limpio);
  const nombre = NOMBRE_CODIGO[elegido.rubro] ?? "Código";
  return (
    <form
      className={caja}
      onSubmit={(e) => {
        e.preventDefault();
        if (valido && !buscando) consultar(elegido, limpio);
      }}
    >
      <div className="flex items-center gap-3">
        <IconoRubro rubro={elegido.rubro} className="h-7 w-7 shrink-0 text-marca" />
        <span className="flex-1 text-xl font-bold">{elegido.empresa}</span>
        {!buscando && (
          <button
            type="button"
            className="min-h-11 font-bold text-marca underline underline-offset-4"
            onClick={() => {
              setElegido(null);
              setAviso("");
            }}
          >
            Cambiar
          </button>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-bold">
          {nombre} ({largo} números)
        </span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, largo))}
          inputMode="numeric"
          autoComplete="off"
          disabled={buscando}
          placeholder={`Escribe el ${nombre.toLowerCase()}`}
          aria-label={nombre}
          className={`min-h-14 rounded-xl border-2 border-linea bg-fondo px-4 font-mono text-2xl tracking-widest focus:border-marca focus:outline-none ${activo && !valido ? "guia-toca" : ""}`}
        />
        <span className="text-sm text-tenue">{elegido.ayudaCodigo}</span>
      </label>
      {!valido && CODIGO_PRUEBA[elegido.empresa] && (
        <button type="button" onClick={() => setCodigo(CODIGO_PRUEBA[elegido.empresa])} className="min-h-10 self-start text-sm font-bold text-marca underline underline-offset-4">
          Usar un recibo de prueba
        </button>
      )}
      {aviso && <p className="rounded-xl bg-aviso-claro p-3 font-bold">{aviso}</p>}
      <Boton type="submit" guia={activo && valido && !buscando} disabled={!valido || buscando}>
        {buscando ? "Buscando tu recibo…" : "Buscar mi recibo"}
      </Boton>
      <p className="text-sm text-tenue">Buscar no paga nada. El monto lo da la empresa; en el siguiente paso confirmas tú.</p>
      {foto}
    </form>
  );
}
