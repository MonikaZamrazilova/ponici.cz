import type { AuditStorePort } from "@admin/core";
import { githubAuditStore } from "./githubAuditStore";

/**
 * Centrální audit log — append JSONL do repozitáře (GitHub Contents API).
 * Žádný filesystem. projectId v záznamu rozlišuje projekt;
 * "core" = globální událost (login, settings…).
 */
export const centralAuditStore: AuditStorePort = githubAuditStore(
  process.env.GITHUB_AUDIT_PATH ?? "admin layer/content/audit/central.jsonl"
);
