import { NextResponse, type NextRequest } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { login } from "@/lib/auth";
import { assertBodySize, clientIp, isRateLimited } from "@/lib/security";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    assertBodySize(request, 16 * 1024);
    if (isRateLimited(`login:${clientIp(request)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
      return NextResponse.json(fail("Příliš mnoho pokusů — zkuste to později"), { status: 429 });
    }
    const body = (await request.json()) as { password?: string };
    const success = await login(body.password ?? "");
    if (!success) {
      return NextResponse.json(fail("Špatné heslo nebo admin vypnutý"), { status: 401 });
    }
    return NextResponse.json(ok({}));
  } catch {
    return NextResponse.json(fail("Neočekávaná chyba"), { status: 500 });
  }
}
