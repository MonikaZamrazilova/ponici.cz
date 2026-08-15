import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Table, Td, tokens } from "@admin/ui";
import { requireProject } from "@/lib/projects/registry";
import { listAudit } from "@/lib/services/auditService";
import { loadManifest } from "@/lib/services/manifestService";
import { listItems } from "@/lib/services/itemService";
import { canPermission } from "@/lib/auth";
import { Forbidden } from "@/components/Forbidden";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "content:read";

export default async function ProjectHomePage({
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
  const manifest = await loadManifest(adapter);
  const perKind = await Promise.all(
    manifest.kinds.map(async (kind) => ({
      kind,
      rows: await listItems({ adapter, manifest }, kind),
    })),
  );
  const recentAudit = await listAudit(projectId, 8);
  const caps = adapter.capabilities;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title={adapter.identity.name}
        description={
          adapter.identity.description ?? `${adapter.identity.id} — kontrakt z manifest.json`
        }
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge tone={caps.media.enabled ? "success" : "neutral"}>
          Media: {caps.media.enabled ? `ano (max ${caps.media.maxSizeMb} MB)` : "ne"}
        </Badge>
        <Badge tone="info">Publish: {caps.publish.model}</Badge>
        <Badge tone={caps.content.create ? "success" : "danger"}>
          Create: {caps.content.create ? "ano" : "ne"}
        </Badge>
        <Badge tone={caps.content.publish ? "success" : "danger"}>
          Publish: {caps.content.publish ? "ano" : "ne"}
        </Badge>
        {adapter.identity.repo && (
          <span style={{ fontSize: 12, color: tokens.colors.muted, fontFamily: tokens.font.mono }}>
            repo: {adapter.identity.repo}
          </span>
        )}
      </div>

      <Card padded={false}>
        <Table
          columns={[
            { label: "Druh obsahu", width: "40%" },
            { label: "Položek" },
            { label: "Draftů" },
            { label: "Publikovaných override" },
          ]}
        >
          {perKind.map(({ kind, rows }) => (
            <tr key={kind.kind}>
              <Td>
                <a
                  href={`/admin/projects/${projectId}/kinds/${kind.kind}`}
                  style={{ fontWeight: 600, color: tokens.colors.primary, textDecoration: "none" }}
                >
                  {kind.label}
                </a>
                <div style={{ fontSize: 12, color: tokens.colors.muted, marginTop: 2 }}>
                  {kind.kind}
                </div>
              </Td>
              <Td>{rows.length}</Td>
              <Td>
                <span
                  style={{
                    color: rows.filter((r) => r.hasDraft).length
                      ? tokens.colors.warning
                      : tokens.colors.muted,
                  }}
                >
                  {rows.filter((r) => r.hasDraft).length}
                </span>
              </Td>
              <Td>{rows.filter((r) => r.isPublished).length}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Poslední změny</h2>
        <Card padded={false}>
          {recentAudit.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: tokens.colors.muted }}>
              Zatím žádné změny.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentAudit.map((event) => (
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
