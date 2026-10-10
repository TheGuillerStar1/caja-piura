"use client";
// Dueño: Agente C. Comprime la foto en el celular antes de subirla: máx. 1000 px de lado, JPEG calidad 0.7.
// En gama baja una foto de 4 MB pasa a ~150 KB: sube rápido con datos móviles.

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagen"));
    };
    img.src = url;
  });
}

export async function comprimirFoto(file: File, maxLado = 1000, calidad = 0.7): Promise<Blob> {
  const img = await cargarImagen(file);
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", calidad));
  canvas.width = canvas.height = 0; // libera memoria en equipos de gama baja
  return blob ?? file;
}
