import "server-only";
import {
  AdminError,
  generateResetCode,
  hashResetCode,
  verifyPassword,
} from "@admin/core";
import { adminConfig } from "../config";
import { sendResetCodeEmail } from "../email";
import { appendAudit } from "./auditService";
import { passwordOverride } from "../storage/passwordStore";
import { resetCodes } from "../storage/resetCodeStore";
import { sessionStore } from "../storage/sessionStore";
import { isRateLimited } from "../security";

/**
 * Obnova hesla admin role e-mailem (kód).
 *
 * 1. requestReset(email, ip) — vygeneruje kód, uloží hash, pošle e-mail.
 * 2. completeReset(email, code, newPassword) — ověří kód (TTL, pokusy),
 *    uloží nové heslo jako override (gitignored) a odvolá všechny sessiony.
 *
 * Návrat vždy { ok: true } i při neznámém e-mailu — neumožňuje zjistit,
 * jestli e-mail je majitelův. Rate limiting per IP (forgot i reset).
 * Dokud není vyplněno ADMIN_FORMSPREE_ID, odesílání je MOCK (dev log).
 */

const FORGOT_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };
const RESET_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export function isResetEnabled(): boolean {
  return adminConfig.resetEmails.length > 0;
}

/** Má zadaný e-mail právo žádat obnovu hesla? */
function isOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return adminConfig.resetEmails.includes(normalized);
}

export async function requestReset(
  email: string,
  ip: string
): Promise<{ ok: boolean; devCode?: string }> {
  const normalized = email.trim().toLowerCase();
  const owner = isOwnerEmail(normalized);

  if (!isResetEnabled() || !owner) {
    // anonymní odpověď; audit jen při shodě e-mailu (majitel ví, co dělal)
    return { ok: true };
  }

  if (isRateLimited(`forgot:${ip}`, FORGOT_LIMIT.limit, FORGOT_LIMIT.windowMs)) {
    await appendAudit({
      projectId: "core",
      action: "permission",
      entityKind: "auth",
      entityId: "forgot",
      summary: "Rate limit překročen — žádost o obnovu hesla",
      details: { actor: "anonymous", email: normalized },
    }).catch(() => {});
    throw new AdminError("Příliš mnoho žádostí — zkuste to později", undefined, 429);
  }

  const code = generateResetCode();
  const hash = await hashResetCode(code);
  await resetCodes.create(normalized, hash, adminConfig.resetCodeTtlMs);

  const sent = await sendResetCodeEmail(normalized, code);
  if (!sent.ok) {
    throw new AdminError("Odeslání e-mailu se nezdařilo — zkuste to později", undefined, 502);
  }

  await appendAudit({
    projectId: "core",
    action: "settings",
    entityKind: "auth",
    entityId: "forgot",
    summary: "Vyžádáno obnovení hesla (kód odeslán e-mailem)",
    details: { actor: "anonymous", email: normalized },
  }).catch(() => {});

  return { ok: true, devCode: sent.devCode };
}

export async function completeReset(
  email: string,
  code: string,
  newPassword: string,
  ip: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!isResetEnabled() || !isOwnerEmail(normalized)) {
    throw new AdminError("Neplatný požadavek na obnovení hesla", undefined, 400);
  }

  if (isRateLimited(`reset:${ip}`, RESET_LIMIT.limit, RESET_LIMIT.windowMs)) {
    throw new AdminError("Příliš mnoho pokusů — zkuste to později", undefined, 429);
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw new AdminError("Nové heslo musí mít alespoň 8 znaků", undefined, 400);
  }

  const record = await resetCodes.get(normalized);
  if (!record || record.expiresAt <= Date.now()) {
    throw new AdminError("Kód vypršel — vyžádejte si nový", undefined, 400);
  }
  if (record.attempts >= adminConfig.resetMaxAttempts) {
    await resetCodes.remove(normalized);
    throw new AdminError("Příliš mnoho špatných pokusů — vyžádejte si nový kód", undefined, 400);
  }

  const codeHash = await hashResetCode(code.trim());
  if (codeHash !== record.hash) {
    await resetCodes.incrementAttempts(normalized);
    await appendAudit({
      projectId: "core",
      action: "permission",
      entityKind: "auth",
      entityId: "reset",
      summary: "Špatný kód pro obnovení hesla",
      details: { actor: "anonymous", email: normalized },
    }).catch(() => {});
    throw new AdminError("Neplatný kód", undefined, 400);
  }

  if (verifyPassword(newPassword, adminConfig.passwords.admin ?? "")) {
    throw new AdminError("Nové heslo nesmí být stejné jako staré", undefined, 400);
  }

  await passwordOverride.set("admin", newPassword);
  await resetCodes.remove(normalized);
  await sessionStore.revokeAll();

  await appendAudit({
    projectId: "core",
    action: "settings",
    entityKind: "auth",
    entityId: "reset",
    summary: "Heslo admin role změněno (obnova e-mailem)",
    details: { email: normalized },
  }).catch(() => {});
}
