import "server-only";
import { getItemLabel, type AuditEvent, type ContentManifest, type ProjectAdapter } from "@admin/core";
import { listAudit } from "./auditService";
import { adminConfig } from "../config";
import { listProjects } from "../projects/registry";
import { loadManifest } from "./manifestService";
import { listItems } from "./itemService";

/**
 * Application service — dashboard overview (A2.2).
 * Všechna data jsou skutečná: čte porty adapterů (GitHub + Blob).
 * Žádné fake hodnoty — chybějící data se projeví jako empty state v UI.
 */

export interface HealthCheck {
  key: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
}

export interface ProjectStatus {
  adapter: ProjectAdapter;
  manifest: ContentManifest | null;
  contractError: string | null;
  baseCount: number;
  publishedCount: number;
  draftCount: number;
}

export interface ItemChange {
  projectId: string;
  projectName: string;
  kind: string;
  kindLabel: string;
  id: string;
  label: string;
  updatedAt: string;
  isDraft: boolean;
  isPublished: boolean;
}

export type ActivityEvent = AuditEvent & { projectName: string };

export interface DashboardData {
  projects: ProjectStatus[];
  totals: { projects: number; drafts: number; publishedOverrides: number; mediaFiles: number };
  unpublishedChanges: ItemChange[];
  recentlyChanged: ItemChange[];
  recentActivity: ActivityEvent[];
  health: HealthCheck[];
}

export async function collectDashboard(): Promise<DashboardData> {
  const projects = listProjects();
  const statuses: ProjectStatus[] = [];
  const unpublished: ItemChange[] = [];
  const changed: ItemChange[] = [];
  const activity: ActivityEvent[] = [];
  let mediaFiles = 0;

  for (const adapter of projects) {
    const projectName = adapter.identity.name;
    const projectId = adapter.identity.id;

    const manifest = await loadManifest(adapter).catch(() => null);
    let contractError: string | null = null;
    let baseCount = 0;
    let publishedCount = 0;
    let draftCount = 0;

    if (manifest) {
      for (const kind of manifest.kinds) {
        const rows = await listItems({ adapter, manifest }, kind);
        baseCount += (kind.baseItems ?? []).length;
        for (const row of rows) {
          if (row.isPublished) publishedCount += 1;
          if (row.hasDraft) {
            draftCount += 1;
            unpublished.push({
              projectId,
              projectName,
              kind: kind.kind,
              kindLabel: kind.label,
              id: row.item.id,
              label: getItemLabel(kind, row.item),
              updatedAt: row.item.updatedAt,
              isDraft: true,
              isPublished: row.isPublished,
            });
          }
          if (row.hasDraft || row.isPublished) {
            changed.push({
              projectId,
              projectName,
              kind: kind.kind,
              kindLabel: kind.label,
              id: row.item.id,
              label: getItemLabel(kind, row.item),
              updatedAt: row.item.updatedAt,
              isDraft: row.hasDraft,
              isPublished: row.isPublished,
            });
          }
        }
      }
    } else {
      contractError = "kontrakt (manifest.json) se nepodařilo načíst";
    }

    if (adapter.media) {
      try {
        mediaFiles += (await adapter.media.list()).length;
      } catch {
        // media nedostupná — počítá se 0
      }
    }

    const events = await listAudit(projectId, 50).catch(() => [] as ActivityEvent[]);
    activity.push(...events.map((event) => ({ ...event, projectName })));

    statuses.push({ adapter, manifest, contractError, baseCount, publishedCount, draftCount });
  }

  unpublished.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  changed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const health = await systemHealth();

  return {
    projects: statuses,
    totals: {
      projects: projects.length,
      drafts: unpublished.length,
      publishedOverrides: statuses.reduce((sum, s) => sum + s.publishedCount, 0),
      mediaFiles,
    },
    unpublishedChanges: unpublished,
    recentlyChanged: changed.slice(0, 6),
    recentActivity: activity.slice(0, 12),
    health,
  };
}

/* ─────────────── systémové health indikátory ─────────────── */

export async function systemHealth(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  const rolesConfigured = Object.values(adminConfig.passwords).filter(Boolean).length;
  checks.push({
    key: "admin",
    label: "Admin konfigurace",
    status: rolesConfigured ? "ok" : "warn",
    detail: rolesConfigured ? `${rolesConfigured} role s heslem` : "žádné heslo — admin je vypnutý",
  });

  checks.push({
    key: "projects-root",
    label: "Data projektů",
    status: "ok",
    detail: "GitHub content storage (stateless)",
  });

  checks.push({
    key: "sessions",
    label: "Session model",
    status: "ok",
    detail: "podepsané cookie (stateless, žádný storage)",
  });

  for (const adapter of listProjects()) {
    const name = adapter.identity.name;
    const id = adapter.identity.id;
    try {
      const manifest = await loadManifest(adapter);
      checks.push({
        key: `contract-${id}`,
        label: `Kontrakt · ${name}`,
        status: "ok",
        detail: `${manifest.kinds.length} druhů obsahu, locales: ${manifest.locales.join("/")}`,
      });
    } catch (error) {
      checks.push({
        key: `contract-${id}`,
        label: `Kontrakt · ${name}`,
        status: "error",
        detail: error instanceof Error ? error.message : "nelze načíst manifest",
      });
    }
    if (adapter.media) {
      checks.push({
        key: `media-${id}`,
        label: `Media · ${name}`,
        status: "ok",
        detail: "Vercel Blob (BLOB_READ_WRITE_TOKEN)",
      });
    }
  }

  return checks;
}
