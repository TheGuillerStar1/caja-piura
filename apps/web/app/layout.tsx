import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { AvisoSinConexion } from "@/components/ui/AvisoSinConexion";
import { DemoBarDiferida } from "@/components/ui/DemoBarDiferida";
import { VistaProvider } from "@/lib/vista";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

// Fija <html data-vista> desde localStorage ANTES de pintar: la vista asistida no "salta" desde la estándar al recargar,
// y VistaProvider (lib/vista.tsx) arranca ya con el valor correcto.
const SCRIPT_VISTA = `try{var v=localStorage.getItem("cp_vista");if(v==="ASISTIDA"||v==="ESTANDAR")document.documentElement.dataset.vista=v}catch(e){}`;

export const metadata: Metadata = {
  title: "Caja Piura · Modo Acompaña",
  description: "Paga tu cuota y tus recibos desde el celular, con ayuda paso a paso.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0a4fa3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: SCRIPT_VISTA cambia data-vista antes de que React hidrate.
    <html lang="es" data-vista="ESTANDAR" className={atkinson.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_VISTA }} />
      </head>
      <body className="min-h-dvh antialiased">
        <VistaProvider>
          {children}
          <AvisoSinConexion />
          {/* La barra de demo se descarga aparte, después de la pantalla (no pesa en la primera carga). */}
          <DemoBarDiferida />
        </VistaProvider>
      </body>
    </html>
  );
}
