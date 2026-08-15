import "server-only";
import {
  AdminError,
  type ContentManifest,
  type EntityKindDef,
  type ProjectAdapter,
} from "@admin/core";

/**
 * Application service — načtení kontraktu projektu.
 * Validuje manifest (zod). Bez cache: web po "manifest:export" vidí
 * nový kontrakt okamžitě a chyba kontraktu se projeví na dashboardu.
 */
export async function loadManifest(adapter: ProjectAdapter): Promise<ContentManifest> {
  return adapter.manifest.load();
}

export async function getKind(adapter: ProjectAdapter, kind: string): Promise<EntityKindDef> {
  const manifest = await loadManifest(adapter);
  const kindDef = manifest.kinds.find((k) => k.kind === kind);
  if (!kindDef) throw new AdminError(`Neznámý druh obsahu: ${kind}`);
  return kindDef;
}
