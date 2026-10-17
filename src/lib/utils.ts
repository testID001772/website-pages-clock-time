import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string | null | undefined): { r: number; g: number; b: number } {
  // Settings may be partial in an old cached desktop build; never let a missing
  // color crash the whole app during its first render.
  const raw = (typeof hex === "string" && hex.trim() ? hex : "#ffffff")
    .replace("#", "")
    .trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 255, g: 255, b: 255 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
