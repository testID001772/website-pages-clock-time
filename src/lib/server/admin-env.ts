import { env } from "../env.server.ts";

/**
 * Owner bootstrap list. Comma-separated emails from `ADMIN_EMAILS`,
 * lowercased and trimmed. Anyone on this list is (re-)granted the owner
 * role on every profile load — the env is the source of truth, so a listed
 * address keeps full admin even if it registers late or gets demoted in
 * the UI. This is the deterministic path to first-owner on deploys where
 * "first account wins" can't be relied on.
 */
export function adminEmails(): string[] {
  const raw = env("ADMIN_EMAILS");
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the address is pinned as an owner via `ADMIN_EMAILS`. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
