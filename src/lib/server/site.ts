import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { BACKGROUND_HARD_MAX_CHARS } from "@/lib/background";
import { getSql } from "@/lib/db";
import { DEFAULT_SETTINGS, type Role, type SiteSettings } from "@/lib/types";

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function asBool(v: unknown): boolean {
  if (v === true || v === "t" || v === "true" || v === 1 || v === "1") return true;
  return false;
}

/**
 * The `site_settings` row we read. `background_enabled` is the one column an
 * older database may not have yet, so an absent value counts as "on" — the
 * column default, and the behaviour before the column existed.
 */
type SettingsRow = {
  background_url: string | null;
  background_enabled?: unknown;
  background_blur: number;
  glass_blur: number;
  glass_opacity: number;
  glass_color: string;
  glass_auto: unknown;
};

/** Uploaded images are data URLs; the shipped image is a site-relative path. */
const IMAGE_URL = /^(data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+|\/[A-Za-z0-9._~\-/]+)$/i;

function asSettings(row: SettingsRow | undefined): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    backgroundUrl: row.background_url,
    // Absent (pre-0007 row) means on.
    backgroundEnabled:
      row.background_enabled === undefined ? true : asBool(row.background_enabled),
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
    const rows =
      await sql<SettingsRow>`select background_url, background_enabled, background_blur, glass_blur, glass_opacity, glass_color, glass_auto from site_settings where id = 1`;
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
  // `null` means "use the shipped image".
  backgroundUrl: z.string().nullable(),
  backgroundEnabled: z.boolean(),
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
    if (data.backgroundUrl) {
      // Bounded so the URL can be inlined into the SSR HTML of every page.
      if (data.backgroundUrl.length > BACKGROUND_HARD_MAX_CHARS) {
        throw new Error("BACKGROUND_TOO_LARGE");
      }
      // Defence in depth: only an uploaded image or a site-relative path may
      // reach the CSS `url()` this value ends up in.
      if (!IMAGE_URL.test(data.backgroundUrl)) throw new Error("BACKGROUND_INVALID");
    }
    const sql = await getSql();
    await sql`
      update site_settings set
        background_url = ${data.backgroundUrl},
        background_enabled = ${data.backgroundEnabled},
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
      backgroundEnabled: data.backgroundEnabled,
      backgroundBlur: data.backgroundBlur,
      glassBlur: data.glassBlur,
      glassOpacity: data.glassOpacity,
      glassColor: data.glassColor,
      glassAuto: data.glassAuto,
    } satisfies SiteSettings;
  });
