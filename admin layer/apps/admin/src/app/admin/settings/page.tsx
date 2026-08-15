import { Badge, Card, PageHeader, Table, Td, tokens } from "@admin/ui";
import { canPermission, getSession } from "@/lib/auth";
import { coreModules } from "@/lib/config";
import { collectSettings } from "@/lib/services/settingsService";
import { getRecoveryEmails } from "@/lib/services/recoveryEmailsService";
import { Forbidden } from "@/components/Forbidden";
import { ModuleDisabled } from "@/components/ModuleDisabled";
import { RecoveryEmailsForm } from "@/components/RecoveryEmailsForm";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION = "settings:read";
const WRITE_PERMISSION = "settings:write";

export default async function SettingsPage() {
  if (!(await canPermission(REQUIRED_PERMISSION))) {
    return <Forbidden />;
  }
  if (!coreModules.settings) {
    return <ModuleDisabled module="settings" />;
  }

  const session = await getSession();
  const rows = await collectSettings();
  const recoveryEmails = await getRecoveryEmails();
  const canWrite = await canPermission(WRITE_PERMISSION);

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.group) ?? [];
    list.push(row);
    groups.set(row.group, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Nastavení"
        description="Registr nastavení odvozený z konfigurace — secrets se nikdy nezobrazují."
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge tone="neutral">role: {session?.role}</Badge>
        <Badge tone="neutral">settings:read — nutné pro tuto stránku</Badge>
      </div>

      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
          Obnova hesla — e-maily
        </h2>
        {canWrite ? (
          <RecoveryEmailsForm initialEmails={recoveryEmails} />
        ) : (
          <Card padded={false}>
            <Table columns={[{ label: "E-mail" }]}>
              {recoveryEmails.map((email) => (
                <tr key={email}>
                  <Td>{email}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>

      {[...groups.entries()].map(([group, groupRows]) => (
        <div key={group}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{group}</h2>
          <Card padded={false}>
            <Table columns={[{ label: "Klíč", width: "40%" }, { label: "Hodnota" }]}>
              {groupRows.map((row) => (
                <tr key={row.key}>
                  <Td>
                    <span style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>{row.label}</span>
                    <div style={{ fontSize: 11, color: tokens.colors.mutedSoft, marginTop: 2 }}>
                      {row.key}
                    </div>
                  </Td>
                  <Td>{row.value}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      ))}
    </div>
  );
}
