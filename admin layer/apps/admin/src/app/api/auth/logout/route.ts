import { NextResponse, type NextRequest } from "next/server";
import { ok } from "@admin/core";
import { logout } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  assertSameOrigin(request);
  await logout();
  return NextResponse.json(ok({}));
}
