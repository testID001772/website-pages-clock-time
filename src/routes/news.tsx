import { createFileRoute, Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { NewsFeed } from "@/components/news/news-feed";
import { SpaceStage } from "@/components/space/space-stage";
import { useLocale } from "@/lib/i18n";
import { listNews } from "@/lib/server/news";

/**
 * Public news feed — no sign-in gate, so a shared link opens for anyone.
 *
 * The feed is loaded by the route loader, which means the server renders the
 * posts into the first paint (and a crawler sees them); `listNews` never throws,
 * so an unreachable database degrades to the empty state instead of an error
 * page.
 */
export const Route = createFileRoute("/news")({
  loader: () => listNews(),
  head: () => ({
    meta: [
      { title: "News · Clock Time" },
      {
        name: "description",
        content: "Announcements, releases and updates from Clock Time.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { t } = useLocale();
  const posts = Route.useLoaderData();

  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-24">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">{t.news.title}</h1>
          <p className="mt-3 text-sm text-muted">{t.news.subtitle}</p>
        </header>

        <NewsFeed posts={posts} />

        <Link to="/" className="btn btn-ghost mt-8">
          {t.news.backHome}
        </Link>
      </main>
    </SpaceStage>
  );
}
