import { NextResponse } from "next/server";
import { adminConfig, coreModules } from "@/lib/config";
import { listProjects } from "@/lib/projects/registry";
import { loadManifest } from "@/lib/services/manifestService";

/**
 * Public health check — žádné secrets, žádná auth (liveness pro
 * orchestrátory / monitoring).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = listProjects();
  const contracts: Record<string, "ok" | "error"> = {};
  for (const project of projects) {
    try {
      await loadManifest(project);
      contracts[project.identity.id] = "ok";
    } catch {
      contracts[project.identity.id] = "error";
    }
  }

  const status: "ok" | "degraded" = Object.values(contracts).some((s) => s === "error")
    ? "degraded"
    : "ok";

  return NextResponse.json(
    {
      status,
      version: "0.1.0",
      uptimeSec: Math.round(process.uptime()),
      modules: coreModules,
      rolesConfigured: Object.values(adminConfig.passwords).filter(Boolean).length,
      projects: Object.keys(contracts).length,
      contracts,
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
