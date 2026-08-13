import { NextResponse, type NextRequest } from "next/server";
import { AdminError, ok } from "@admin/core";
import { requirePermission } from "@/lib/auth";
import { requireProject } from "@/lib/projects/registry";
import { loadManifest } from "@/lib/services/manifestService";
import { listItems } from "@/lib/services/itemService";

/**
 * Runtime obsah projektu — merged (base + published) položky všech druhů.
 * Web si je načítá v admin módu, aby viděl publikované změny bez rebuildu
 * (build-time bundle zůstává pro běžné návštěvníky).
 * Auth: content:read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requirePermission("content:read", { projectId });
    const adapter = requireProject(projectId);
    if (!adapter.modules.content) {
      return NextResponse.json(ok({ kinds: {} }));
    }
    const manifest = await loadManifest(adapter);
    const ctx = { adapter, manifest };

    const kinds: Record<string, unknown[]> = {};
    for (const kindDef of manifest.kinds) {
      const rows = await listItems(ctx, kindDef);
      kinds[kindDef.kind] = rows.map((row) => row.item);
    }

    return NextResponse.json(ok({ kinds, projectsRoot: undefined }));
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: error.status });
    }
    console.error("[admin] content API:", error);
    return NextResponse.json({ ok: false, error: { message: "Chyba serveru" } }, { status: 500 });
  }
}
