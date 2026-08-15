import { NextResponse, type NextRequest } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { requirePermission } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";
import { requireProject } from "@/lib/projects/registry";
import { listMedia, saveMedia } from "@/lib/services/mediaService";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    await requirePermission("media:read");
    const { projectId } = await params;
    const adapter = requireProject(projectId);
    if (!adapter.modules.media) {
      return NextResponse.json(fail("Modul media je pro tento projekt vypnutý"), { status: 403 });
    }
    return NextResponse.json(ok(await listMedia(adapter)));
  } catch (error) {
    return NextResponse.json(fail("Nepovoleno"), { status: 401 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { projectId } = await params;
    await requirePermission("media:write", { mutating: true, projectId });
    const adapter = requireProject(projectId);
    if (!adapter.modules.media) {
      return NextResponse.json(fail("Modul media je pro tento projekt vypnutý"), { status: 403 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(fail("Chybí soubor (form field: file)"), { status: 400 });
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const asset = await saveMedia(adapter, {
      name: file.name,
      mime: file.type || "application/octet-stream",
      data,
    });
    return NextResponse.json(ok(asset), { status: 201 });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message, error.fields), { status: error.status });
    }
    console.error("[admin] media API:", error);
    return NextResponse.json(fail("Chyba serveru"), { status: 500 });
  }
}
