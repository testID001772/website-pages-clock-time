import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  DEFAULT_NEWS_TAG,
  isNewsTag,
  NEWS_LIMITS,
  NEWS_TAGS,
  sortNews,
  type NewsPost,
} from "@/lib/news";
import { requireStaffProfile } from "./profiles";

/**
 * News server functions.
 *
 * `listNews` is the only public one and never throws: a feed that cannot be
 * read (database down, migrations not applied yet) renders as an empty feed
 * rather than a 500 on the home page. Everything else is staff-only, reusing
 * the same `authMiddleware` + role check the member admin uses.
 */

type NewsRow = {
  id: string;
  title: string;
  summary: string;
  body: string;
  tag: string;
  pinned: boolean;
  published: boolean;
  author_id: string | null;
  author_name: string;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * `timestamptz` arrives as a `Date` from both drivers (and as a string from a
 * plain-text column on some setups). Normalize to an ISO string so the value
 * survives JSON serialization to the client unchanged.
 */
function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function asPost(row: NewsRow): NewsPost {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    tag: isNewsTag(row.tag) ? row.tag : DEFAULT_NEWS_TAG,
    pinned: Boolean(row.pinned),
    published: Boolean(row.published),
    authorId: row.author_id,
    authorName: row.author_name ?? "",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Published posts, pinned first then newest first. Never throws. */
export const listNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsPost[]> => {
    try {
      const sql = await getSql();
      const rows = await sql<NewsRow>`
        select id, title, summary, body, tag, pinned, published, author_id,
               author_name, created_at, updated_at
        from news_posts
        where published = true
        order by pinned desc, created_at desc, id asc
        limit ${NEWS_LIMITS.feed}
      `;
      // The SQL already orders the feed; re-applying the shared sort keeps the
      // client order identical even if a future backend drops ORDER BY, and
      // makes that invariant testable without a database.
      return sortNews(rows.map(asPost));
    } catch {
      return [];
    }
  },
);

/** Every post, drafts included — staff only, most recently edited first. */
export const listAllNews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NewsPost[]> => {
    await requireStaffProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<NewsRow>`
      select id, title, summary, body, tag, pinned, published, author_id,
             author_name, created_at, updated_at
      from news_posts
      order by updated_at desc, created_at desc, id asc
      limit ${NEWS_LIMITS.feed}
    `;
    return rows.map(asPost);
  });

const draftSchema = z.object({
  /** `null`/absent for a new post, the existing id when editing. */
  id: z.string().min(1).max(64).nullish(),
  title: z.string().trim().min(NEWS_LIMITS.titleMin).max(NEWS_LIMITS.title),
  summary: z.string().trim().max(NEWS_LIMITS.summary),
  body: z.string().trim().max(NEWS_LIMITS.body),
  tag: z.enum(NEWS_TAGS),
  pinned: z.boolean(),
  published: z.boolean(),
});

async function loadAll(): Promise<NewsPost[]> {
  const sql = await getSql();
  const rows = await sql<NewsRow>`
    select id, title, summary, body, tag, pinned, published, author_id,
           author_name, created_at, updated_at
    from news_posts
    order by updated_at desc, created_at desc, id asc
    limit ${NEWS_LIMITS.feed}
  `;
  return rows.map(asPost);
}

/**
 * Create or update a post, then return the refreshed admin list (same shape as
 * `setMemberRole`) so the composer never has to refetch by hand.
 */
export const saveNewsPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => draftSchema.parse(input))
  .handler(async ({ context, data }): Promise<NewsPost[]> => {
    const me = await requireStaffProfile(context.userId);
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<NewsRow>`
        update news_posts set
          title = ${data.title},
          summary = ${data.summary},
          body = ${data.body},
          tag = ${data.tag},
          pinned = ${data.pinned},
          published = ${data.published},
          updated_at = now()
        where id = ${data.id}
        returning id, title, summary, body, tag, pinned, published, author_id,
                  author_name, created_at, updated_at
      `;
      if (!rows[0]) throw new Error("NEWS_NOT_FOUND");
    } else {
      await sql`
        insert into news_posts
          (id, title, summary, body, tag, pinned, published, author_id, author_name)
        values (
          ${crypto.randomUUID()},
          ${data.title},
          ${data.summary},
          ${data.body},
          ${data.tag},
          ${data.pinned},
          ${data.published},
          ${me.userId},
          ${me.displayName}
        )
      `;
    }
    return loadAll();
  });

const deleteSchema = z.object({ id: z.string().min(1).max(64) });

export const deleteNewsPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ context, data }): Promise<NewsPost[]> => {
    await requireStaffProfile(context.userId);
    const sql = await getSql();
    await sql`delete from news_posts where id = ${data.id}`;
    return loadAll();
  });
