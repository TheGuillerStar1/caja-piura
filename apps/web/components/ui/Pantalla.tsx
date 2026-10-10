// F0. Marco de cada pantalla: barra superior con "Volver" y título, contenido centrado a 28rem.
import Link from "next/link";

type Props = { titulo?: string; volver?: string; children: React.ReactNode; pie?: React.ReactNode };

export function Pantalla({ titulo, volver, children, pie }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {(titulo || volver) && (
        <header className="sticky top-0 z-20 flex items-center gap-2 bg-marca px-2 py-2 text-white">
          {volver ? (
            <Link href={volver} aria-label="Volver" className="flex w-12 items-center justify-center text-2xl">
              ←
            </Link>
          ) : (
            <span className="w-12" />
          )}
          <h1 className="flex-1 text-center text-lg font-bold">{titulo}</h1>
          <span className="w-12" />
        </header>
      )}
      <main className="flex flex-1 flex-col gap-4 px-4 py-5">{children}</main>
      {pie && <footer className="sticky bottom-0 bg-fondo/95 px-4 pb-5 pt-3">{pie}</footer>}
    </div>
  );
}
