import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent, AppNotFoundComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    // Styled 404 instead of the router's bare `<p>Not Found</p>`.
    defaultNotFoundComponent: AppNotFoundComponent,
  });
}
