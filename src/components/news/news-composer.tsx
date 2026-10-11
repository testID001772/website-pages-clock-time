import { useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import {
  DEFAULT_NEWS_TAG,
  formatNewsDate,
  newsTagLabel,
  NEWS_LIMITS,
  NEWS_TAGS,
  type NewsPost,
  type NewsTag,
} from "@/lib/news";
import { deleteNewsPost, saveNewsPost } from "@/lib/server/news";

/**
 * Staff composer for the news feed, mounted on `/admin`.
 *
 * Owns its own form state and calls `saveNewsPost` / `deleteNewsPost`, both of
 * which answer with the refreshed post list — so the list below the form is
 * always the server's view of the feed, drafts included.
 */

type Draft = {
  /** `null` while composing a new post, the post id while editing one. */
  id: string | null;
  title: string;
  summary: string;
  body: string;
  tag: NewsTag;
  pinned: boolean;
  published: boolean;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  title: "",
  summary: "",
  body: "",
  tag: DEFAULT_NEWS_TAG,
  pinned: false,
  published: true,
};

export function NewsComposer({
  posts,
  onChange,
}: {
  posts: NewsPost[];
  onChange: (posts: NewsPost[]) => void;
}) {
  const { t, locale } = useLocale();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (next: Partial<Draft>) => setDraft((was) => ({ ...was, ...next }));

  function startEdit(post: NewsPost) {
    setStatus(null);
    setError(null);
    setDraft({
      id: post.id,
      title: post.title,
      summary: post.summary,
      body: post.body,
      tag: post.tag,
      pinned: post.pinned,
      published: post.published,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    if (draft.title.trim().length < NEWS_LIMITS.titleMin) {
      setError(t.news.composer.titleError);
      return;
    }
    setBusy(true);
    try {
      const next = await saveNewsPost({
        data: {
          id: draft.id ?? null,
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          body: draft.body.trim(),
          tag: draft.tag,
          pinned: draft.pinned,
          published: draft.published,
        },
      });
      onChange(next);
      setDraft(EMPTY_DRAFT);
      setStatus(t.news.composer.saved);
    } catch {
      setError(t.news.composer.saveError);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(post: NewsPost) {
    setStatus(null);
    setError(null);
    try {
      const next = await deleteNewsPost({ data: { id: post.id } });
      onChange(next);
      if (draft.id === post.id) setDraft(EMPTY_DRAFT);
      setStatus(t.news.composer.deleted);
    } catch {
      setError(t.news.composer.deleteError);
    }
  }

  return (
    <>
      <h2 className="text-lg font-medium">{t.news.composer.title}</h2>
      <p className="mt-1 text-sm text-muted">{t.news.composer.blurb}</p>

      <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <p className="field-label">
          {draft.id ? t.news.composer.editHeading : t.news.composer.heading}
        </p>

        <label className="field">
          <span>{t.news.composer.postTitle}</span>
          <input
            value={draft.title}
            maxLength={NEWS_LIMITS.title}
            placeholder={t.news.composer.titlePlaceholder}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>

        <label className="field">
          <span>{t.news.composer.summary}</span>
          <input
            value={draft.summary}
            maxLength={NEWS_LIMITS.summary}
            placeholder={t.news.composer.summaryPlaceholder}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </label>

        <label className="field">
          <span>{t.news.composer.body}</span>
          <textarea
            value={draft.body}
            rows={6}
            maxLength={NEWS_LIMITS.body}
            placeholder={t.news.composer.bodyPlaceholder}
            onChange={(e) => patch({ body: e.target.value })}
          />
        </label>

        <label className="field">
          <span>{t.news.composer.tag}</span>
          <select value={draft.tag} onChange={(e) => patch({ tag: e.target.value as NewsTag })}>
            {NEWS_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {newsTagLabel(tag, t)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => patch({ published: e.target.checked })}
            />
            {t.news.composer.publish}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => patch({ pinned: e.target.checked })}
            />
            {t.news.composer.pin}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t.news.composer.saving : t.news.composer.save}
          </button>
          {draft.id ? (
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(EMPTY_DRAFT)}>
              {t.news.composer.cancel}
            </button>
          ) : null}
          {status ? <span className="text-xs text-muted">{status}</span> : null}
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t.news.composer.empty}</p>
      ) : (
        <ul className="mt-8 space-y-2 p-0">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/6 px-4 py-3"
            >
              <span className={`chip chip-${post.tag}`}>{newsTagLabel(post.tag, t)}</span>
              {post.published ? null : <span className="chip chip-draft">{t.news.draft}</span>}
              {post.pinned ? <span className="chip">{t.news.pinned}</span> : null}
              <span className="min-w-0 flex-1 truncate text-sm">{post.title}</span>
              <time className="text-xs text-muted" dateTime={post.createdAt}>
                {formatNewsDate(post.createdAt, locale)}
              </time>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => startEdit(post)}
                disabled={busy}
              >
                {t.news.composer.edit}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void onDelete(post)}
                disabled={busy}
              >
                {t.news.composer.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
