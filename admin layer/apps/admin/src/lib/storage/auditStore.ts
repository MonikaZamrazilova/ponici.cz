import type { AuditStorePort } from "@admin/core";
import { adminConfig } from "../config";
import { jsonlAuditStore } from "./jsonlAuditStore";

/**
 * Centrální audit log (A8.1) — jeden append-only JSONL soubor pro všechny
 * události (obsahové akce, login/logout, settings, permission denials).
 * projectId v záznamu rozlišuje projekt; "core" = globální událost.
 */
export const centralAuditStore: AuditStorePort = jsonlAuditStore(adminConfig.centralAuditFile);
