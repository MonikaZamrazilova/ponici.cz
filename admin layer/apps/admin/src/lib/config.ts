import "server-only";
import path from "path";
import { CORE_MODULES, loadAdminEnv, SESSION_TTL_MS, type CoreModule } from "@admin/core";

/**
 * Core konfigurace Admin Layeru (A6.1) — env-driven, admin-owned.
 * Projekt-specific konfigurace žije v registry.ts (ProjectConfig).
 */

const env = loadAdminEnv();

const enabledModules = new Set<CoreModule>(env.ADMIN_MODULES ?? CORE_MODULES);
export const coreModules: Record<CoreModule, boolean> = Object.fromEntries(
  CORE_MODULES.map((module) => [module, enabledModules.has(module)])
) as Record<CoreModule, boolean>;

export const adminConfig = {
  /** hesla rolí — podle shody se určí role session */
  passwords: {
    admin: env.ADMIN_PASSWORD,
    editor: env.ADMIN_EDITOR_PASSWORD,
    viewer: env.ADMIN_VIEWER_PASSWORD,
  },
  sessionTtlMs: env.ADMIN_SESSION_TTL_MS ?? SESSION_TTL_MS,
  /** kořen: <root>/<projectId>/manifest.json, store/, audit/, media/ */
  projectsRoot: path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects"),
  activeProjectIds: env.ADMIN_PROJECTS ?? [],
  hookUrls: env.ADMIN_PROJECT_HOOK_URLS ?? {},
  /** server-side session store (nikdy do gitu) */
  sessionsFile: path.join(
    path.dirname(path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects")),
    ".sessions",
    "sessions.jsonl"
  ),
  /** centrální audit log (git-trackovaný, append-only) */
  centralAuditFile: path.join(
    path.dirname(path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects")),
    "audit",
    "central.jsonl"
  ),
  /** e-maily, které smějí žádat obnovu hesla — cíl reset kódu (volitelné; bez nich je funkce vypnutá) */
  resetEmails: env.ADMIN_RESET_EMAILS ?? [],
  /** Formspree ID — odesílání kódu e-mailem (volitelné; bez něj jen MOCK/dev log) */
  formspreeId: env.ADMIN_FORMSPREE_ID,
  /** URL webu pro „Vstup do edit web" (single-origin = /, jinak plná URL) */
  webUrl: env.ADMIN_WEB_URL ?? "/",
  /** TTL a pokusy pro kód obnovy hesla */
  resetCodeTtlMs: env.ADMIN_RESET_CODE_TTL_MS ?? 15 * 60 * 1000,
  resetMaxAttempts: env.ADMIN_RESET_MAX_ATTEMPTS ?? 5,
  /** runtime secrets (gitignored): override hesla + kódy obnovy */
  secretsDir: path.join(
    path.dirname(path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects")),
    ".secrets"
  ),
  passwordsFile: path.join(
    path.dirname(path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects")),
    ".secrets",
    "passwords.json"
  ),
  resetCodesFile: path.join(
    path.dirname(path.resolve(env.ADMIN_PROJECTS_ROOT ?? "../../content/projects")),
    ".secrets",
    "reset-codes.json"
  ),
} as const;
