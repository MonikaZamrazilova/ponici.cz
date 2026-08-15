/**
 * Auth / autorizace — framework-agnostická primitiva (edge-safe, WebCrypto).
 *
 * Session model:
 *  - cookie nese podepsaný payload `{ sid, expiresAt }` (HMAC-SHA256,
 *    klíč odvozený z hesla) — tamper-proof, verifikovatelný na edge;
 *  - na serveru existuje session store (SessionStorePort) — jediný zdroj
 *    pravdy: TTL i odvolání (logout) se kontrolují tam;
 *  - middleware dělá rychlou krypto-kontrolu, citlivé operace dělají
 *    plnou serverovou validaci (podpis + expiry + store).
 */

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dní
const KEY_CONTEXT = "admin-session-key:";

/* ─────────────── role a oprávnění (centralizovaný model) ─────────────── */

export const ROLES = ["admin", "editor", "viewer"] as const;
/** admin = Owner/Admin (vše), editor = obsah + media + audit, viewer = read-only */
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const PERMISSIONS = [
  "content:read",
  "content:create",
  "content:update",
  "content:delete",
  "content:publish",
  "media:read",
  "media:write",
  "settings:read",
  "settings:write",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  editor: [
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
    "content:publish",
    "media:read",
    "media:write",
    "audit:read",
  ],
  viewer: ["content:read", "media:read", "audit:read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function rolePermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/* ─────────────── session payload ─────────────── */

export interface SessionPayload {
  sid: string;
  expiresAt: number; // epoch ms
  role: Role;
}

export function isAdminEnabled(password: string | undefined): boolean {
  return Boolean(password && password.length > 0);
}

/** Konstantní-čas porovnání (bez délkového side-channelu). */
export function verifyPassword(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/* ─────────────── reset hesla — kód a hashování ─────────────── */

export const RESET_CODE_DIGITS = 6;
export const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minut

/** Náhodný 6místný ověřovací kód (vhodný pro e-mail). */
export function generateResetCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
  return String(num % 1_000_000).padStart(RESET_CODE_DIGITS, "0");
}

/** Hash kódu pro uložení (kód samotný se nikdy neukládá). */
export async function hashResetCode(code: string): Promise<string> {
  const digest = await sha256(`reset-code:${code}`);
  return b64urlEncode(new Uint8Array(digest));
}

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
  const b64 =
    value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(password: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(await sha256(KEY_CONTEXT + password));
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** Podepíše payload → cookie hodnota `base64url(payload).base64url(sig)`. */
export async function signSession(payload: SessionPayload, password: string): Promise<string> {
  const raw = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(password);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, toBuffer(raw)));
  return `${raw}.${b64urlEncode(sig)}`;
}

/** Ověří podpis + vypršení. Nepotřebuje store — edge-safe. */
export async function verifySignedSession(
  token: string | undefined,
  password: string | undefined,
): Promise<SessionPayload | null> {
  if (!token || !password) return null;
  const [raw, sigB64] = token.split(".");
  if (!raw || !sigB64) return null;
  try {
    const key = await hmacKey(password);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlDecode(sigB64), toBuffer(raw));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(raw))) as SessionPayload;
    if (typeof payload.sid !== "string" || typeof payload.expiresAt !== "number") return null;
    if (!isRole(payload.role)) return null;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
