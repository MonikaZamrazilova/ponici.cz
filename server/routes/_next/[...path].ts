import { defineEventHandler } from "h3";

/**
 * Dev-only "unlocker" — viz admin/[...path].ts.
 * Propouští /_next/* (JS/CSS assety adminu) do nitro middleware (admin-proxy).
 */
export default defineEventHandler(() => undefined);
