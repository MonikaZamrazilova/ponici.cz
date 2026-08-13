import { NextResponse } from "next/server";
import { fail, ok, rolePermissions } from "@admin/core";
import { requireSession } from "@/lib/auth";

/**
 * API kontrakt — aktuální session (role + oprávnění).
 * Klient ji používá POUZE pro UI reflexi (skrývání tlačítek);
 * enforcement je vždy server-side (requirePermission).
 */
export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json(
      ok({ role: session.role, permissions: rolePermissions(session.role) })
    );
  } catch {
    return NextResponse.json(fail("Nepřihlášeno"), { status: 401 });
  }
}
