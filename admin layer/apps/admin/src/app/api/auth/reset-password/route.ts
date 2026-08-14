import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/services/passwordResetService";

/** POST /api/auth/reset-password { newPassword } */
export async function POST(request: NextRequest) {
  let newPassword = "";
  try {
    const body = (await request.json()) as { newPassword?: unknown };
    if (typeof body.newPassword === "string") newPassword = body.newPassword;
  } catch {
    // nevalidní tělo → chyba níže
  }

  const verifiedToken = request.cookies.get("admin_reset_verified")?.value;

  try {
    const result = await resetPassword(newPassword, verifiedToken);
    const response = NextResponse.json({ ok: result.ok, message: result.message });

    // smaž reset cookies (expirace v minulosti)
    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    for (const name of ["admin_reset_token", "admin_reset_verified"]) {
      response.headers.append(
        "set-cookie",
        `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`
      );
    }
    return response;
  } catch (err) {
    const message =
      err instanceof Error && "status" in err
        ? (err as { status?: number }).status === 400
          ? (err as Error).message
          : "Změna hesla selhala — zkuste to později"
        : "Interní chyba — zkuste to později";
    return NextResponse.json({ ok: false, error: { message } }, { status: 400 });
  }
}
