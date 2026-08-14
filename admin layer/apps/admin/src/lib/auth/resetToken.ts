import "server-only";

/**
 * Signed token utility — kryptograficky podepsané tokeny pro reset flow.
 *
 * Vše stateless: payload je HMAC-SHA256 podepsaný, expirace žije v tokenu.
 * Žádný filesystem, žádná databáze, žádná memory store — token je cookie.
 *
 * Formát: base64url(payload) + "." + base64url(HMAC-SHA256(payload))
 * Klíč: odvozený z RESET_TOKEN_SECRET (server-only env) — reset tokeny
 * NESDÍLEJÍ klíč se session cookies (separace odpovědnosti).
 *
 * Bezpečnostní vlastnosti:
 *  - payload nelze číst klientem? NE — base64url je čitelný. Proto payload
 *    nikdy neobsahuje plaintext kód ani heslo, jen HASH kódu.
 *  - payload nelze modifikovat (podpis)
 *  - expirace je součást podpisu (nelze prodloužit)
 */

const TOKEN_CONTEXT = "ponici-admin-reset:";

export interface ResetTokenPayload {
  /** kanonizovaný e-mail (lowercase) */
  email: string;
  /** sha256 hash kódu — plaintext kód nikdy neleží v tokenu */
  codeHash: string;
  /** epoch ms vypršení */
  expiresAt: number;
  /** epoch ms vytvoření */
  createdAt: number;
}

export interface VerifiedTokenPayload {
  email: string;
  expiresAt: number;
  createdAt: number;
}

/* ─────────────── krypto primitiva ─────────────── */

function toBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", toBuffer(value));
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * HMAC klíč z RESET_TOKEN_SECRET. Fallback pro development: derivace
 * z ADMIN_PASSWORD (reset flow vyžaduje funkční admin, takže existuje).
 * V production MUSÍ být RESET_TOKEN_SECRET nastaven — bez něj reset nejde.
 */
async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.RESET_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("Chybí RESET_TOKEN_SECRET — nelze podepsat reset token");
  }
  const keyBytes = new Uint8Array(await sha256(TOKEN_CONTEXT + secret));
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign<T extends object>(payload: T): Promise<string> {
  const raw = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, toBuffer(raw)));
  return `${raw}.${b64urlEncode(sig)}`;
}

/**
 * Ověří podpis a expiraci. Vrací payload, nebo null při:
 * neplatném podpisu, poškozeném formátu, expiraci.
 */
async function verify<T extends { expiresAt: number }>(token: string): Promise<T | null> {
  const [raw, sigB64] = token.split(".");
  if (!raw || !sigB64) return null;
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, b64urlDecode(sigB64), toBuffer(raw));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(raw))) as T;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ─────────────── reset kód token (krok 1) ─────────────── */

/** Vystaví reset token nesoucí hash kódu + expiraci. */
export async function createResetToken(
  email: string,
  codeHash: string,
  ttlMs: number
): Promise<string> {
  return sign<ResetTokenPayload>({
    email: email.trim().toLowerCase(),
    codeHash,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
}

/** Ověří reset token a vrátí payload (podpis + expirace + e-mail shoda). */
export async function verifyResetToken(
  token: string,
  email: string
): Promise<ResetTokenPayload | null> {
  const payload = await verify<ResetTokenPayload>(token);
  if (!payload) return null;
  if (payload.email !== email.trim().toLowerCase()) return null;
  return payload;
}

/** Ověří reset token bez e-mailové shody — e-mail se čte z payloadu. */
export async function verifyResetTokenAny(token: string): Promise<ResetTokenPayload | null> {
  return verify<ResetTokenPayload>(token);
}

/* ─────────────── verified token (krok 2 → 3) ─────────────── */

/** Vystaví "verified" token — prokazuje úspěšné ověření kódu. */
export async function createVerifiedToken(email: string, ttlMs: number): Promise<string> {
  return sign<VerifiedTokenPayload>({
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
}

/** Ověří verified token. */
export async function verifyVerifiedToken(
  token: string,
  email?: string
): Promise<VerifiedTokenPayload | null> {
  const payload = await verify<VerifiedTokenPayload>(token);
  if (!payload) return null;
  if (email && payload.email !== email.trim().toLowerCase()) return null;
  return payload;
}

/* ─────────────── rate limit token (bez databáze) ─────────────── */

export interface RateLimitPayload {
  /** akce, kterou limitujeme (namespace — token se nesmí zneužívat napříč) */
  action: string;
  /** pole epoch ms pokusů (nejstarší se čistí při každém requestu) */
  attempts: number[];
  expiresAt: number;
}

/** Ověří a případně aktualizuje rate limit token. */
export async function checkRateLimit(
  token: string | undefined,
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; nextToken?: string }> {
  const now = Date.now();
  const cutoff = now - windowMs;

  let payload: RateLimitPayload | null = null;
  if (token) {
    payload = await verify<RateLimitPayload>(token);
  }
  if (!payload || payload.action !== action) {
    payload = { action, attempts: [], expiresAt: now + windowMs };
  }

  const fresh = payload.attempts.filter((t) => t > cutoff);
  if (fresh.length >= maxAttempts) {
    return { allowed: false };
  }

  fresh.push(now);
  const nextToken = await sign<RateLimitPayload>({
    action,
    attempts: fresh,
    expiresAt: now + windowMs,
  });
  return { allowed: true, nextToken };
}
