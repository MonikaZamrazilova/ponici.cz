import type { AuditEvent, AuditStorePort } from "@admin/core";
import { appendJsonl, readJsonl } from "./fsJson";

/** Audit jako JSONL soubor (git-trackovaný); port umožňuje výměnu za DB. */
export function jsonlAuditStore(file: string): AuditStorePort {
  return {
    async append(event) {
      await appendJsonl(file, event);
    },
    async list(limit = 200) {
      const events = await readJsonl<AuditEvent>(file);
      return events
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    },
  };
}
