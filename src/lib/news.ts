import type { Dictionary } from "./i18n";

/**
 * News feed — shared vocabulary for the home teaser, the `/news` page and the
 * admin composer. Everything here is pure and importable from both the client
 * bundle and a server function; the SQL lives in `@/lib/server/news`.
 */

export const NEWS_TAGS = ["update", "release", "event", "note"] as const;
export type NewsTag = (typeof NEWS_TAGS)[number];

/** The tag a new post starts on. */
export const DEFAULT_NEWS_TAG: NewsTag = "update";

export type NewsPost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  tag: NewsTag;
  /** Pinned posts sort above the rest of the feed. */
  pinned: boolean;
  /** Drafts are visible to staff only. */
  published: boolean;
  authorId: string | null;
  /** Byline snapshot, `""` when unknown. */
  authorName: string;
  /** ISO timestamps — both drivers' `timestamptz` normalized before serializing. */
  createdAt: string;
  updatedAt: string;
};

/** Field limits, mirrored by the zod validator and the SQL check constraints. */
export const NEWS_LIMITS = {
  /** Minimum characters in a title. */
  titleMin: 3,
  title: 120,
  summary: 240,
  body: 4000,
  /** How many posts a feed request returns. */
  feed: 30,
} as const;

export function isNewsTag(value: unknown): value is NewsTag {
  return typeof value === "string" && (NEWS_TAGS as readonly string[]).includes(value);
}

/** Tag label from the active dictionary (`t.news.tags[tag]`). */
export function newsTagLabel(tag: NewsTag, t: Dictionary): string {
  return t.news.tags[tag];
}

/**
 * Feed order: pinned first, then newest first, ties broken by id so the order
 * is stable across the two SQL backends. Returns a copy — never mutates input.
 */
export function sortNews<T extends { pinned: boolean; createdAt: string; id: string }>(
  posts: readonly T[],
): T[] {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (Number.isFinite(delta) && delta !== 0) return delta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Single-paragraph teaser: collapse whitespace and cut on a word boundary.
 * Used when a post has no summary of its own.
 */
export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The line a feed card shows under the title. */
export function newsLead(post: Pick<NewsPost, "summary" | "body">): string {
  const summary = post.summary.trim();
  return summary || excerpt(post.body, NEWS_LIMITS.summary);
}

/**
 * A post's date in the reader's locale. Formatting is presentation only, so an
 * unparseable timestamp or locale degrades to the raw `YYYY-MM-DD` (never a
 * thrown render).
 */
export function formatNewsDate(iso: string, locale: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(at);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Full date + time, used on the news page footer of a card. */
export function formatNewsDateTime(iso: string, locale: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(at);
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}
