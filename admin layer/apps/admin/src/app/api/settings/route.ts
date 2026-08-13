import { NextResponse } from "next/server";
import { AdminError, fail, ok } from "@admin/core";
import { requirePermission } from "@/lib/auth";
import { coreModules } from "@/lib/config";
import { collectSettings } from "@/lib/services/settingsService";

/**
 * API kontrakt — registr nastavení (settings:read + modul settings zapnutý).
 * Vrací POUZE metadata z konfigurace, nikdy žádné secrets.
 */
export async function GET() {
  try {
    await requirePermission("settings:read");
    if (!coreModules.settings) {
      return NextResponse.json(fail("Modul settings je vypnutý"), { status: 403 });
    }
    return NextResponse.json(ok({ settings: await collectSettings() }));
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json(fail(error.message), { status: error.status });
    }
    return NextResponse.json(fail("Nepřihlášeno"), { status: 401 });
  }
}
