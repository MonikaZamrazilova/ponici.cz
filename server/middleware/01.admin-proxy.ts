import { spawn } from "node:child_process";
import net from "node:net";
import { existsSync } from "node:fs";
import path from "node:path";
import { defineEventHandler, getRequestHost, getRequestPath, getRequestURL, proxyRequest, readRawBody } from "h3";

/**
 * Single-origin proxy — admin aplikace na stejném portu jako web ("jako live").
 *
 * Žádné odkazy na adminu nejsou; vstup je skrytý na /admin.
 * Admin běží vzadu na ADMIN_TARGET (default localhost:3101) a sem se
 * předávají jen jeho cesty (/admin, /login, /api, /_next). Vše ostatní
 * (včetně /) slouží web.
 *
 * ADMIN ZAPÍNÁNÍ ON-DEMAND: když admin neběží, middleware ho sám
 * nastartuje (next start z ADMIN_APP_DIR) a počká, až bude ready.
 * Když admin nelze spustit, /admin propadne na webovou routu
 * (přesměrování na ADMIN_URL); /login a /api dostanou jasnou hlášku.
 *
 * x-forwarded-host se nastavuje dynamicky z příchozího requestu, aby
 * CSRF kontrola adminu (assertSameOrigin) viděla skutečný origin.
 */

const ADMIN_TARGET = (process.env.ADMIN_TARGET ?? "http://localhost:3101").replace(/\/$/, "");
const ADMIN_APP_DIR =
  process.env.ADMIN_APP_DIR ?? path.resolve(process.cwd(), "../admin layer/apps/admin");
const ADMIN_PORT = new URL(ADMIN_TARGET).port || "3101";
const NEXT_BIN = path.resolve(ADMIN_APP_DIR, "../../node_modules/next/dist/bin/next");
/** Produkce (Vercel aj.): admin build lokálně neexistuje → jen proxy na ADMIN_TARGET */
const CAN_SPAWN_ADMIN =
  process.env.ADMIN_TARGET !== undefined || existsSync(path.join(ADMIN_APP_DIR, ".next", "BUILD_ID"));

const ADMIN_PATH_PREFIXES = ["/admin", "/login", "/api", "/_next"];

function isAdminPath(path: string): boolean {
  return ADMIN_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/* ─────────────── lazy start adminu ─────────────── */

let startPromise: Promise<boolean> | null = null;
let lastFailAt = 0;
const RETRY_AFTER_FAIL_MS = 30_000;
const START_TIMEOUT_MS = 30_000;
/** produkce: ADMIN_TARGET je explicitní → čekáme na remote admin (i studený start Renderu) */
const ADMIN_TARGET_EXPLICIT = process.env.ADMIN_TARGET !== undefined;
const REMOTE_WAIT_MS = 90_000;

async function isUp(): Promise<boolean> {
  try {
    const res = await fetch(`${ADMIN_TARGET}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function startAdminProcess(): void {
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", ADMIN_PORT], {
    cwd: ADMIN_APP_DIR,
    env: { ...process.env, PORT: ADMIN_PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // živé přeposílání výstupu adminu do logu webu (i MOCK kódy)
  child.stdout.on("data", (d: Buffer) => process.stdout.write(`[admin] ${d}`));
  child.stderr.on("data", (d: Buffer) => process.stderr.write(`[admin] ${d}`));
  child.on("error", (err) => {
    console.error("[admin-proxy] spawn adminu selhal:", err);
  });
  child.on("exit", (code, signal) => {
    console.error(`[admin-proxy] admin skončil (exit=${code}, signal=${signal})`);
  });
}

async function waitForUp(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return isUp();
}

/** Vrací true, když na portu ADMIN_PORT už něco naslouchá. */
async function isPortInUse(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(Number(ADMIN_PORT), "127.0.0.1");
  });
}

/** Zajistí, že admin běží — případně ho nastartuje a počká na ready. */
function ensureAdminRunning(): Promise<boolean> {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    if (await isUp()) return true;
    if (Date.now() - lastFailAt < RETRY_AFTER_FAIL_MS) return false;
    if (ADMIN_TARGET_EXPLICIT) {
      // produkce: počkat na remote admin (studený start Render free tier)
      const up = await waitForUp(REMOTE_WAIT_MS);
      if (!up) lastFailAt = Date.now();
      return up;
    }
    if (!CAN_SPAWN_ADMIN) return false;
    // Port už někdo drží (admin se právě startuje jinde / stará instance) —
    // nespouštět druhý proces (EADDRINUSE), jen počkat na ready.
    if (await isPortInUse()) return waitForUp(START_TIMEOUT_MS);
    try {
      startAdminProcess();
    } catch (err) {
      console.error("[admin-proxy] start adminu selhal:", err);
      lastFailAt = Date.now();
      return false;
    }
    const up = await waitForUp(START_TIMEOUT_MS);
    if (!up) lastFailAt = Date.now();
    return up;
  })().finally(() => {
    startPromise = null;
  });
  return startPromise;
}

/* ─────────────── middleware ─────────────── */

export default defineEventHandler(async (event) => {
  // h3 v2: event.path může obsahovat query string — ořežeme ho
  const path = getRequestPath(event).split("?")[0];
  if (!isAdminPath(path)) return;

  if (!(await ensureAdminRunning())) {
    // Admin nelze spustit. /admin propadne na webovou routu
    // (přesměrování na ADMIN_URL); /login a /api dostanou hlášku.
    if (path === "/admin" || path.startsWith("/admin/")) return undefined;
    const message =
      "Admin aplikaci se nepodařilo spustit. Zkontrolujte produkční build (npm run build -w admin v admin layer/) a zkuste to znovu.";
    if (path.startsWith("/api/")) {
      return new Response(JSON.stringify({ ok: false, error: { message } }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      `<!doctype html><html lang="cs"><head><meta charset="utf-8"/><title>Admin není spuštěn</title></head>` +
        `<body style="margin:0;font-family:system-ui,sans-serif;background:#faf9f6;color:#1c1c1c;display:grid;place-items:center;min-height:100vh">` +
        `<div style="text-align:center;max-width:28rem;padding:2rem">` +
        `<h1 style="font-size:1.5rem;margin:0 0 .75rem">Admin není dostupný</h1>` +
        `<p style="font-size:.9rem;line-height:1.6;color:#5c5244">${message}</p>` +
        `</div></body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const original = getRequestURL(event);
  const target = new URL(original.pathname + original.search, ADMIN_TARGET);

  try {
    // Tělo se bufferuje: když admin odpoví 401/4xx bez přečtení těla
    // (auth middleware), streamovaný body v fetch selže (ECONNRESET)
    // a proxy by spadla na prázdnou 200.
    const method = event.req.method ?? "GET";
    const rawBody = method === "GET" || method === "HEAD"
      ? undefined
      : await readRawBody(event, false).catch(() => undefined);
    const proxied = await proxyRequest(event, target.toString(), {
      fetchOptions: {
        method,
        body: rawBody,
        headers: {
          "x-forwarded-host": getRequestHost(event),
          "x-forwarded-for": event.node.req.socket?.remoteAddress ?? "unknown",
        },
      },
    });
    return proxied;
  } catch (err) {
    console.error(`[admin-proxy] ${path} -> PROXY EXCEPTION: ${(err as Error)?.message}`);
    return undefined;
  }
});
