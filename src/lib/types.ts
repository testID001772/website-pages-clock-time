import type { Dictionary } from "./i18n";

export const ROLES = ["member", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

export type Profile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: Role;
  email: string | null;
};

export type SiteSettings = {
  backgroundUrl: string | null;
  backgroundBlur: number;
  glassBlur: number;
  glassOpacity: number;
  glassColor: string;
  glassAuto: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  backgroundUrl: null,
  backgroundBlur: 0,
  glassBlur: 12,
  glassOpacity: 20,
  glassColor: "#ffffff",
  glassAuto: true,
};

export function isStaff(role: Role | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

export function serverErrorText(code: string, t: Dictionary): string | null {
  switch (code) {
    case "ADMIN_REQUIRED":
      return t.errors.adminRequired;
    case "OWNER_ONLY":
      return t.errors.ownerOnly;
    case "NO_SELF_DEMOTE":
      return t.errors.noSelfDemote;
    case "MEMBER_NOT_FOUND":
      return t.errors.memberNotFound;
    case "KEEP_OWNER":
      return t.errors.keepOwner;
    case "IMAGE_TOO_LARGE":
      return t.errors.imageTooLarge;
    case "BACKGROUND_TOO_LARGE":
      return t.errors.backgroundTooLarge;
    default:
      return null;
  }
}
