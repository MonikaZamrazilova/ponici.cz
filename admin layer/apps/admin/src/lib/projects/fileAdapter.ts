import {
  projectConfig,
  type MediaStorePort,
  type ProjectAdapter,
  type ProjectConfig,
  type ProjectFeatures,
  type ProjectMediaCapability,
  type ProjectModules,
} from "@admin/core";
import { githubManifestSource } from "../adapters/githubManifestSource";
import { deployHook } from "../adapters/deployHook";
import { githubOverrideStore } from "../storage/githubOverrideStore";
import { blobMediaStore } from "../storage/mediaStore";
import { githubContentRoot } from "../storage/githubJson";

/**
 * Data adapter projektu (A6.1) — 100% Vercel-native, žádný filesystem.
 *
 * Projekt = cesta v repozitáři <contentRoot>/<id>/ s kontraktem a daty:
 *   manifest.json, store/{drafts,published}.json (GitHub Contents API)
 *   media → Vercel Blob (BLOB_READ_WRITE_TOKEN)
 *
 * Konfigurace je kompletně v ProjectConfig (moduly, feature flagy,
 * media provider, capability) — adapter je čistá funkce nad ní.
 */

const DEFAULT_MEDIA_CAPS: Omit<ProjectMediaCapability, "enabled"> = {
  maxSizeMb: 20,
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
  ],
};

function buildMediaStore(cfg: ProjectConfig): {
  capability: ProjectMediaCapability;
  store: MediaStorePort | undefined;
} {
  const capability: ProjectMediaCapability =
    cfg.media.provider === "filesystem"
      ? {
          enabled: true,
          maxSizeMb: cfg.media.maxSizeMb ?? DEFAULT_MEDIA_CAPS.maxSizeMb,
          allowedMimeTypes: cfg.media.allowedMimeTypes ?? DEFAULT_MEDIA_CAPS.allowedMimeTypes,
        }
      : { enabled: false, maxSizeMb: 0, allowedMimeTypes: [] };

  const store: MediaStorePort | undefined = capability.enabled ? blobMediaStore() : undefined;
  return { capability, store };
}

function buildFeatures(cfg: ProjectConfig): Required<ProjectFeatures> {
  return {
    preview: true,
    publishedVersion: true,
    richText: true,
    multiselect: true,
    ...cfg.features,
  };
}

/**
 * GitHub backend (Vercel/serverless). Soubory v repozitáři:
 * <contentRoot>/<id>/{manifest.json, store/{drafts,published}.json},
 * media → Vercel Blob.
 */
export function createGithubProjectAdapter(
  cfg: ProjectConfig,
  contentRoot: string,
): ProjectAdapter {
  const repoPath = `${contentRoot}/${cfg.identity.id}`;
  const { capability, store } = buildMediaStore(cfg);

  return {
    identity: cfg.identity,
    auth: { type: "none" },
    capabilities: {
      content: cfg.content,
      media: capability,
      publish: cfg.publish,
    },
    modules: cfg.modules,
    features: buildFeatures(cfg),
    manifest: githubManifestSource(`${repoPath}/manifest.json`),
    drafts: githubOverrideStore(`${repoPath}/store/drafts.json`),
    published: githubOverrideStore(`${repoPath}/store/published.json`),
    media: store,
    deploy: cfg.publish.hookUrl ? deployHook(cfg.publish.hookUrl) : undefined,
  };
}

/**
 * Vytvoří adapter — 100% cloud: GitHub content + Vercel Blob media.
 * Žádný filesystem fallback.
 */
export function createProjectAdapter(cfg: ProjectConfig): ProjectAdapter {
  return createGithubProjectAdapter(cfg, githubContentRoot());
}

export type { ProjectConfig, ProjectModules };
