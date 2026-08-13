import { adminConfig } from "../config";
import { readJson, writeJson } from "./fsJson";

/**
 * Store ověřovacích kódů pro obnovení hesla (gitignored).
 * Kód se ukládá jen jako hash (sha256) — samotný kód nikdy neleží na disku.
 * Klíč = e-mail; nový request přepíše předchozí kód.
 */

export interface ResetCodeRecord {
  /** hash kódu (sha256) */
  hash: string;
  /** epoch ms vypršení */
  expiresAt: number;
  /** počet špatných pokusů o zadání kódu */
  attempts: number;
  createdAt: number;
}

type ResetCodeFile = Record<string, ResetCodeRecord>;

export function resetCodeStore() {
  const file = adminConfig.resetCodesFile;

  async function load(): Promise<ResetCodeFile> {
    const data = await readJson<ResetCodeFile>(file, {});
    const now = Date.now();
    let changed = false;
    for (const [email, rec] of Object.entries(data)) {
      if (!rec || rec.expiresAt <= now) {
        delete data[email];
        changed = true;
      }
    }
    if (changed) await save(data);
    return data;
  }

  async function save(data: ResetCodeFile): Promise<void> {
    await writeJson(file, data);
  }

  return {
    async create(email: string, codeHash: string, ttlMs: number): Promise<void> {
      const data = await load();
      data[email] = {
        hash: codeHash,
        expiresAt: Date.now() + ttlMs,
        attempts: 0,
        createdAt: Date.now(),
      };
      await save(data);
    },

    async get(email: string): Promise<ResetCodeRecord | null> {
      const data = await load();
      return data[email] ?? null;
    },

    async incrementAttempts(email: string): Promise<void> {
      const data = await load();
      const rec = data[email];
      if (!rec) return;
      rec.attempts += 1;
      await save(data);
    },

    async remove(email: string): Promise<void> {
      const data = await load();
      delete data[email];
      await save(data);
    },
  };
}

export const resetCodes = resetCodeStore();
