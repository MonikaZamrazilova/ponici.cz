import type { ContentItem, OverrideStorePort } from "@admin/core";
import { readJson, writeJson } from "./fsJson";

/**
 * JSON store pro drafts i published overrides — stejný tvar, dva soubory.
 * Struktura: { [kind]: { [id]: ContentItem } }
 */

export function jsonOverrideStore(file: string): OverrideStorePort {
  async function load(): Promise<Record<string, Record<string, ContentItem>>> {
    return readJson<Record<string, Record<string, ContentItem>>>(file, {});
  }

  return {
    async list(kind) {
      const all = await load();
      return all[kind] ?? {};
    },
    async get(kind, id) {
      const map = await this.list(kind);
      return map[id] ?? null;
    },
    async save(item, kind) {
      const all = await load();
      all[kind] = { ...(all[kind] ?? {}), [item.id]: item };
      await writeJson(file, all);
    },
    async remove(kind, id) {
      const all = await load();
      const map = all[kind];
      if (!map || !map[id]) return false;
      delete map[id];
      await writeJson(file, all);
      return true;
    },
  };
}
