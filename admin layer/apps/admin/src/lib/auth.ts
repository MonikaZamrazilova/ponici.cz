import "server-only";
import { cookies } from "next/headers";
import {
  AdminError,
  SESSION_COOKIE,
  hasPermission,
  isAdminEnabled,
  isRole,
  signSession,
  uid,
  verifyPassword,
  verifySignedSession,
  type Permission,
  type Role,
  type SessionPayload,
} from "@admin/core";
import { adminConfig } from "./config";
import { appendAudit } from "./services/auditService";
import { passwordOverride } from "./storage/passwordStore";

/**
 * Auth / autorizace — session management a centralizované permission checks.
 *
 * Role se určí podle toho, které heslo (admin/editor/viewer) se shoduje.
 * Session payload nese podepsanou roli (HMAC) — tamper-proof.
 *
 * Jediné místo enforcementu: requirePermission / requireAnyPermission /
 * canPermission. Používají je API handlery i serverové komponenty;
 * UI (Can/usePermissions) jen reflektuje stejná pravidla.
 */

export async function login(password: string): Promise<boolean> {
  const entries = Object.entries(await effectivePasswords()) as [Role, string | undefined][];
  const match = entries.find(([, expected]) => expected && verifyPassword(password, expected));
  if (!match) {
    void appendAudit({
      projectId: "core",
      action: "failed_login",
      entityKind: "session",
      entityId: "login",
      summary: "Neúspěšné přihlášení",
      details: { actor: "anonymous" },
    }).catch(() => {});
    return false;
  }
  const role = match[0];
  const ttlMs = adminConfig.sessionTtlMs;

  const sid = uid();
  const payload: SessionPayload = { sid, expiresAt: Date.now() + ttlMs, role };
  // Podepsaná cookie je jediný zdroj session (stateless store — žádný fs).
  const token = await signSession(payload, match[1] as string);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(ttlMs / 1000),
    path: "/",
  });

  // Audit je best-effort — selhání (GitHub výpadek) NESMÍ shodit login.
  void appendAudit({
    projectId: "core",
    action: "login",
    entityKind: "session",
    entityId: sid,
    summary: `Přihlášen uživatel s rolí ${role}`,
    details: { role },
  }).catch(() => {});
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  let role: string | undefined;
  if (token) {
    const payload = await resolveSession(token);
    if (payload) {
      role = payload.role;
    }
  }
  // smazání cookie = lokální odvolání; ukradená cookie platí do expirace
  // (stateless store nemá jak odvolat jednotlivou session)
  store.delete(SESSION_COOKIE);

  // Audit je best-effort — selhání NESMÍ shodit logout.
  void appendAudit({
    projectId: "core",
    action: "logout",
    entityKind: "session",
    entityId: role ?? "unknown",
    summary: role ? `Odhlášen uživatel s rolí ${role}` : "Odhlášení (neplatná session)",
    details: role ? { role } : undefined,
  }).catch(() => {});
}

/**
 * Plná serverová validace: podpis (kterýmkoliv heslem role) + expiry.
 * Cookie je jediný zdroj — podepsaný payload { sid, expiresAt, role }
 * je tamper-proof a edge-safe ověřitelný. Žádný server-side storage.
 */
export async function resolveSession(token: string): Promise<SessionPayload | null> {
  const passwords = Object.values(await effectivePasswords()).filter(Boolean) as string[];
  if (passwords.length === 0) return null;
  for (const password of passwords) {
    const payload = await verifySignedSession(token, password);
    if (payload) return payload;
  }
  return null;
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveSession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AdminError("Session vypršela nebo je neplatná", undefined, 401);
  }
  return session;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

/* ─────────────── centralizované permission checks ─────────────── */

/**
 * Vyhodí 403, pokud role session nemá dané oprávnění.
 * Při `mutating: true` se odmítnutí audituje (permission denial).
 */
export async function requirePermission(
  permission: Permission,
  options?: { mutating?: boolean; projectId?: string; entity?: string }
): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) {
    if (options?.mutating) {
      void appendAudit({
        projectId: options.projectId ?? "core",
        action: "permission",
        entityKind: "acl",
        entityId: options.entity ?? permission,
        summary: `Odmítnuta operace: ${permission} (role ${session.role})`,
        details: { permission, role: session.role },
      }).catch(() => {});
    }
    throw new AdminError("Nemáte oprávnění k této operaci", undefined, 403);
  }
}

/** Vyhodí 403, pokud role session nemá ani jedno z oprávnění. */
export async function requireAnyPermission(
  permissions: Permission[],
  options?: { mutating?: boolean; projectId?: string; entity?: string }
): Promise<void> {
  const session = await requireSession();
  if (!permissions.some((permission) => hasPermission(session.role, permission))) {
    if (options?.mutating) {
      void appendAudit({
        projectId: options.projectId ?? "core",
        action: "permission",
        entityKind: "acl",
        entityId: options.entity ?? permissions.join("|"),
        summary: `Odmítnuta operace: ${permissions.join("|")} (role ${session.role})`,
        details: { permissions, role: session.role },
      }).catch(() => {});
    }
    throw new AdminError("Nemáte oprávnění k této operaci", undefined, 403);
  }
}

/** Boolean varianta pro serverové komponenty (stránky). */
export async function canPermission(permission: Permission): Promise<boolean> {
  const session = await getSession();
  return session ? hasPermission(session.role, permission) : false;
}

function isConfigured(): boolean {
  return Object.values(adminConfig.passwords).some(isAdminEnabled);
}

/**
 * Efektivní hesla rolí: runtime override (změna hesla v adminu,
 * gitignored) má přednost před env proměnnými. Vždy async — override
 * store se čte z disku.
 */
async function effectivePasswords(): Promise<Record<Role, string | undefined>> {
  const entries = Object.entries(adminConfig.passwords) as [Role, string | undefined][];
  const result = {} as Record<Role, string | undefined>;
  for (const [role, envPassword] of entries) {
    result[role] = (await passwordOverride.get(role)) ?? envPassword;
  }
  return result;
}
