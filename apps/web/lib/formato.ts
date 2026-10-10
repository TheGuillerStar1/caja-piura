// F0. Formatos de presentación.
export const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "UTC" });

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
