import path from "path";
import {
  projectConfig,
  type MediaStorePort,
  type ProjectAdapter,
  type ProjectConfig,
  type ProjectFeatures,
  type ProjectMediaCapability,
  type ProjectModules,
} from "@admin/core";
import { fileManifestSource } from "../adapters/manifestSource";
import { deployHook } from "../adapters/deployHook";
import { jsonOverrideStore } from "../storage/jsonOverrideStore";
import { mediaFsStore } from "../storage/mediaFsStore";

/**
 * Data adapter pro file-based projekt (A6.1).
 *
 * Projekt = adresář <root>/<id>/ s kontraktem a runtime daty:
 *   manifest.json, store/{drafts,published}.json, audit/audit.jsonl, media/
 *
 * Konfigurace je kompletně v ProjectConfig (moduly, feature flagy,
 * media provider, capability) — adapter je čistá funkce nad ní.
 * Pro jiné úložiště (HTTP, DB) implementujte stejný tvar ProjectAdapter.
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

export function createFileProjectAdapter(cfg: ProjectConfig, root: string): ProjectAdapter {
  const dir = path.join(root, cfg.identity.id);

  const mediaCapability: ProjectMediaCapability =
    cfg.media.provider === "filesystem"
      ? {
          enabled: true,
          maxSizeMb: cfg.media.maxSizeMb ?? DEFAULT_MEDIA_CAPS.maxSizeMb,
          allowedMimeTypes: cfg.media.allowedMimeTypes ?? DEFAULT_MEDIA_CAPS.allowedMimeTypes,
        }
      : { enabled: false, maxSizeMb: 0, allowedMimeTypes: [] };

  const mediaStore: MediaStorePort | undefined =
    mediaCapability.enabled ? mediaFsStore(path.join(dir, "media")) : undefined;

  const features: Required<ProjectFeatures> = {
    preview: true,
    publishedVersion: true,
    richText: true,
    multiselect: true,
    ...cfg.features,
  };

  return {
    identity: cfg.identity,
    auth: { type: "none" },
    capabilities: {
      content: cfg.content,
      media: mediaCapability,
      publish: cfg.publish,
    },
    modules: cfg.modules,
    features,
    manifest: fileManifestSource(path.join(dir, "manifest.json")),
    drafts: jsonOverrideStore(path.join(dir, "store", "drafts.json")),
    published: jsonOverrideStore(path.join(dir, "store", "published.json")),
    media: mediaStore,
    deploy: cfg.publish.hookUrl ? deployHook(cfg.publish.hookUrl) : undefined,
  };
}

export type { ProjectConfig, ProjectModules };
