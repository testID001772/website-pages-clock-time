import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { DEFAULT_SETTINGS, type Role, type SiteSettings } from "@/lib/types";

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function asBool(v: unknown): boolean {
  if (v === true || v === "t" || v === "true" || v === 1 || v === "1") return true;
  return false;
}

function asSettings(row:
  | {
      background_url: string | null;
      background_blur: number;
      glass_blur: number;
      glass_opacity: number;
      glass_color: string;
      glass_auto: unknown;
    }
  | undefined): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    backgroundUrl: row.background_url,
    backgroundBlur: Number(row.background_blur) || 0,
    glassBlur: Number(row.glass_blur) || 0,
    glassOpacity: Number(row.glass_opacity) || 0,
    glassColor: HEX.test(row.glass_color) ? row.glass_color : DEFAULT_SETTINGS.glassColor,
    glassAuto: asBool(row.glass_auto),
  };
}

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{
      background_url: string | null;
      background_blur: number;
      glass_blur: number;
      glass_opacity: number;
      glass_color: string;
      glass_auto: unknown;
    }>`select background_url, background_blur, glass_blur, glass_opacity, glass_color, glass_auto from site_settings where id = 1`;
    return asSettings(rows[0]);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

async function requireStaff(userId: string): Promise<Role> {
  const sql = await getSql();
  const rows = await sql<{ role: Role }>`select role from profiles where user_id = ${userId}`;
  const role = rows[0]?.role ?? "member";
  if (role !== "admin" && role !== "owner") {
    throw new Error("ADMIN_REQUIRED");
  }
  return role;
}

const updateSchema = z.object({
  backgroundUrl: z.string().nullable(),
  backgroundBlur: z.number().int().min(0).max(40),
  glassBlur: z.number().int().min(0).max(40),
  glassOpacity: z.number().int().min(0).max(40),
  glassColor: z.string().regex(HEX),
  glassAuto: z.boolean(),
});

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (data.backgroundUrl && data.backgroundUrl.length > 1_800_000) {
      throw new Error("BACKGROUND_TOO_LARGE");
    }
    const sql = await getSql();
    await sql`
      update site_settings set
        background_url = ${data.backgroundUrl},
        background_blur = ${data.backgroundBlur},
        glass_blur = ${data.glassBlur},
        glass_opacity = ${data.glassOpacity},
        glass_color = ${data.glassColor},
        glass_auto = ${data.glassAuto},
        updated_at = now()
      where id = 1
    `;
    return {
      backgroundUrl: data.backgroundUrl,
      backgroundBlur: data.backgroundBlur,
      glassBlur: data.glassBlur,
      glassOpacity: data.glassOpacity,
      glassColor: data.glassColor,
      glassAuto: data.glassAuto,
    } satisfies SiteSettings;
  });
