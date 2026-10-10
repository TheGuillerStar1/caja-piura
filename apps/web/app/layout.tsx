import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { AvisoSinConexion } from "@/components/ui/AvisoSinConexion";
import { DemoBarDiferida } from "@/components/ui/DemoBarDiferida";
import { VistaProvider } from "@/lib/vista";
import "./globals.css";

// Roboto: tipografía de la app oficial (Manual visual: Bold títulos, Medium subtítulos, Regular cuerpo).
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });

// Fija <html data-vista> desde localStorage ANTES de pintar: la vista asistida no "salta" desde la estándar al recargar,
// y VistaProvider (lib/vista.tsx) arranca ya con el valor correcto.
// Igual con el modo claro u oscuro (lib/tema.ts).
const SCRIPT_VISTA = `try{var d=document.documentElement,v=localStorage.getItem("cp_vista"),t=localStorage.getItem("cp_tema");if(v==="ASISTIDA"||v==="ESTANDAR")d.dataset.vista=v;if(t==="claro"||t==="oscuro")d.dataset.tema=t}catch(e){}`;

export const metadata: Metadata = {
  title: "Caja Piura",
  description: "Paga tu cuota y tus recibos desde el celular, con ayuda paso a paso.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0b4ed4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: SCRIPT_VISTA cambia data-vista antes de que React hidrate.
    <html lang="es" data-vista="ESTANDAR" data-tema="oscuro" className={roboto.variable} suppressHydrationWarning>
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
