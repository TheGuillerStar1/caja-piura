// Logo oficial de Caja Piura (archivo entregado, blanco sobre azul #00549F). No se redibuja.
// "bloque": el PNG tal cual. "blanco": el mismo trazo blanco sin el fondo azul (fondo quitado del PNG original),
// como aparece sobre el lila de la pantalla de acceso.
export function LogoCajaPiura({ variante = "bloque", className = "h-12" }: { variante?: "bloque" | "blanco"; className?: string }) {
  const [src, w, h] = variante === "bloque" ? ["/logo-caja-piura.png", 423, 199] : ["/logo-caja-piura-blanco.png", 384, 153];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Caja Piura" width={w} height={h} className={`w-auto ${className}`} />;
}
