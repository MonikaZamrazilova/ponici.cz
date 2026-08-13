import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { adminConfig } from "../config";
import { listProjects } from "../projects/registry";
import { loadManifest } from "./manifestService";
import { listItems } from "./itemService";

/**
 * Application service — persistentní systémové alerty (A7.1).
 * Odvozené ze skutečného stavu: konfigurace, filesystém, kontrakty,
 * nepublikované drafty. Zobrazují se, dokud podmínka trvá.
 */

export interface SystemAlert {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
  link?: { href: string; label: string };
}

export async function collectSystemAlerts(): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = [];

  const rolesConfigured = Object.values(adminConfig.passwords).filter(Boolean).length;
  if (rolesConfigured === 0) {
    alerts.push({
      id: "admin-disabled",
      type: "warning",
      title: "Admin je vypnutý",
      message: "Není nastaveno heslo žádné role — přihlášení není možné.",
      link: { href: "/admin/settings", label: "Nastavení" },
    });
  }

  try {
    await fs.mkdir(path.dirname(adminConfig.sessionsFile), { recursive: true });
  } catch {
    alerts.push({
      id: "session-store",
      type: "error",
      title: "Session store není zapisovatelný",
      message: "Odhlášení a revokace session nebudou fungovat spolehlivě.",
    });
  }

  let draftsTotal = 0;
  for (const project of listProjects()) {
    if (!project.modules.content) continue;
    try {
      const manifest = await loadManifest(project);
      for (const kind of manifest.kinds) {
        const rows = await listItems({ adapter: project, manifest }, kind);
        draftsTotal += rows.filter((row) => row.hasDraft).length;
      }
    } catch (error) {
      alerts.push({
        id: `contract-${project.identity.id}`,
        type: "error",
        title: `Kontrakt projektu „${project.identity.name}“ se nepodařilo načíst`,
        message: error instanceof Error ? error.message : "neplatný manifest.json",
        link: { href: `/admin/projects/${project.identity.id}`, label: "Otevřít projekt" },
      });
    }
  }

  if (draftsTotal > 0) {
    alerts.push({
      id: "drafts-pending",
      type: "info",
      title: `${draftsTotal} nepublikovaných změn`,
      message: "Drafty se na web nedostanou, dokud je nepublikujete.",
      link: { href: "/admin", label: "Přehled" },
    });
  }

  return alerts;
}
