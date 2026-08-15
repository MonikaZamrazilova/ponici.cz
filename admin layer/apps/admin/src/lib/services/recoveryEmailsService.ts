import "server-only";
import { AdminError } from "@admin/core";
import { githubReadJson, githubUpdateJson } from "../storage/githubJson";
import { appendAudit } from "./auditService";

/**
 * Recovery emails service — příjemci reset kódu pro obnovu hesla.
 *
 * Priorita (1 = nejvyšší):
 *   1. admin konfigurace (GitHub-backed JSON v repu) — více emailů
 *   2. ADMIN_EMAIL env proměnná
 *   3. fallback: monika.zamrazilova@seznam.cz (default owner)
 *
 * Bezpečnost:
 *   - žádný validní email → reset flow bezpečně selže (isResetEnabled=false)
 *   - anti-enumeration: requestReset vrací stejnou odpověď, ať email existuje či ne
 *   - audit nikdy neobsahuje kódy/tokeny/hesla — jen seznam emailů (old/new)
 *   - záměrné vyprázdnění admin konfigurace NENÍ povoleno (musí zůstat fallback)
 */

export const DEFAULT_OWNER_EMAIL = "monika.zamrazilova@seznam.cz";

/** Cesta v repu — admin konfigurace recovery emailů (GitHub Contents API). */
export const RECOVERY_EMAILS_PATH =
  process.env.RECOVERY_EMAILS_PATH ?? "admin layer/content/settings/recovery-emails.json";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizace + validace jednoho emailu. Vrací null pro neplatný. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

/** Validní unikátní emaily z admin konfigurace (ignore prázdné/neplatné). */
export function normalizeEmailList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const email = normalizeEmail(item);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** 1. Admin konfigurace (GitHub-backed) — prázdná, pokud soubor neexistuje. */
export async function loadAdminConfiguredEmails(): Promise<string[]> {
  try {
    const raw = await githubReadJson<unknown>(RECOVERY_EMAILS_PATH, []);
    return normalizeEmailList(raw);
  } catch {
    // GitHub nedostupný → chováme se jako bez admin konfigurace
    return [];
  }
}

/** 2. ADMIN_EMAIL env. */
export function envEmails(): string[] {
  const env = process.env.ADMIN_EMAIL ?? "";
  return normalizeEmailList(env.split(","));
}

/**
 * Kompletní seznam recovery emailů dle priority.
 * Vždy vrátí aspoň default owner (fallback) — nikdy prázdné.
 */
export async function getRecoveryEmails(): Promise<string[]> {
  const admin = await loadAdminConfiguredEmails();
  if (admin.length > 0) return admin;

  const env = envEmails();
  if (env.length > 0) return env;

  return [DEFAULT_OWNER_EMAIL];
}

/** True, pokud je reset flow funkční (existuje aspoň jeden validní email). */
export async function isResetEnabled(): Promise<boolean> {
  return (await getRecoveryEmails()).length > 0;
}

/** Má zadaný email právo žádat o reset? (anti-enumeration-safe) */
export async function isRecoveryEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const emails = await getRecoveryEmails();
  return emails.includes(normalized);
}

/**
 * Uloží admin konfiguraci recovery emailů (GitHub commit).
 * - vyprázdnění je povoleno jen při zachování alespoň jednoho validního emailu
 *   (jinak by reset flow neměl žádného příjemce)
 * - audit: kdo změnil (actor), stará hodnota (bez secrets), nová hodnota
 */
export async function updateRecoveryEmails(rawEmails: unknown, actor: string): Promise<string[]> {
  const emails = normalizeEmailList(rawEmails);
  if (emails.length === 0) {
    throw new AdminError(
      "Vyžadován alespoň jeden platný e-mail pro obnovu hesla (fallback: monika.zamrazilova@seznam.cz)",
      undefined,
      400,
    );
  }

  const previous = await loadAdminConfiguredEmails();

  await githubUpdateJson<unknown[]>(
    RECOVERY_EMAILS_PATH,
    [],
    () => emails,
    "admin(core): update recovery emails",
  );

  await appendAudit({
    projectId: "core",
    action: "settings",
    entityKind: "auth",
    entityId: "recovery-emails",
    summary: `Obnovovací e-maily změněny (${emails.length})`,
    details: {
      actor,
      old: previous.length > 0 ? previous : [DEFAULT_OWNER_EMAIL],
      new: emails,
    },
  }).catch(() => {});

  return emails;
}
