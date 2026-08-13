import { NextResponse, type NextRequest } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { requireProject } from "@/lib/projects/registry";
import { assertBodySize, assertSameOrigin } from "@/lib/security";
import { getKind, loadManifest } from "@/lib/services/manifestService";
import { deleteItem, discardDraft, publishItem, rollbackItem, saveDraft } from "@/lib/services/itemService";

/**
 * API kontrakt — mutace obsahu (scoped per projekt).
 * Tělo: { action: "save"|"publish"|"discard"|"delete", data? }
 * Odpověď: ApiResult — viz @admin/core/src/api.ts
 * Enforcement: session (requireSession) + permission dle akce + capability projektu.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; kind: string; id: string }> }
) {
  try {
    assertBodySize(request, 1024 * 1024); // max 1 MB
    assertSameOrigin(request);
    const { projectId, kind, id } = await params;
    const adapter = requireProject(projectId);
    if (!adapter.modules.content) {
      return NextResponse.json(fail("Modul obsahu je pro tento projekt vypnutý"), { status: 403 });
    }
    const manifest = await loadManifest(adapter);
    const kindDef = await getKind(adapter, kind);
    const ctx = { adapter, manifest };
    const body = (await request.json()) as { action?: string; data?: unknown };

    switch (body.action) {
      case "save":
        // save = upsert draft: vytvoření (content:create) nebo úprava (content:update)
        await requireAnyPermission(["content:create", "content:update"], {
          mutating: true,
          projectId,
          entity: `items/${kind}/${id}`,
        });
        return NextResponse.json(ok(await saveDraft(ctx, kindDef, id, body.data)));
      case "publish":
        await requirePermission("content:publish", { mutating: true, projectId, entity: `items/${kind}/${id}` });
        return NextResponse.json(
          ok({ published: true, item: await publishItem(ctx, kindDef, id) })
        );
      case "discard":
        await requirePermission("content:delete", { mutating: true, projectId, entity: `items/${kind}/${id}` });
        return NextResponse.json(ok({ discarded: await discardDraft(ctx, kindDef, id) }));
      case "delete":
        await requirePermission("content:delete", { mutating: true, projectId, entity: `items/${kind}/${id}` });
        return NextResponse.json(ok({ deleted: await deleteItem(ctx, kindDef, id) }));
      case "rollback":
        await requirePermission("content:publish", { mutating: true, projectId, entity: `items/${kind}/${id}` });
        return NextResponse.json(ok({ rolledBack: await rollbackItem(ctx, kindDef, id) }));
      default:
        return NextResponse.json(fail("Neznámá akce"), { status: 400 });
    }
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message, error.fields), { status: error.status });
    }
    console.error("[admin] items API:", error);
    return NextResponse.json(fail("Chyba serveru"), { status: 500 });
  }
}
