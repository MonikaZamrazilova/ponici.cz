import "server-only";
import { CORE_MODULES, loadAdminEnv, SESSION_TTL_MS, type CoreModule } from "@admin/core";

/**
 * Core konfigurace Admin Layeru (A6.1) — env-driven, admin-owned.
 * Projekt-specific konfigurace žije v registry.ts (ProjectConfig).
 *
 * Žádné filesystem cesty — storage je 100% cloud:
 * GitHub (obsah, audit) + Vercel Blob (media) + env (auth).
 */

const env = loadAdminEnv();

const enabledModules = new Set<CoreModule>(env.ADMIN_MODULES ?? CORE_MODULES);
export const coreModules: Record<CoreModule, boolean> = Object.fromEntries(
  CORE_MODULES.map((module) => [module, enabledModules.has(module)]),
) as Record<CoreModule, boolean>;

export const adminConfig = {
  /** hesla rolí — podle shody se určí role session */
  passwords: {
    admin: env.ADMIN_PASSWORD,
    editor: env.ADMIN_EDITOR_PASSWORD,
    viewer: env.ADMIN_VIEWER_PASSWORD,
  },
  sessionTtlMs: env.ADMIN_SESSION_TTL_MS ?? SESSION_TTL_MS,
  activeProjectIds: env.ADMIN_PROJECTS ?? [],
  hookUrls: env.ADMIN_PROJECT_HOOK_URLS ?? {},
  /** URL webu pro „Vstup do edit web" (single-origin = /, jinak plná URL) */
  webUrl: env.ADMIN_WEB_URL ?? "/",
} as const;
