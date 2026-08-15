import { Badge, Card, PageHeader, Table, Td, tokens } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { collectDashboard } from "@/lib/services/dashboardService";
import { Forbidden } from "@/components/Forbidden";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "content:read";

/**
 * Dashboard (kanonická úvodní stránka adminu) — přehled projektů,
 * změn a health. Nahrazuje původní redirect na /admin/settings.
 */
export default async function DashboardPage() {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }

  const data = await collectDashboard();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Dashboard" description="Přehled projektů, obsahu a stavu systému." />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge tone="neutral">{data.totals.projects} projektů</Badge>
        <Badge tone="info">{data.totals.drafts} draftů</Badge>
        <Badge tone="success">{data.totals.publishedOverrides} publikovaných</Badge>
        <Badge tone="neutral">{data.totals.mediaFiles} médií</Badge>
      </div>

      <Card padded={false}>
        <Table
          columns={[
            { label: "Projekt", width: "40%" },
            { label: "Kontrakt" },
            { label: "Base" },
            { label: "Draftů" },
            { label: "Publikováno" },
          ]}
        >
          {data.projects.map((project) => (
            <tr key={project.adapter.identity.id}>
              <Td>
                <a
                  href={`/admin/projects/${project.adapter.identity.id}`}
                  style={{ fontWeight: 600, color: tokens.colors.primary, textDecoration: "none" }}
                >
                  {project.adapter.identity.name}
                </a>
                <div style={{ fontSize: 12, color: tokens.colors.muted, marginTop: 2 }}>
                  {project.adapter.identity.id}
                </div>
              </Td>
              <Td>
                {project.contractError ? (
                  <Badge tone="danger">chyba</Badge>
                ) : (
                  <Badge tone="success">ok</Badge>
                )}
              </Td>
              <Td>{project.baseCount}</Td>
              <Td>{project.draftCount}</Td>
              <Td>{project.publishedCount}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {data.unpublishedChanges.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Nepublikované změny</h2>
          <Card padded={false}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.unpublishedChanges.map((change) => (
                <div
                  key={`${change.projectId}-${change.kind}-${change.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: `1px solid ${tokens.colors.border}`,
                    fontSize: 13,
                  }}
                >
                  <Badge tone="warning">draft</Badge>
                  <span style={{ fontWeight: 600 }}>{change.projectName}</span>
                  <span style={{ color: tokens.colors.muted }}>{change.kindLabel}</span>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {change.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Poslední aktivita</h2>
        <Card padded={false}>
          {data.recentActivity.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: tokens.colors.muted }}>
              Zatím žádné změny.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.recentActivity.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: `1px solid ${tokens.colors.border}`,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      color: tokens.colors.mutedSoft,
                      fontFamily: tokens.font.mono,
                      fontSize: 12,
                      width: 130,
                      flexShrink: 0,
                    }}
                  >
                    {new Date(event.timestamp).toLocaleString("cs-CZ")}
                  </span>
                  <Badge
                    tone={
                      event.action === "publish"
                        ? "success"
                        : event.action === "delete"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {event.action}
                  </Badge>
                  <span
                    style={{
                      fontFamily: tokens.font.mono,
                      fontSize: 12,
                      color: tokens.colors.muted,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    {event.entityKind}
                  </span>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {event.summary}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
