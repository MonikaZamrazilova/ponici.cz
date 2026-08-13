import { NextResponse, type NextRequest } from "next/server";
import { AdminError, ok } from "@admin/core";
import { clientIp } from "@/lib/security";
import { requestReset, isResetEnabled } from "@/lib/services/passwordResetService";

/** { email } → vygeneruje a odešle ověřovací kód e-mailem. */
export async function POST(request: NextRequest) {
  if (!isResetEnabled()) {
    return NextResponse.json(
      { ok: false, error: { message: "Obnova hesla není nastavená (chybí ADMIN_RESET_EMAILS)" } },
      { status: 503 }
    );
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    if (typeof body.email === "string") email = body.email;
  } catch {
    // prázdné tělo → neplatný e-mail, anonymní odpověď níže
  }

  try {
    const result = await requestReset(email, clientIp(request));
    return NextResponse.json(ok(result));
  } catch (err) {
    if (err instanceof AdminError) {
      return NextResponse.json({ ok: false, error: { message: err.message } }, { status: err.status });
    }
    console.error("[admin] requestReset selhal:", err);
    return NextResponse.json(
      { ok: false, error: { message: "Interní chyba — zkuste to později" } },
      { status: 500 }
    );
  }
}
