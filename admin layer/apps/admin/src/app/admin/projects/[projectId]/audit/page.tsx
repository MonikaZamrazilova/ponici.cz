import { notFound } from "next/navigation";
import { PageHeader } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { requireProject } from "@/lib/projects/registry";
import { listAudit } from "@/lib/services/auditService";
import { AuditLog } from "@/components/AuditLog";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "audit:read";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }
  const { projectId } = await params;
  const adapter = requireProject(projectId);
  if (!adapter) notFound();
  if (!adapter.modules.audit) {
    return <ModuleDisabled module="audit" />;
  }

  const events = await listAudit(projectId, 300);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Audit"
        description={`Události projektu ${adapter.identity.name} — z centrálního logu.`}
      />
      <AuditLog events={events} />
    </div>
  );
}
