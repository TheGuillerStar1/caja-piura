"use client";
// Dueño: Agente B. Hoja inferior de autenticación simulada antes de pagar (huella / rostro / clave de 6 dígitos).
import { useEffect, useState } from "react";
import { Boton } from "@/components/ui";
import { IconoHuella, IconoRostro } from "./Iconos";

export type MetodoAuth = "HUELLA" | "ROSTRO" | "CLAVE";
type Props = { onOk: (m: MetodoAuth) => void; onCancelar: () => void; asistida: boolean };

export function HojaAutenticacion({ onOk, onCancelar, asistida }: Props) {
  const [modo, setModo] = useState<"elegir" | "clave">("elegir");
  const [escaneando, setEscaneando] = useState<MetodoAuth | null>(null);
  const [clave, setClave] = useState("");

  useEffect(() => {
    if (!escaneando) return;
    const t = setTimeout(() => onOk(escaneando), 1200);
    return () => clearTimeout(t);
  }, [escaneando, onOk]);

  useEffect(() => {
    if (clave.length === 6) {
      const t = setTimeout(() => onOk("CLAVE"), 250);
      return () => clearTimeout(t);
    }
  }, [clave, onOk]);

  const tecla = (d: string) => setClave((c) => (c.length < 6 ? c + d : c));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50" role="dialog" aria-modal="true" aria-label="Confirma que eres tú">
      <div className="anim-hoja w-full max-w-md rounded-t-3xl bg-superficie px-5 pb-6 pt-5 shadow-2xl">
        {escaneando ? (
          <div className="flex flex-col items-center gap-4 py-6" role="status">
            <span className="anim-escanea rounded-full bg-marca-claro p-5 text-marca">
              {escaneando === "ROSTRO" ? <IconoRostro className="h-16 w-16" /> : <IconoHuella className="h-16 w-16" />}
            </span>
            <p className="text-xl font-bold">{escaneando === "ROSTRO" ? "Mirando tu rostro…" : "Leyendo tu huella…"}</p>
          </div>
        ) : modo === "elegir" ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-center text-xl font-bold">Confirma que eres tú</h2>
            <p className="text-center text-tenue">{asistida ? "Pon tu dedo o mira la cámara." : "Usa tu huella, tu rostro o tu clave."}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEscaneando("HUELLA")}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-marca bg-marca-claro px-3 py-5 text-lg font-bold text-marca ${asistida ? "guia-toca" : ""}`}
              >
                <IconoHuella />
                Huella
              </button>
              <button
                type="button"
                onClick={() => setEscaneando("ROSTRO")}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-marca bg-marca-claro px-3 py-5 text-lg font-bold text-marca"
              >
                <IconoRostro />
                Rostro
              </button>
            </div>
            <Boton variante="secundario" onClick={() => setModo("clave")}>
              Usar mi clave
            </Boton>
            <Boton variante="fantasma" onClick={onCancelar}>
              Cancelar
            </Boton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-center text-xl font-bold">Escribe tu clave de 6 números</h2>
            <div className="flex justify-center gap-3" aria-label={`${clave.length} de 6 números`}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`h-5 w-5 rounded-full border-2 border-marca ${i < clave.length ? "bg-marca" : ""}`} />
              ))}
            </div>
            <p className="text-center text-sm text-tenue">Caja Piura nunca te pedirá tu clave por llamada ni mensaje.</p>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} type="button" onClick={() => tecla(d)} className="rounded-xl bg-fondo py-4 text-2xl font-bold active:bg-marca-claro">
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => setModo("elegir")} className="rounded-xl py-4 text-base font-bold text-marca">
                Atrás
              </button>
              <button type="button" onClick={() => tecla("0")} className="rounded-xl bg-fondo py-4 text-2xl font-bold active:bg-marca-claro">
                0
              </button>
              <button
                type="button"
                onClick={() => setClave((c) => c.slice(0, -1))}
                aria-label="Borrar"
                className="rounded-xl py-4 text-2xl font-bold text-marca"
              >
                ⌫
              </button>
            </div>
            <Boton variante="fantasma" onClick={onCancelar}>
              Cancelar
            </Boton>
          </div>
        )}
      </div>
    </div>
  );
}
