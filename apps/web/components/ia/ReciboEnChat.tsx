"use client";
// Recibo con foto DENTRO del chat de Pía: tomar foto, elegir de la galería o tocar un recibo de ejemplo.
// Pía lee solo el código y consulta el monto real a Caja Piura (nunca usa el monto de la foto).
import type { LeerReciboRes, ReciboRes } from "@cp/shared";
import { useEffect, useRef, useState } from "react";
import { comprimirFoto } from "@/components/ia/comprimir";
import { ApiFallo, api } from "@/lib/api";
import { track } from "@/lib/track";

type Demo = { key: string; url: string; empresa: string };
type Props = {
  alLeer: (r: ReciboRes) => void;
  alSinDeuda: () => void;
  alNoLeer: (motivo: string) => void;
};

export function ReciboEnChat({ alLeer, alSinDeuda, alNoLeer }: Props) {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Demo[]>("/recibos/demo").then(setDemos, () => {});
  }, []);

  async function leer(cuerpo: { demoKey: string } | FormData) {
    setLeyendo(true);
    track("leer-recibo", "ver", { flujo: "RECIBO" });
    try {
      const r = await api<LeerReciboRes>("/recibos/leer", cuerpo instanceof FormData ? { formData: cuerpo } : { cuerpo });
      if (!r.ok) return alNoLeer(r.motivo);
      try {
        alLeer(await api<ReciboRes>(`/recibos/${r.codigo}?servicioId=${r.servicioId}`));
      } catch (e) {
        if (e instanceof ApiFallo && e.codigo === "NO_HAY_DEUDA") return alSinDeuda();
        throw e;
      }
    } catch (e) {
      alNoLeer(e instanceof ApiFallo && e.codigo === "SIN_CONEXION" ? e.message : "No pude leer la foto ahora.");
    } finally {
      setLeyendo(false);
    }
  }

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let blob: Blob = file;
    try {
      blob = await comprimirFoto(file);
    } catch {}
    const fd = new FormData();
    fd.append("imagen", blob, file.name || "recibo.jpg");
    leer(fd);
  }

  if (leyendo) {
    return (
      <p role="status" className="ml-10 rounded-xl bg-superficie px-4 py-3 text-lg text-tenue">
        📷 Leyendo el código del recibo…
      </p>
    );
  }
  return (
    <div className="ml-10 flex flex-col gap-2">
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={alElegir} />
      <input ref={galeria} type="file" accept="image/*" hidden onChange={alElegir} />
      <button type="button" onClick={() => camara.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-marca text-lg font-bold text-white">
        📷 Tomar foto
      </button>
      <button type="button" onClick={() => galeria.current?.click()} className="min-h-12 rounded-xl border-2 border-marca bg-superficie font-bold text-marca">
        Elegir de mi galería
      </button>
      {demos.length > 0 && (
        <>
          <p className="mt-1 text-sm font-bold text-tenue">O toca un recibo de ejemplo (demo):</p>
          <div className="grid grid-cols-3 gap-2">
            {demos.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => leer({ demoKey: d.key })}
                className="flex flex-col items-center gap-1 rounded-lg border-2 border-linea bg-superficie p-1 text-sm font-bold"
              >
                <img src={d.url} alt={`Recibo de ejemplo de ${d.empresa}`} className="aspect-[3/4] w-full rounded object-cover object-top" />
                {d.empresa}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
