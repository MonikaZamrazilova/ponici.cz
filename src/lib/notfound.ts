import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Server-only značka 404 — nastaví HTTP status odpovědi.
 * (Splat routa /$ je normální routa; status se nastaví přes server fn.)
 */
export const markNotFound = createServerFn().handler(async () => {
  setResponseStatus(404);
  return null;
});
