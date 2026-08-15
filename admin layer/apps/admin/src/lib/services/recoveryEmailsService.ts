import "server-only";

/**
 * Recovery email — single-admin model.
 *
 * Jediný administrátorský účet je definovaný přes env proměnnou ADMIN_EMAIL.
 * Tento email je jediný povolený pro obnovu hesla (jediný příjemce reset
 * kódů). Žádná multi-email konfigurace — žádný hardcoded email v kódu.
 *
 * Bezpečnost:
 *   - bez ADMIN_EMAIL je reset flow vypnutý (žádný produkční fallback)
 *   - dev fallback (NODE_ENV=development) slouží jen pro lokální vývoj
 *   - anti-enumeration: requestReset vrací bezpečnou odpověď
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizace + validace emailu. Vrací null pro neplatný. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

/** ADMIN_EMAIL z env — normalizovaný, nebo null. */
export function getAdminEmail(): string | null {
  return normalizeEmail(process.env.ADMIN_EMAIL ?? "");
}

/** True, pokud je reset flow funkční (ADMIN_EMAIL je nakonfigurovaný). */
export async function isResetEnabled(): Promise<boolean> {
  return getAdminEmail() !== null;
}

/** Má zadaný email právo žádat o reset? (jediný admin email) */
export async function isRecoveryEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const admin = getAdminEmail();
  return admin !== null && normalized === admin;
}
