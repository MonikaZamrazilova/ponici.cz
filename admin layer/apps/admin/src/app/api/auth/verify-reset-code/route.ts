import { NextRequest, NextResponse } from "next/server";
import { verifyResetCode } from "@/lib/services/passwordResetService";
import { checkRateLimit } from "@/lib/auth/resetToken";

/** Rate limiting — podepsaný timestamp token v cookie. */
const VERIFY_LIMIT = 5; // max 5 pokusů
const VERIFY_WINDOW_MS = 10 * 60 * 1000; // / 10 minut
const RATE_COOKIE = "admin_reset_rate_verify";

/** HttpOnly + Secure + SameSite=Lax (security-first cookie flags). */
function resetCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/** POST /api/auth/verify-reset-code { code } */
export async function POST(request: NextRequest) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string") code = body.code;
  } catch {
    // nevalidní tělo → chyba níže
  }

  // rate limit vždy
  const existing = request.cookies.get(RATE_COOKIE)?.value;
  const rate = await checkRateLimit(existing, "verify", VERIFY_LIMIT, VERIFY_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: { message: "Příliš mnoho pokusů — zkuste to později" } },
      { status: 429 }
    );
  }

  const resetToken = request.cookies.get("admin_reset_token")?.value;

  try {
    const result = await verifyResetCode(code, resetToken, { allowed: true });
    const response = NextResponse.json({ ok: result.ok, message: result.message });
    if (rate.nextToken) {
      response.headers.set("set-cookie", resetCookie(RATE_COOKIE, rate.nextToken, 10 * 60));
    }
    // verified token → HttpOnly cookie, TTL 10 minut
    if (result.verifiedToken) {
      response.headers.append(
        "set-cookie",
        resetCookie("admin_reset_verified", result.verifiedToken, 10 * 60)
      );
    }
    return response;
  } catch (err) {
    const message =
      err instanceof Error && "status" in err
        ? (err as { status?: number }).status === 429
          ? "Příliš mnoho pokusů — zkuste to později"
          : "Neplatný nebo vypršený kód"
        : "Interní chyba — zkuste to později";
    return NextResponse.json({ ok: false, error: { message } }, { status: 400 });
  }
}
