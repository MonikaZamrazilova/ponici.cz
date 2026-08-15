import "server-only";
import { AdminError, type MediaAsset, type ProjectAdapter } from "@admin/core";
import { appendAudit } from "./auditService";

/**
 * Application service — media knihovna (per projekt).
 * Capabilities projektu řídí povolené typy a velikost souborů.
 *
 * Každá mutace (upload/delete) zapisuje audit event (best-effort,
 * nikdy neblokuje hlavní akci) — konzistentně s itemService.
 */

function mediaPort(adapter: ProjectAdapter) {
  if (!adapter.media || !adapter.capabilities.media.enabled) {
    throw new AdminError("Media není pro tento projekt zapnuto (capability)", undefined, 403);
  }
  return adapter.media;
}

export async function listMedia(adapter: ProjectAdapter): Promise<MediaAsset[]> {
  return mediaPort(adapter).list();
}

export async function getMediaFile(
  adapter: ProjectAdapter,
  id: string,
): Promise<{ asset: MediaAsset; data: Uint8Array }> {
  const result = await mediaPort(adapter).get(id);
  if (!result) throw new AdminError("Soubor neexistuje", undefined, 404);
  return result;
}

export async function saveMedia(
  adapter: ProjectAdapter,
  file: { name: string; mime: string; data: Uint8Array },
): Promise<MediaAsset> {
  const port = mediaPort(adapter);
  const caps = adapter.capabilities.media;

  if (!file.data.length) throw new AdminError("Prázdný soubor");
  if (file.data.byteLength > caps.maxSizeMb * 1024 * 1024) {
    throw new AdminError(`Soubor je příliš velký (max ${caps.maxSizeMb} MB)`);
  }
  if (!caps.allowedMimeTypes.includes(file.mime)) {
    throw new AdminError(`Typ souboru není povolen (${file.mime})`);
  }
  const asset = await port.save(file);
  void appendAudit({
    projectId: adapter.identity.id,
    action: "create",
    entityKind: "media",
    entityId: asset.id,
    summary: `Media nahráno: ${asset.name}`,
    details: { filename: file.name, mime: file.mime, size: file.data.byteLength },
  }).catch(() => {});
  return asset;
}

export async function removeMedia(adapter: ProjectAdapter, id: string): Promise<boolean> {
  const port = mediaPort(adapter);
  const existing = await port.get(id);
  const removed = await port.remove(id);
  if (removed && existing) {
    void appendAudit({
      projectId: adapter.identity.id,
      action: "delete",
      entityKind: "media",
      entityId: id,
      summary: `Media smazáno: ${existing.asset.name}`,
      details: { filename: existing.asset.name, mime: existing.asset.mime },
    }).catch(() => {});
  }
  return removed;
}
