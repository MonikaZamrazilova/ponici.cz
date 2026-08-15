import { NextResponse, type NextRequest } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { requirePermission } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";
import { requireProject } from "@/lib/projects/registry";
import { getMediaFile, removeMedia } from "@/lib/services/mediaService";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    // Veřejné čtení — obrázky se používají v obsahu webu (i pro návštěvníky).
    // Bezpečnost: náhodné UUID názvy (nedohledatelné), nosniff hlavičky.
    const { projectId, id } = await params;
    const adapter = requireProject(projectId);
    if (!adapter.modules.media) {
      return NextResponse.json(fail("Modul media je pro tento projekt vypnutý"), { status: 403 });
    }
    const { asset, data } = await getMediaFile(adapter, id);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "content-type": asset.mime,
        "content-length": String(asset.size),
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message), { status: error.status });
    }
    return NextResponse.json(fail("Nepovoleno"), { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { projectId, id } = await params;
    await requirePermission("media:write", { mutating: true, projectId });
    const adapter = requireProject(projectId);
    if (!adapter.modules.media) {
      return NextResponse.json(fail("Modul media je pro tento projekt vypnutý"), { status: 403 });
    }
    return NextResponse.json(ok({ deleted: await removeMedia(adapter, id) }));
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message), { status: error.status });
    }
    return NextResponse.json(fail("Nepovoleno"), { status: 401 });
  }
}
