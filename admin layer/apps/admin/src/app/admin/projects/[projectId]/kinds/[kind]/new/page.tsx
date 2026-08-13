import { notFound } from "next/navigation";
import { EmptyState } from "@admin/ui";
import type { ContentItem } from "@admin/core";
import { requireProject } from "@/lib/projects/registry";
import { loadManifest, getKind } from "@/lib/services/manifestService";
import { ItemForm } from "@/components/ItemForm";
import { canPermission } from "@/lib/auth";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "content:create";


export default async function NewItemPage({
  params,
}: {
  params: Promise<{ projectId: string; kind: string }>;
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

  if (!adapter.capabilities.content.create) {
    return (
      <EmptyState
        title="Vytváření obsahu je pro tento projekt vypnuté"
        hint="Capability content.create = false v adapteru projektu."
      />
    );
  }

  const empty: ContentItem = { id: "", status: "draft", createdAt: "", updatedAt: "" };

  return (
    <ItemForm
      projectId={projectId}
      kind={kind}
      kindLabel={kindDef.label}
      kindDef={kindDef}
      locales={manifest.locales}
      id=""
      isNew
      initial={empty}
      draft={null}
      publishedVersion={null}
      hasDraft={false}
      isPublished={false}
      canPublish={adapter.capabilities.content.publish}
      canDiscard={adapter.capabilities.content.discard}
      canDelete={adapter.capabilities.content.delete}
      isDeletable={false}
      hasBase={false}
      features={adapter.features}
    />
  );
}
