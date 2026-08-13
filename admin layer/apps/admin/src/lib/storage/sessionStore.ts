import type { SessionRecord, SessionStorePort } from "@admin/core";
import { adminConfig } from "../config";
import { readJsonl, writeJsonl } from "./fsJson";

/**
 * Server-side session store — JSONL soubor (gitignored).
 * TTL i odvolání se vyhodnocují tady; vypršené záznamy se při čtení
 * lazy mažou, při login se dělá plný cleanup.
 */
export function jsonlSessionStore(file: string): SessionStorePort {
  async function load(): Promise<SessionRecord[]> {
    return readJsonl<SessionRecord>(file);
  }

  async function save(list: SessionRecord[]): Promise<void> {
    await writeJsonl(file, list);
  }

  return {
    async create(sid, ttlMs) {
      const list = await load();
      list.push({ sid, createdAt: Date.now(), expiresAt: Date.now() + ttlMs });
      await save(list);
    },
    async get(sid) {
      const list = await load();
      const found = list.find((record) => record.sid === sid);
      if (!found) return null;
      if (found.expiresAt <= Date.now()) {
        await save(list.filter((record) => record.sid !== sid));
        return null;
      }
      return found;
    },
    async revoke(sid) {
      const list = await load();
      await save(list.filter((record) => record.sid !== sid));
    },
    async revokeAll() {
      await save([]);
    },
    async cleanup() {
      const list = await load();
      const now = Date.now();
      const fresh = list.filter((record) => record.expiresAt > now);
      if (fresh.length !== list.length) await save(fresh);
      return list.length - fresh.length;
    },
  };
}

export const sessionStore: SessionStorePort = jsonlSessionStore(adminConfig.sessionsFile);
