"use client";
// F3 (Agente F). Carga la barra de demo aparte (React.lazy, sin el cargador de next/dynamic) para que su código
// no pese en la primera carga de cada pantalla. En las rutas donde la barra no se muestra, ni siquiera se descarga.
import { usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";

const DemoBar = lazy(() => import("@/components/DemoBar"));

// Mismas rutas que OCULTA_EN de components/DemoBar.tsx (allí se vuelve a comprobar).
const SIN_BARRA = ["/", "/entrar"];

export function DemoBarDiferida() {
  const ruta = usePathname();
  // Solo en el navegador y después de pintar la pantalla.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado || SIN_BARRA.includes(ruta) || ruta.startsWith("/panel")) return null;
  return (
    <Suspense fallback={null}>
      <DemoBar />
    </Suspense>
  );
}
