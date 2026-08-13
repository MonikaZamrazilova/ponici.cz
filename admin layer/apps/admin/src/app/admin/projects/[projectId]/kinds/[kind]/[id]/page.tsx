import { notFound } from "next/navigation";
import { EmptyState } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { requireProject } from "@/lib/projects/registry";
import { loadManifest, getKind } from "@/lib/services/manifestService";
import { getItemVersions } from "@/lib/services/itemService";
import { ItemForm } from "@/components/ItemForm";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "content:read";

export default async function ItemEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; kind: string; id: string }>;
}) {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }
  const { projectId, kind, id } = await params;
  const adapter = requireProject(projectId);
  if (!adapter) notFound();
  if (!adapter.modules.content) {
    return <ModuleDisabled module="content" />;
  }
  const manifest = await loadManifest(adapter);
  const kindDef = await getKind(adapter, kind).catch(() => notFound());
  const versions = await getItemVersions({ adapter, manifest }, kindDef, id);

  if (!versions) {
    return (
      <EmptyState
        title={`Položka „${id}“ neexistuje`}
        hint={`Vraťte se na seznam druhu „${kindDef.label}“.`}
      />
    );
  }

  return (
    <ItemForm
      projectId={projectId}
      kind={kind}
      kindLabel={kindDef.label}
      kindDef={kindDef}
      locales={manifest.locales}
      id={id}
      isNew={false}
      initial={versions.merged}
      draft={versions.draft}
      publishedVersion={versions.publishedVersion}
      hasDraft={versions.hasDraft}
      isPublished={versions.isPublished}
      canPublish={adapter.capabilities.content.publish}
      canDiscard={adapter.capabilities.content.discard}
      canDelete={adapter.capabilities.content.delete}
      isDeletable={!versions.base}
      hasBase={Boolean(versions.base)}
      features={adapter.features}
    />
  );
}
