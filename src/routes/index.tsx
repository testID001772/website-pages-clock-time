import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/home-view";
import { listNews } from "@/lib/server/news";

/**
 * The news feed is loaded with the route so the server renders the teaser into
 * the first paint. `listNews` never throws — an unreachable database just means
 * no teaser, never a broken home page.
 */
export const Route = createFileRoute("/")({
  loader: () => listNews(),
  component: Home,
});

function Home() {
  return <HomeView news={Route.useLoaderData()} />;
}
