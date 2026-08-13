import { z } from "zod";

/**
 * Konfigurace Admin Layeru — jediný zdroj pravdy pro env proměnné.
 * Validováno zod; nevalidní konfigurace selže brzy (fail-fast).
 */

const projectsListSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.split(",").map((s) => s.trim()).filter(Boolean) : val),
  z.array(z.string().min(1)).optional()
);

const hookUrlsSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === "") return {};
    try {
      return JSON.parse(String(val));
    } catch {
      return val; // nevalidní JSON → padne na record validaci níže
    }
  },
  z.record(z.string().min(1), z.string().url()).optional()
);

const numberSchema = z.preprocess((val) => (val === undefined || val === "" ? undefined : Number(val)), z.number().optional());

/** Core moduly Admin Layeru — zapnutí/vypnutí je konfigurační rozhodnutí. */
export const CORE_MODULES = ["dashboard", "content", "media", "audit", "settings"] as const;
export type CoreModule = (typeof CORE_MODULES)[number];

export const coreModulesSchema = z.preprocess(
  (val) =>
    typeof val === "string"
      ? (val.split(",").map((s) => s.trim()).filter(Boolean) as CoreModule[])
      : undefined,
  z.array(z.enum(CORE_MODULES)).optional()
);

const emailsListSchema = z.preprocess(
  (val) =>
    typeof val === "string"
      ? val
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : val,
  z.array(z.string().email()).optional()
);

export const adminEnvSchema = z.object({
  /** Heslo role admin (Owner/Admin) — bez žádného hesla je admin vypnutý. */
  ADMIN_PASSWORD: z.string().optional(),
  /** Volitelná hesla dalších rolí. */
  ADMIN_EDITOR_PASSWORD: z.string().optional(),
  ADMIN_VIEWER_PASSWORD: z.string().optional(),
  /** E-maily, které smějí žádat obnovu hesla (čárkami). Cíl reset kódu. */
  ADMIN_RESET_EMAILS: emailsListSchema,
  /** Formspree ID — odesílání kódu e-mailem (bez něj jen MOCK/dev log). */
  ADMIN_FORMSPREE_ID: z.string().optional(),
  /** URL webu pro „Vstup do edit web" (single-origin = /, jinak plná URL). */
  ADMIN_WEB_URL: z.string().optional(),
  /** TTL kódu pro obnovení hesla (ms; výchozí 15 minut). */
  ADMIN_RESET_CODE_TTL_MS: numberSchema,
  /** Maximální počet špatných pokusů o zadání kódu (výchozí 5). */
  ADMIN_RESET_MAX_ATTEMPTS: numberSchema,
  /** Zapnuté core moduly (čárkami). Výchozí: všechny. */
  ADMIN_MODULES: coreModulesSchema,
  /** TTL session v ms (výchozí 7 dní). */
  ADMIN_SESSION_TTL_MS: numberSchema,
  /** Aktivní projekty (čárkami). Prázdné = všechny registrované. */
  ADMIN_PROJECTS: projectsListSchema,
  /** Kořen adresáře s daty projektů: <root>/<projectId>/... */
  ADMIN_PROJECTS_ROOT: z.string().optional(),
  /** Volitelné deploy webhooky per projekt: {"<id>": "https://…"} */
  ADMIN_PROJECT_HOOK_URLS: hookUrlsSchema,
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

export function loadAdminEnv(env: NodeJS.ProcessEnv = process.env): AdminEnv {
  const parsed = adminEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Neplatná konfigurace adminu: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }
  return parsed.data;
}
