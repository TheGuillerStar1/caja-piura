import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import DemoBar from "@/components/DemoBar";
import { VistaProvider } from "@/lib/vista";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson" });

export const metadata: Metadata = {
  title: "Caja Piura · Modo Acompaña",
  description: "Paga tu cuota y tus recibos desde el celular, con ayuda paso a paso.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0a4fa3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-vista="ESTANDAR" className={atkinson.variable}>
      <body className="min-h-dvh antialiased">
        <VistaProvider>
          {children}
          <DemoBar />
        </VistaProvider>
      </body>
    </html>
  );
}
