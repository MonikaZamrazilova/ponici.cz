import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { requireProject } from "@/lib/projects/registry";
import { loadManifest, getKind } from "@/lib/services/manifestService";
import { listItems } from "@/lib/services/itemService";
import { ContentList, NewItemButton } from "@/components/ContentList";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "content:read";
const PAGE_SIZE = 50;

export default async function KindListPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; kind: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }
  const { projectId, kind } = await params;
  const adapter = requireProject(projectId);
  if (!adapter) notFound();
  if (!adapter.modules.content) {
    return <ModuleDisabled module="content" />;
  }
  const manifest = await loadManifest(adapter);
  const kindDef = await getKind(adapter, kind).catch(() => notFound());
  const rows = await listItems({ adapter, manifest }, kindDef);

  // paginace (A9.2) — při velkém množství položek se renderuje jen stránka
  const requestedPage = Math.max(1, Number((await searchParams).page) || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const caps = adapter.capabilities.content;
  const baseIds = new Set((kindDef.baseItems ?? []).map((item) => item.id));
  const canCreate = caps.create && (await canPermission("content:create"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title={kindDef.label}
        description={kindDef.description ?? `${adapter.identity.name} · ${kindDef.kind}`}
        actions={<NewItemButton projectId={projectId} kind={kind} canCreate={canCreate} />}
      />

      <ContentList
        projectId={projectId}
        kind={kind}
        kindDef={kindDef}
        rows={pageRows}
        locale={manifest.locales[0]}
        canCreate={canCreate}
        canPublish={caps.publish}
        canDiscard={caps.discard}
        canDelete={caps.delete}
        isDeletable={(id) => !baseIds.has(id)}
      />

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            color: "#5F6368",
          }}
        >
          <span>
            {rows.length} položek · stránka {page} / {totalPages}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && (
              <Link
                href={`/admin/projects/${projectId}/kinds/${kind}?page=${page - 1}`}
                style={{ color: "#111111", fontWeight: 600, textDecoration: "none" }}
              >
                ← Předchozí
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/projects/${projectId}/kinds/${kind}?page=${page + 1}`}
                style={{ color: "#111111", fontWeight: 600, textDecoration: "none" }}
              >
                Další →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
