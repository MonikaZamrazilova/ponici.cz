import type { ContentItem, OverrideStorePort } from "@admin/core";
import { githubReadJson, githubUpdateJson } from "./githubJson";

/**
 * Override store (drafts/published) nad GitHub Contents API.
 *
 * Stejný tvar jako jsonOverrideStore: { [kind]: { [id]: ContentItem } }.
 * Každá mutace = čti-změň-zapiš přes git commit; konflikt 409 se řeší
 * retry s čerstvě načteným stavem (githubUpdateJson).
 *
 * @param repoPath cesta v repu k souboru (např. .../store/drafts.json)
 */

export function githubOverrideStore(repoPath: string): OverrideStorePort {
  type OverrideFile = Record<string, Record<string, ContentItem>>;
  const EMPTY: OverrideFile = {};

  async function load(): Promise<OverrideFile> {
    return githubReadJson<OverrideFile>(repoPath, EMPTY);
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
      await githubUpdateJson<OverrideFile>(
        repoPath,
        EMPTY,
        (all) => {
          all[kind] = { ...(all[kind] ?? {}), [item.id]: item };
          return all;
        },
        `admin: save ${kind}/${item.id}`
      );
    },
    async remove(kind, id) {
      let removed = false;
      await githubUpdateJson<OverrideFile>(
        repoPath,
        EMPTY,
        (all) => {
          const map = all[kind];
          if (!map || !map[id]) return all;
          delete map[id];
          removed = true;
          return all;
        },
        `admin: remove ${kind}/${id}`
      );
      return removed;
    },
  };
}
