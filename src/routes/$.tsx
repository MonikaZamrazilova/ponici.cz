import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/not-found-page";

/**
 * Splat route — vše, co neexistuje, dostane custom 404.
 * notFound() → HTTP status 404 + root notFoundComponent;
 * metadata (title/noindex) renderuje NotFoundPage (React 19 hoisting).
 */
export const Route = createFileRoute("/$")({
  component: NotFoundPage,
  loader: () => {
    throw notFound();
  },
});
