import { Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { formatNewsDate, newsTagLabel, type NewsPost } from "@/lib/news";

/**
 * "Latest news" strip on the home page: the three newest posts as one-line
 * links into the feed. Renders nothing when there is no news to show, so an
 * empty or unreachable feed leaves the countdown untouched.
 */
export function NewsTeaser({ posts }: { posts: NewsPost[] }) {
  const { t, locale } = useLocale();
  const latest = posts.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section className="mt-10 w-full max-w-2xl text-start">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs tracking-[0.28em] text-muted uppercase">{t.news.latestTitle}</h2>
        <Link to="/news" className="text-xs text-muted no-underline hover:text-ink">
          {t.news.allNews} →
        </Link>
      </header>

      <ul className="mt-3 space-y-2 p-0">
        {latest.map((post) => (
          <li key={post.id} className="list-none">
            <Link
              to="/news"
              className="glass flex items-center gap-3 rounded-2xl px-4 py-3 no-underline transition-colors hover:bg-white/6"
            >
              <span className={`chip chip-${post.tag} shrink-0`}>{newsTagLabel(post.tag, t)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{post.title}</span>
              <time className="shrink-0 text-xs text-muted" dateTime={post.createdAt}>
                {formatNewsDate(post.createdAt, locale)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
