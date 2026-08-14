import "server-only";
import { adminConfig } from "../config";
import { isGithubConfigured } from "../storage/githubJson";
import { isVercelConfigured } from "./vercelEnvService";
import { listProjects } from "../projects/registry";
import { loadManifest } from "./manifestService";
import { listItems } from "./itemService";

/**
 * Application service — persistentní systémové alerty (A7.1).
 * Odvozené ze skutečného stavu: konfigurace, storage backend,
 * kontrakty, nepublikované drafty. Zobrazují se, dokud podmínka trvá.
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

  if (!isGithubConfigured()) {
    alerts.push({
      id: "github-storage",
      type: "error",
      title: "GitHub storage není nakonfigurováno",
      message: "Chybí GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO — obsah nelze spravovat.",
    });
  }

  if (!isVercelConfigured()) {
    alerts.push({
      id: "vercel-env",
      type: "warning",
      title: "Vercel env update není nakonfigurováno",
      message: "Chybí VERCEL_TOKEN/VERCEL_PROJECT_ID — změna hesla přežije jen do cold startu.",
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
