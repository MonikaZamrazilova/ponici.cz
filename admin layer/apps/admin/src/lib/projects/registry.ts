import "server-only";
import { AdminError, projectConfig, type ProjectAdapter, type ProjectConfig } from "@admin/core";
import { adminConfig } from "../config";
import { createFileProjectAdapter } from "./fileAdapter";

/**
 * Registry projektů — project-specific konfigurace (A6.1).
 *
 * Připojení nového webu = jeden záznam ProjectConfig (moduly, feature
 * flagy, media provider, capability) — žádná editace komponent.
 * Core konfigurace (auth, moduly, cesty) žije v lib/config.ts (env).
 *
 * Zapnutí/vypnutí modulu = řádek v modules, ne úprava deseti komponent.
 */

const PROJECT_CONFIGS: Record<string, ProjectConfig> = {
  "demo-web": projectConfig({
    identity: {
      id: "demo-web",
      name: "Demo Web",
      description: "Ukázkový veřejný web — plná integrace (content, media, publish).",
      repo: "apps/demo-web",
    },
    modules: { content: true, media: true, audit: true },
    features: { preview: true, publishedVersion: true, richText: true, multiselect: true },
    media: { provider: "filesystem" },
    content: { create: true, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
  }),
  sandbox: projectConfig({
    identity: {
      id: "sandbox",
      name: "Sandbox",
      description: "Druhý projekt — moduly a feature flagy vypnuté (test configurability).",
    },
    // demonstruje konfigurační rozhodnutí: media a audit modul vypnuty,
    // rich text a multi-select nahrazeny jednoduchými poli, bez preview tabu
    modules: { content: true, media: false, audit: false },
    features: { preview: false, publishedVersion: false, richText: false, multiselect: false },
    media: { provider: "none" },
    content: { create: false, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
  }),
  /**
   * Ponycedecka.cz (A10.1) — první cílová integrace.
   * Web nedodává žádný admin kód: exportuje kontrakt (manifest.json,
   * viz apps/demo-web/src/manifest/export-manifest.ts jako vzor), merguje
   * published.json a staví znovu po publishi (deploy hook). Schema níže je
   * prvotní kontrakt — finální podobu potvrdí export z webu.
   */
  ponycedecka: projectConfig({
    identity: {
      id: "ponycedecka",
      name: "Ponycedecka.cz",
      description: "Jezdecká farma — plná integrace přes kontrakt (content, media, publish).",
      repo: "(externí)",
      homepage: "https://ponycedecka.cz",
    },
    modules: { content: true, media: true, audit: true },
    features: { preview: true, publishedVersion: true, richText: true, multiselect: true },
    media: { provider: "filesystem" },
    content: { create: true, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
  }),
  /**
   * Ponici.cz — jezdecká škola (Císařský ostrov, Praha).
   * Web exportuje kontrakt (npm run manifest:export v ponici-a-cherished-journey),
   * merguje published.json (src/lib/repository.ts) a staví znovu po publishi
   * (volitelný deploy hook). Obsah: globální texty (site), jízdy (service),
   * ceník (price), FAQ (faq).
   */
  ponici: projectConfig({
    identity: {
      id: "ponici",
      name: "Ponici.cz",
      description: "Jezdecká škola pro děti i dospělé — plná integrace přes kontrakt (content, media, publish).",
      repo: "ponici-a-cherished-journey",
      homepage: "https://www.ponici.cz",
    },
    modules: { content: true, media: true, audit: true },
    features: { preview: true, publishedVersion: true, richText: true, multiselect: true },
    media: { provider: "filesystem" },
    content: { create: true, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
  }),
};

const cache = new Map<string, ProjectAdapter>();

function build(cfg: ProjectConfig): ProjectAdapter {
  const hookUrl = adminConfig.hookUrls[cfg.identity.id];
  const finalCfg: ProjectConfig = hookUrl
    ? { ...cfg, publish: { ...cfg.publish, hookUrl } }
    : cfg;
  return createFileProjectAdapter(finalCfg, adminConfig.projectsRoot);
}

export function listProjects(): ProjectAdapter[] {
  const ids =
    adminConfig.activeProjectIds.length > 0
      ? adminConfig.activeProjectIds
      : Object.keys(PROJECT_CONFIGS);
  return ids
    .map((id) => getProject(id))
    .filter((project): project is ProjectAdapter => project !== null);
}

export function getProject(id: string): ProjectAdapter | null {
  const cached = cache.get(id);
  if (cached) return cached;
  const cfg = PROJECT_CONFIGS[id];
  if (!cfg) return null;
  const adapter = build(cfg);
  cache.set(id, adapter);
  return adapter;
}

export function requireProject(id: string): ProjectAdapter {
  const adapter = getProject(id);
  if (!adapter) throw new AdminError(`Neznámý projekt: ${id}`, undefined, 404);
  return adapter;
}
