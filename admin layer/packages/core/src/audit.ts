export const AUDIT_ACTIONS = [
  "login",
  "logout",
  "failed_login",
  "create",
  "update",
  "publish",
  "rollback",
  "unpublish",
  "archive",
  "restore",
  "delete",
  "settings",
  "permission",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO
  actor: string; // kdo — role (admin/editor/viewer) nebo "anonymous"
  projectId: string; // ke kterému projektu se akce vztahuje; "core" = globální (login, settings…)
  action: AuditAction; // co
  entityKind: string;
  entityId: string;
  summary: string; // lidsky čitelný popis (cs)
  details?: Record<string, unknown>;
}
