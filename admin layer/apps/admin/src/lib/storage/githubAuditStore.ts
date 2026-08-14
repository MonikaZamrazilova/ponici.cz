import "server-only";
import type { AuditEvent, AuditStorePort } from "@admin/core";
import { githubAppendJsonl, githubRead } from "./githubJson";

/**
 * Audit log přes GitHub — append JSONL řádku do repozitáře.
 *
 * Žádný filesystem: každá událost je jeden JSONL řádek commitnutý do
 * repozitáře (čti-změň-zapiš s retry při konfliktu 409 — single-writer).
 *
 * Formát řádku: AuditEvent (id, timestamp, actor, projectId, action,
 * entityKind, entityId, summary, details?) — žádné hesla/tokeny/secrets.
 *
 * Cesta: GITHUB_AUDIT_PATH (default admin layer/content/audit/central.jsonl)
 *
 * Trade-off: append = 2 API volání (GET + PUT), commit za každou událost.
 * Rate limit GitHubu: 5000 req/h s tokenem — při ~2 req/událost zvládne
 * tisíce událostí denně. Selhání auditu NIKDY nesmí shodit hlavní akci —
 * volající používají appendAudit(...).catch(() => {}).
 */

export function githubAuditStore(repoPath: string): AuditStorePort {
  return {
    async append(event: AuditEvent): Promise<void> {
      await githubAppendJsonl(repoPath, event, `admin: audit ${event.action} ${event.entityKind}/${event.entityId}`);
    },

    async list(limit = 200): Promise<AuditEvent[]> {
      // soubor je JSONL — čteme raw text a parsujeme po řádcích
      const { githubRepo } = await import("./githubJson");
      const file = await githubRead(githubRepo(), repoPath);
      if (!file) return [];
      const events: AuditEvent[] = [];
      for (const line of file.content.split("\n")) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line) as AuditEvent);
        } catch {
          // poškozený řádek ignorujeme — audit nesmí shodit aplikaci
        }
      }
      return events
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    },
  };
}

export { githubAppendJsonl };
