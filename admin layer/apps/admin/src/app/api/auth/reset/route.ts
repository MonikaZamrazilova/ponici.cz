import { NextResponse, type NextRequest } from "next/server";
import { AdminError, ok } from "@admin/core";
import { clientIp } from "@/lib/security";
import { completeReset, isResetEnabled } from "@/lib/services/passwordResetService";

/** { email, code, newPassword } → ověří kód a uloží nové heslo. */
export async function POST(request: NextRequest) {
  if (!isResetEnabled()) {
    return NextResponse.json(
      { ok: false, error: { message: "Obnova hesla není nastavená (chybí ADMIN_RESET_EMAILS)" } },
      { status: 503 }
    );
  }

  let email = "";
  let code = "";
  let newPassword = "";
  try {
    const body = (await request.json()) as { email?: unknown; code?: unknown; newPassword?: unknown };
    if (typeof body.email === "string") email = body.email;
    if (typeof body.code === "string") code = body.code;
    if (typeof body.newPassword === "string") newPassword = body.newPassword;
  } catch {
    // nevalidní tělo → chyba níže
  }

  try {
    await completeReset(email, code, newPassword, clientIp(request));
    return NextResponse.json(ok({}));
  } catch (err) {
    if (err instanceof AdminError) {
      return NextResponse.json({ ok: false, error: { message: err.message } }, { status: err.status });
    }
    console.error("[admin] completeReset selhal:", err);
    return NextResponse.json(
      { ok: false, error: { message: "Interní chyba — zkuste to později" } },
      { status: 500 }
    );
  }
}
