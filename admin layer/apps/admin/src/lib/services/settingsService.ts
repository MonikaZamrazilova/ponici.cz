import "server-only";
import { adminConfig, coreModules } from "../config";
import { listProjects } from "../projects/registry";

/**
 * Application service — registr dostupných nastavení (A6.1).
 * Settings stránka i API renderují JEN z tohoto registru — žádné
 * hardcoded řádky. Struktura je odvozená z core config + ProjectConfig.
 */

export interface SettingRow {
  group: string;
  key: string;
  label: string;
  value: string;
}

function enabledList(enabled: Record<string, boolean>): string {
  const names = Object.entries(enabled)
    .filter(([, on]) => on)
    .map(([name]) => name);
  return names.length ? names.join(", ") : "(nic)";
}

export async function collectSettings(): Promise<SettingRow[]> {
  const rows: SettingRow[] = [];
  const core = "Core (admin)";

  rows.push({ group: core, key: "auth.provider", label: "Auth provider", value: "password (hesla rolí z env)" });
  rows.push({
    group: core,
    key: "auth.sessionTtl",
    label: "Session TTL",
    value: `${Math.round(adminConfig.sessionTtlMs / 86_400_000)} dní`,
  });
  rows.push({ group: core, key: "modules", label: "Zapnuté core moduly", value: enabledList(coreModules) });
  rows.push({ group: core, key: "projects.root", label: "Data projektů", value: "GitHub content storage (stateless)" });
  rows.push({
    group: core,
    key: "projects.active",
    label: "Aktivní projekty",
    value: adminConfig.activeProjectIds.length ? adminConfig.activeProjectIds.join(", ") : "(všechny registrované)",
  });
  rows.push({
    group: core,
    key: "deploy.hooks",
    label: "Deploy webhooky",
    value: `${Object.keys(adminConfig.hookUrls).length} nakonfigurováno`,
  });

  for (const project of listProjects()) {
    const group = `Projekt · ${project.identity.name}`;
    const caps = project.capabilities;
    rows.push({ group, key: "modules", label: "Moduly", value: enabledList(project.modules) });
    rows.push({ group, key: "features", label: "Feature flags", value: enabledList(project.features) });
    rows.push({
      group,
      key: "media.provider",
      label: "Media provider",
      value: caps.media.enabled ? `filesystem (max ${caps.media.maxSizeMb} MB)` : "none",
    });
    rows.push({ group, key: "publish.model", label: "Publish model", value: caps.publish.model });
    rows.push({
      group,
      key: "content.capabilities",
      label: "Content capability",
      value: ["create", "edit", "publish", "discard", "delete"]
        .map((name) => `${name}:${caps.content[name as keyof typeof caps.content] ? "ano" : "ne"}`)
        .join(", "),
    });
  }

  return rows;
}
