import { NextRequest, NextResponse } from "next/server";
import { isResetEnabled, requestReset } from "@/lib/services/passwordResetService";
import { checkRateLimit } from "@/lib/auth/resetToken";

/** Rate limiting — bez databáze, podepsaný timestamp token v cookie. */
const REQUEST_RESET_LIMIT = 3; // max 3 pokusy
const REQUEST_RESET_WINDOW_MS = 15 * 60 * 1000; // / 15 minut
const RATE_COOKIE = "admin_reset_rate_request";

/** HttpOnly + Secure + SameSite=Lax (security-first cookie flags). */
function resetCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/** POST /api/auth/request-reset { email } */
export async function POST(request: NextRequest) {
  if (!(await isResetEnabled())) {
    return NextResponse.json(
      { ok: false, error: { message: "Obnova hesla není nastavená (chybí ADMIN_EMAIL)" } },
      { status: 503 },
    );
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    if (typeof body.email === "string") email = body.email;
  } catch {
    // nevalidní tělo → anonymní odpověď níže
  }

  // rate limit (podepsaný token v cookie) — vždy, i pro neexistující e-mail
  const existing = request.cookies.get(RATE_COOKIE)?.value;
  const rate = await checkRateLimit(
    existing,
    "request-reset",
    REQUEST_RESET_LIMIT,
    REQUEST_RESET_WINDOW_MS,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: { message: "Příliš mnoho žádostí — zkuste to později" } },
      { status: 429 },
    );
  }

  try {
    const result = await requestReset(email, { allowed: true });
    if (!result.ok) {
      // jiný email než ADMIN_EMAIL — bezpečná odpověď, žádný email/token
      return NextResponse.json({ ok: false, error: { message: result.message } });
    }
    const response = NextResponse.json({ ok: result.ok, message: result.message });
    if (rate.nextToken) {
      response.headers.set("set-cookie", resetCookie(RATE_COOKIE, rate.nextToken, 15 * 60));
    }
    // reset token (kód hash) → HttpOnly cookie, TTL 10 minut
    if (result.resetToken) {
      response.headers.append(
        "set-cookie",
        resetCookie("admin_reset_token", result.resetToken, 10 * 60),
      );
    }
    if (result.devCode) {
      // jen development — kód pro lokální test
      response.headers.set("x-dev-code", result.devCode);
    }
    return response;
  } catch (error) {
    // Diagnostický log BEZ secrets (email, kód, token se nikdy nelogují).
    console.error(
      "[admin] request-reset selhal:",
      error instanceof Error ? error.message : "neznámá chyba",
    );
    return NextResponse.json(
      { ok: false, error: { message: "Interní chyba — zkuste to později" } },
      { status: 500 },
    );
  }
}
