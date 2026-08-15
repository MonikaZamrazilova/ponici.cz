import Link from "next/link";
import { Badge, Button, Card, EmptyState, Table, Td, tokens } from "@admin/ui";
import { formatFieldValue, getItemLabel, type EntityKindDef, type FieldSchema } from "@admin/core";
import type { ItemSummary } from "@/lib/services/itemService";
import { ListActions } from "./ListActions";

/**
 * Generic Content Manager — list view (A3.1).
 * Plně schema-driven: sloupce, label i akce vycházejí z manifestu
 * (kindDef.listColumns) a capabilities/oprávnění projektu. Nový content
 * type = položka v manifestu, žádná duplikace CRUD kódu.
 */
export interface ContentListProps {
  projectId: string;
  kind: string;
  kindDef: EntityKindDef;
  rows: ItemSummary[];
  locale?: string;
  canCreate: boolean;
  canPublish: boolean;
  canDiscard: boolean;
  canDelete: boolean;
  /** true = položka vznikla v adminu (lze tvrdě smazat); base položky ne */
  isDeletable: (id: string) => boolean;
}

export function ContentList({
  projectId,
  kind,
  kindDef,
  rows,
  locale = "cs",
  canCreate,
  canPublish,
  canDiscard,
  canDelete,
  isDeletable,
}: ContentListProps) {
  const extras = (kindDef.listColumns ?? [])
    .filter((name) => name !== (kindDef.listField ?? kindDef.idField) && name !== kindDef.idField)
    .map((name) => ({ name, field: kindDef.fields.find((f) => f.name === name) }))
    .filter((c): c is { name: string; field: FieldSchema } => Boolean(c.field));

  const columns: { label: string; width?: string }[] = [
    { label: "Název", width: "30%" },
    { label: kindDef.idField, width: "18%" },
    ...extras.map((c) => ({ label: c.field.label, width: "18%" })),
    { label: "Stav" },
    { label: "Akce", width: "24%" },
  ];

  return (
    <Card padded={false}>
      {rows.length === 0 ? (
        <EmptyState
          title="Zatím žádné položky"
          hint={`Vytvořte první položku druhu „${kindDef.label}“.`}
        />
      ) : (
        <Table columns={columns}>
          {rows.map((row) => {
            const deletable = isDeletable(row.item.id);
            return (
              <tr key={row.item.id}>
                <Td>
                  <Link
                    href={`/admin/projects/${projectId}/kinds/${kind}/${row.item.id}`}
                    style={{
                      fontWeight: 600,
                      color: tokens.colors.primary,
                      textDecoration: "none",
                    }}
                  >
                    {getItemLabel(kindDef, row.item)}
                  </Link>
                </Td>
                <Td>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>{row.item.id}</span>
                </Td>
                {extras.map((c) => (
                  <Td key={c.name}>
                    <span style={{ fontSize: 13, color: tokens.colors.secondary }}>
                      {formatFieldValue(c.field, row.item[c.name], locale)}
                    </span>
                  </Td>
                ))}
                <Td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {row.item.status === "published" && !row.hasDraft && (
                      <Badge tone="success">Publikováno</Badge>
                    )}
                    {row.hasDraft && <Badge tone="warning">Draft</Badge>}
                    {row.item.status === "archived" && <Badge>Archivováno</Badge>}
                  </div>
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/projects/${projectId}/kinds/${kind}/${row.item.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: tokens.colors.primary,
                        textDecoration: "none",
                      }}
                    >
                      Upravit
                    </Link>
                    <ListActions
                      projectId={projectId}
                      kind={kind}
                      id={row.item.id}
                      hasDraft={row.hasDraft}
                      canPublish={canPublish}
                      canDiscard={canDiscard}
                      canDelete={canDelete && deletable}
                    />
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}

export function NewItemButton({
  projectId,
  kind,
  canCreate,
}: {
  projectId: string;
  kind: string;
  canCreate: boolean;
}) {
  if (!canCreate) return <Badge tone="neutral">Vytváření vypnuto (capability)</Badge>;
  return (
    <Link
      href={`/admin/projects/${projectId}/kinds/${kind}/new`}
      style={{ textDecoration: "none" }}
    >
      <Button>+ Nová položka</Button>
    </Link>
  );
}
