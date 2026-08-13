import { defineEventHandler } from "h3";

/**
 * Dev-only "unlocker" — viz admin/[...path].ts.
 * Propouští /login a /login/* do nitro middleware (admin-proxy).
 */
export default defineEventHandler(() => undefined);
