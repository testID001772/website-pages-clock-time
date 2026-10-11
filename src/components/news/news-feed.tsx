import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import {
  formatNewsDate,
  formatNewsDateTime,
  newsLead,
  newsTagLabel,
  type NewsPost,
} from "@/lib/news";

/**
 * One news post as a glass card. The body is collapsed behind "Read more" so a
 * long announcement cannot push the rest of the feed off screen.
 */
export function NewsCard({ post, defaultOpen = false }: { post: NewsPost; defaultOpen?: boolean }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const body = post.body.trim();
  const lead = newsLead(post);
  // A lead that is just the truncated body would be repeated by it — drop the
  // standfirst once the full text is visible.
  const showLead = lead.length > 0 && !(open && post.summary.trim() === "");

  return (
    <article className="glass rounded-[28px] p-5 sm:p-6">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`chip chip-${post.tag}`}>{newsTagLabel(post.tag, t)}</span>
        {post.pinned ? <span className="chip">{t.news.pinned}</span> : null}
        {post.published ? null : <span className="chip chip-draft">{t.news.draft}</span>}
        <time className="text-xs text-muted" dateTime={post.createdAt}>
          {t.news.postedOn(formatNewsDate(post.createdAt, locale))}
        </time>
      </header>

      <h3 className="mt-3 text-xl font-medium tracking-tight">{post.title}</h3>
      {showLead ? <p className="mt-2 text-sm text-muted">{lead}</p> : null}

      {body ? (
        <>
          {open ? (
            <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{body}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              aria-expanded={open}
              onClick={() => setOpen((was) => !was)}
            >
              {open ? t.news.readLess : t.news.readMore}
            </button>
            <span className="text-xs text-muted">
              {post.authorName ? t.news.by(post.authorName) : ""}
            </span>
          </div>
        </>
      ) : null}

      {open ? (
        <p className="mt-3 text-xs text-muted">
          <time dateTime={post.updatedAt}>{formatNewsDateTime(post.updatedAt, locale)}</time>
        </p>
      ) : null}
    </article>
  );
}

/** The full feed on `/news`: newest first, pinned on top, empty state included. */
export function NewsFeed({ posts }: { posts: NewsPost[] }) {
  const { t } = useLocale();

  if (posts.length === 0) {
    return (
      <p className="glass mt-6 rounded-[28px] p-6 text-sm text-muted">{t.news.empty}</p>
    );
  }

  return (
    <ul className="mt-6 space-y-4 p-0">
      {posts.map((post) => (
        <li key={post.id} className="list-none">
          <NewsCard post={post} />
        </li>
      ))}
    </ul>
  );
}
