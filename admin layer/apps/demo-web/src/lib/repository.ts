import "server-only";
import type { ContentItem, EntityKindDef } from "@admin/core";
import { manifest } from "../manifest/index";
import publishedJson from "../../../../content/projects/demo-web/store/published.json";

/**
 * Repository demo aplikace — čistě business strana.
 *
 * Merges vlastní base obsah (manifest.baseItems) s overrides, které
 * vyprodukoval Admin Layer (content/store/published.json). Web nemá
 * žádný admin kód — jediné napojení je JSON blob publikovaných změn,
 * který si sám zabundluje při buildu.
 */

const overrides = publishedJson as unknown as Record<string, Record<string, ContentItem>>;

function kindDef(kind: string): EntityKindDef {
  const def = manifest.kinds.find((k) => k.kind === kind);
  if (!def) throw new Error(`Neznámý druh obsahu: ${kind}`);
  return def;
}

function mergeKind(kind: string): ContentItem[] {
  const def = kindDef(kind);
  const map = overrides[kind] ?? {};
  const merged = new Map<string, ContentItem>();
  for (const base of def.baseItems ?? []) {
    merged.set(base.id, { ...base, ...map[base.id] });
  }
  for (const [id, item] of Object.entries(map)) {
    merged.set(id, item);
  }
  return [...merged.values()];
}

const isDev = process.env.NODE_ENV === "development";

function visible(item: ContentItem): boolean {
  if (item.status === "archived") return false;
  return isDev || item.status === "published";
}

export function listProjects(): ContentItem[] {
  return mergeKind("project").filter(visible);
}

export function listProfessions(): ContentItem[] {
  return mergeKind("profession").filter(visible);
}

export function listPages(): ContentItem[] {
  return mergeKind("page").filter(visible);
}

export function getSite(): ContentItem | undefined {
  return mergeKind("site").find((item) => visible(item));
}
