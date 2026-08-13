import "server-only";
import { nowIso, uid, type AuditAction, type AuditEvent } from "@admin/core";
import { centralAuditStore } from "../storage/auditStore";

/**
 * Application service — centrální audit log (A8.1).
 * Jeden zdroj pravdy: obsahové akce, login/logout, settings, permission
 * denials. Všechny události jsou dohledatelné podle actor/projectId/
 * entity/akce/času (filtry v UI).
 */
export async function appendAudit(input: {
  projectId: string;
  action: AuditAction;
  entityKind: string;
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await centralAuditStore.append({
    id: uid(),
    timestamp: nowIso(),
    actor: "admin",
    ...input,
  });
}

/** Události; bez projectId = celý log, s projectId = jen daný projekt. */
export async function listAudit(projectId?: string, limit = 300): Promise<AuditEvent[]> {
  const events = await centralAuditStore.list(limit * 2);
  const filtered = projectId ? events.filter((event) => event.projectId === projectId) : events;
  return filtered.slice(0, limit);
}

export type { AuditAction, AuditEvent };
