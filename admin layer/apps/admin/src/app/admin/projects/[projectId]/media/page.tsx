import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader, Table, Td, tokens } from "@admin/ui";
import { requireProject } from "@/lib/projects/registry";
import { listMedia } from "@/lib/services/mediaService";
import { MediaDeleteButton } from "@/components/MediaDeleteButton";
import { MediaUploader } from "@/components/MediaUploader";
import { canPermission } from "@/lib/auth";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "media:read";


function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaPage({
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
  if (!adapter.modules.media) {
    return <ModuleDisabled module="media" />;
  }

  if (!adapter.media) {
    return (
      <EmptyState
        title="Media je pro tento projekt vypnuté"
        hint="Capability media.enabled = false v adapteru projektu."
      />
    );
  }

  const assets = await listMedia(adapter);
  const accept = adapter.capabilities.media.allowedMimeTypes.join(",");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Media"
        description={`Soubory projektu ${adapter.identity.name} (max ${adapter.capabilities.media.maxSizeMb} MB).`}
        actions={<MediaUploader projectId={projectId} accept={accept} />}
      />

      <Card padded={false}>
        {assets.length === 0 ? (
          <EmptyState title="Žádné soubory" hint="Nahrajte první obrázek tlačítkem nahoře." />
        ) : (
          <Table
            columns={[
              { label: "Náhled", width: "12%" },
              { label: "Soubor" },
              { label: "Typ", width: "12%" },
              { label: "Velikost", width: "10%" },
              { label: "Přidáno", width: "18%" },
              { label: "Akce", width: "12%" },
            ]}
          >
            {assets.map((asset) => (
              <tr key={asset.id}>
                <Td>
                  {asset.mime.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/projects/${projectId}/media/${asset.id}`}
                      alt={asset.name}
                      style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, display: "block" }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: tokens.colors.muted }}>—</span>
                  )}
                </Td>
                <Td>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>{asset.name}</span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, color: tokens.colors.muted }}>{asset.mime}</span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12 }}>{formatSize(asset.size)}</span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, color: tokens.colors.muted }}>
                    {new Date(asset.createdAt).toLocaleDateString("cs-CZ")}
                  </span>
                </Td>
                <Td>
                  <MediaDeleteButton projectId={projectId} id={asset.id} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
