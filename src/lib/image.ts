import { clamp } from "./utils";

export async function compressImage(
  file: File,
  opts: { maxEdge: number; maxBytes: number; quality?: number },
): Promise<string> {
  const quality = opts.quality ?? 0.82;
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, opts.maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  let q = quality;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > opts.maxBytes && q > 0.4) {
    q -= 0.08;
    url = canvas.toDataURL("image/jpeg", q);
  }
  if (url.length > opts.maxBytes) {
    throw new Error("Image is still too large after compression. Try a smaller file.");
  }
  return url;
}

export async function sampleAverageColor(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#ffffff";
  ctx.drawImage(img, 0, 0, 24, 24);
  const { data } = ctx.getImageData(0, 0, 24, 24);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 20) continue;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
    n += 1;
  }
  if (!n) return "#c8c4e8";
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  // Lift very dark averages so glass stays readable.
  const lift = 90;
  if (r + g + b < 120) {
    r = clamp(r + lift, 0, 255);
    g = clamp(g + lift, 0, 255);
    b = clamp(b + lift, 0, 255);
  }
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(img, 0, 0);
    return canvas as unknown as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}
