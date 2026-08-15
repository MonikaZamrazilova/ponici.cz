import "server-only";
import type { NextRequest } from "next/server";
import { AdminError } from "@admin/core";

/**
 * Security helpers (A9.1).
 *
 * - CSRF: mutující endpointy vyžadují, aby Origin (pokud je zaslaný —
 *   prohlížeče ho posílají vždy) souhlasil s hostem. Kombinace se
 *   SameSite=Lax cookie brání cross-site requestům. Ne-prohlížečoví
 *   klienti (bez Origin) procházejí — SameSite je nechrání, ale ani
 *   nepotřebují cookie.
 * - Rate limiting: in-memory sliding window (single-instance nasazení).
 */

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser client (curl, API klient)
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AdminError("Neplatný Origin", undefined, 403);
  }
  // Za reverzním proxy (single-origin: web + admin na jednom portu)
  // vidí admin skutečný host přes x-forwarded-host.
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.nextUrl.host;
  if (originHost !== host) {
    throw new AdminError("Cross-origin request odmítnut (CSRF)", undefined, 403);
  }
}

const buckets = new Map<string, number[]>();

/** true = limit překročen (odmítnout). Sliding window dle klíče. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Maximální velikost těla v bytech; větší → 413. */
export function assertBodySize(request: NextRequest, maxBytes: number): void {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    throw new AdminError(
      `Payload je příliš velký (max ${Math.round(maxBytes / 1024)} KB)`,
      undefined,
      413,
    );
  }
}
