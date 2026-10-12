import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent, AppNotFoundComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    // No `basepath` here: the build derives it from Vite's `base` when the app is
    // mounted under a path (the GitHub Pages build) and leaves it empty otherwise.
    defaultErrorComponent: AppErrorComponent,
    // Styled 404 instead of the router's bare `<p>Not Found</p>`.
    defaultNotFoundComponent: AppNotFoundComponent,
  });
}
