import { PageHeader } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { coreModules } from "@/lib/config";
import { listAudit } from "@/lib/services/auditService";
import { AuditLog } from "@/components/AuditLog";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "audit:read";

/**
 * Centrální audit log (A8.1) — všechny události napříč projekty
 * i core (login/logout, permission denials).
 */
export default async function GlobalAuditPage() {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }
  if (!coreModules.audit) {
    return <ModuleDisabled module="audit" />;
  }

  const events = await listAudit(undefined, 500);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Audit log"
        description="Centrální záznam všech akcí — dohledatelné podle uživatele, entity, akce a času."
      />
      <AuditLog events={events} showProject />
    </div>
  );
}
