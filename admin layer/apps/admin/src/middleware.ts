import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, SESSION_COOKIE, verifySignedSession } from "@admin/core";

/**
 * Auth boundary — rychlá krypto-kontrola na edge (podpis + expiry).
 * Není jedinou ochranou: server komponenty i API handlery dělají
 * plnou serverovou validaci včetně session store (revokace) a
 * permission checků (role).
 *
 * - /api/* bez session → 401 JSON (čistý unauthorized state)
 * - stránky bez session → redirect /login (?expired=1 když cookie existuje)
 */

async function isAuthed(request: NextRequest): Promise<boolean> {
  const passwords = [
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_EDITOR_PASSWORD,
    process.env.ADMIN_VIEWER_PASSWORD,
  ].filter(isAdminEnabled);
  if (passwords.length === 0) return false;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  for (const password of passwords) {
    if (await verifySignedSession(token, password)) return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // login endpoint je vstupní bod — nesmí být gated
  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  // obnova hesla — vstupní body mimo auth (kód + e-mail)
  if (
    pathname === "/api/auth/request-reset" ||
    pathname === "/api/auth/verify-reset-code" ||
    pathname === "/api/auth/reset-password"
  ) {
    return NextResponse.next();
  }

  // veřejný liveness check (bez secrets) — pro monitoring/orchestrátory
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  // veřejné čtení media souborů — obrázky v obsahu webu se zobrazují
  // i návštěvníkům (náhodné UUID názvy brání hádání); DELETE zůstává chráněný
  if (request.method === "GET" && /^\/api\/projects\/[^/]+\/media\/[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isAuthed(request);
  const isApi = pathname.startsWith("/api/");

  if (!authed) {
    // Edge middleware vidí jen env hesla. Platná session s runtime
    // override heslem (reset flow) edge neověří — s cookie propustíme
    // dál a plnou validaci nechá server komponentám (layout/API),
    // které čtou i in-memory override. Bez cookie edge gate zůstává.
    if (token) {
      return NextResponse.next();
    }
    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: "Nepřihlášeno — session chybí, vypršela nebo je neplatná" },
        },
        { status: 401 },
      );
    }
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const response = NextResponse.next();
  // bezpečnostní hlavičky (A9.1): admin se nikdy nesmí renderovat v iframe
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "no-referrer");
  // pro breadcrumbs a scoped nav shell layoutu
  response.headers.set("x-pathname", pathname);
  const match = pathname.match(/^\/admin\/projects\/([^/]+)/);
  if (match) {
    response.headers.set("x-project-id", match[1]);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
