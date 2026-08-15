import type { ContentManifest } from "./manifest";
import type {
  AuditStorePort,
  DeployHookPort,
  ManifestSourcePort,
  MediaStorePort,
  OverrideStorePort,
} from "./ports";

/**
 * Integration contract mezi Admin Layerem a hostitelským webem (A0.2).
 *
 * Každý připojený projekt je popsán jedním `ProjectAdapter`:
 * identita, auth strategie, explicitní capabilities a konkrétní porty
 * (data adapter). Admin UI a služby pracují výhradně přes tento
 * kontrakt — nikdy přes `if (project === ...)`.
 *
 * Připojení nového webu = implementace/konfigurace adapteru
 * (viz apps/admin/src/lib/projects/*), ne přepis adminu.
 */

export interface ProjectIdentity {
  /** stabilní id — klíč v URL i v paths */
  id: string;
  name: string;
  description?: string;
  repo?: string;
  homepage?: string;
}

/** Jak se admin připojuje k datům projektu (auth mezi vrstvami, ne user login). */
export interface ProjectAuth {
  type: "none" | "shared-secret";
  /** hlavička, ve které adapter posílá secret (HTTP adaptéry) */
  header?: string;
  /** secret nikdy nesmí na klienta */
  secret?: string;
}

/* ─────────────── explicitní capabilities ─────────────── */

export interface ProjectContentCapability {
  create: boolean;
  edit: boolean;
  publish: boolean;
  discard: boolean;
  /** tvrdé smazání položek vytvořených v adminu (base položky nelze smazat) */
  delete: boolean;
}

export interface ProjectMediaCapability {
  enabled: boolean;
  maxSizeMb: number;
  allowedMimeTypes: string[];
}

export type ProjectPublishModel = "overrides" | "webhook" | "none";

export interface ProjectPublishCapability {
  /** jak se publikovaný obsah dostane k webu */
  model: ProjectPublishModel;
  /** volitelný webhook volaný po publishi */
  hookUrl?: string;
}

export interface ProjectCapabilities {
  content: ProjectContentCapability;
  media: ProjectMediaCapability;
  publish: ProjectPublishCapability;
}

/* ─────────────── adapter ─────────────── */

/* ─────────────── moduly, feature flags, providers (A6.1) ─────────────── */

/** Projekt-scoped moduly — zapnutí/vypnutí je konfigurační rozhodnutí. */
export type ProjectModule = "content" | "media" | "audit";
export type ProjectModules = Record<ProjectModule, boolean>;

/** Feature flagy projektu (UI chování; bezpečnost řeší oprávnění/capability). */
export interface ProjectFeatures {
  /** tab "Náhled" v editoru */
  preview?: boolean;
  /** tab "Publikovaná verze" v editoru */
  publishedVersion?: boolean;
  /** povolit rich text editor (jinak textarea) */
  richText?: boolean;
  /** povolit multi-select (jinak čárkami oddělený text) */
  multiselect?: boolean;
}

/** Media provider projektu. */
export interface ProjectMediaConfig {
  provider: "filesystem" | "none";
  maxSizeMb?: number;
  allowedMimeTypes?: string[];
}

/** Kompletní project-specific konfigurace (jeden zdroj pro adapter). */
export interface ProjectConfig {
  identity: ProjectIdentity;
  modules: ProjectModules;
  features: ProjectFeatures;
  media: ProjectMediaConfig;
  content: ProjectContentCapability;
  publish: ProjectPublishCapability;
}

/** Vytvoří ProjectConfig s rozumnými defaulty (vše zapnuto). */
export function projectConfig(
  partial: Omit<ProjectConfig, "modules" | "features"> & {
    modules?: Partial<ProjectModules>;
    features?: ProjectFeatures;
  },
): ProjectConfig {
  return {
    ...partial,
    modules: mergeWithDefaults<ProjectModules>(
      { content: true, media: true, audit: true },
      partial.modules,
    ),
    features: mergeWithDefaults<Required<ProjectFeatures>>(
      { preview: true, publishedVersion: true, richText: true, multiselect: true },
      partial.features,
    ),
  };
}

function mergeWithDefaults<T extends Record<string, boolean>>(
  defaults: T,
  overrides?: Partial<T>,
): T {
  const out = { ...defaults } as Record<string, boolean>;
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) out[key] = value;
    }
  }
  return out as T;
}

export interface ProjectAdapter {
  identity: ProjectIdentity;
  auth: ProjectAuth;
  capabilities: ProjectCapabilities;
  /** zapnuté moduly projektu (konfigurace, ne kód) */
  modules: ProjectModules;
  /** feature flagy projektu */
  features: Required<ProjectFeatures>;

  /** kontrakt: schémata + base data (dnes soubor, zítra HTTP) */
  manifest: ManifestSourcePort;
  /** data adapter: drafty / publikované overrides */
  drafts: OverrideStorePort;
  published: OverrideStorePort;
  media?: MediaStorePort;
  deploy?: DeployHookPort;
}

/** Hotový kontext projektu (adapter + načtený kontrakt) pro služby. */
export interface ProjectContext {
  adapter: ProjectAdapter;
  manifest: ContentManifest;
}
