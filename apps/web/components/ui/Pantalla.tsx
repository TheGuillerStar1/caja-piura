// Marco de cada pantalla, como la app oficial: barra superior azul (☰ o ‹ + título), contenido sobre fondo oscuro
// y, en las cinco secciones principales, la barra inferior (pestana) con el botón de ayuda de Pía.
import { Cabecera } from "@/components/app/Cabecera";
import { BarraInferior, type Pestana } from "@/components/BarraInferior";
import { OmitirAyuda } from "./OmitirAyuda";

type Props = {
  titulo?: React.ReactNode;
  volver?: string;
  subtitulo?: React.ReactNode;
  pestana?: Pestana;
  sinPia?: boolean;
  /** Sin relleno lateral: listas de borde a borde (Pagos, Transferencias, Para ti). */
  plano?: boolean;
  children: React.ReactNode;
  pie?: React.ReactNode;
};

export function Pantalla({ titulo, volver, subtitulo, pestana, sinPia, plano, children, pie }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-fondo shadow-[0_0_48px_rgb(0_0_0/0.45)]">
      {(titulo || volver || pestana) && <Cabecera titulo={titulo} volver={volver} subtitulo={subtitulo} />}
      <main className={`flex flex-1 flex-col gap-4 ${plano ? "py-3" : "px-4 py-5"}`}>
        <OmitirAyuda />
        {children}
      </main>
      {pie && <footer className="sticky bottom-0 z-40 border-t border-linea bg-fondo px-4 pb-5 pt-3">{pie}</footer>}
      {pestana && <BarraInferior activa={pestana} sinPia={sinPia} />}
    </div>
  );
}
