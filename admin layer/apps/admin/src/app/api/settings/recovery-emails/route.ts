import { NextResponse, type NextRequest } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { requirePermission, requireSession } from "@/lib/auth";
import { getRecoveryEmails, updateRecoveryEmails } from "@/lib/services/recoveryEmailsService";

/**
 * API — konfigurace obnovovacích e-mailů (password recovery recipients).
 *
 * GET  — vrací aktuální seznam (settings:read)
 * PUT  — uloží nový seznam (settings:write; mutace → audit s aktérem)
 *
 * Bezpečnost:
 *   - jen role s settings:read / settings:write
 *   - audit obsahuje actor (role), starou a novou hodnotu — žádné secrets
 *   - anti-enumeration není dotčeno (requestReset zůstává anonymní)
 */
export async function GET() {
  try {
    await requirePermission("settings:read");
    return NextResponse.json(ok({ emails: await getRecoveryEmails() }));
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message), { status: error.status });
    }
    return NextResponse.json(fail("Nepřihlášeno"), { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePermission("settings:write", {
      mutating: true,
      projectId: "core",
      entity: "recovery-emails",
    });
    const session = await requireSession();

    const body = (await request.json()) as { emails?: unknown };
    const emails = await updateRecoveryEmails(body.emails, session.role);
    return NextResponse.json(ok({ emails }));
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message), { status: error.status });
    }
    return NextResponse.json(fail("Nepovoleno"), { status: 401 });
  }
}
