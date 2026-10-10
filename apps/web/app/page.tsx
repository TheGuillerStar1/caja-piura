"use client";
// Dueño: Agente A (pantalla principal con la mascota). PROVISIONAL (F0): prueba de conexión con la API.
import { useEffect, useState } from "react";
import { Boton, Mascota, Pantalla, Tarjeta } from "@/components/ui";
import { api } from "@/lib/api";

type Health = { ok: boolean; db: boolean; groq: boolean; r2: boolean };

export default function Principal() {
  const [h, setH] = useState<Health | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Health>("/health").then(setH).catch((e) => setError(e.message));
  }, []);
  return (
    <Pantalla>
      <Mascota animada mensaje="Hola, soy Pía. Toca aquí para ingresar." />
      <Tarjeta>
        <p className="font-bold">Estado del sistema</p>
        {error && <p className="text-error">{error}</p>}
        {h && (
          <ul>
            <li>API: {h.ok ? "✔" : "✘"}</li>
            <li>MySQL: {h.db ? "✔" : "✘"}</li>
            <li>Groq: {h.groq ? "✔" : "✘"}</li>
            <li>R2: {h.r2 ? "✔" : "✘"}</li>
          </ul>
        )}
      </Tarjeta>
      <Boton guia>Ingresar</Boton>
    </Pantalla>
  );
}
