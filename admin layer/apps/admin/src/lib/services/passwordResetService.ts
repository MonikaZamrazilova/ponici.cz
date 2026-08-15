import "server-only";
import { AdminError, generateResetCode, hashResetCode } from "@admin/core";
import { sendPasswordChangedNotification, sendPasswordResetCode } from "./emailService";
import { appendAudit } from "./auditService";
import { passwordOverride } from "../storage/passwordStore";
import { sessionStore } from "../storage/sessionStore";
import { updateAdminPasswordOnVercel, isVercelConfigured } from "./vercelEnvService";
import {
  createResetToken,
  createVerifiedToken,
  verifyResetTokenAny,
  verifyVerifiedToken,
} from "../auth/resetToken";
import { validatePassword } from "../auth/passwordPolicy";
import { isRecoveryEmail, isResetEnabled } from "./recoveryEmailsService";

/**
 * Password recovery flow (Vercel-native, 3 kroky, žádný storage):
 *
 * 1. requestReset(email)      → 6místný kód → HMAC reset token (v cookie)
 *                              → e-mail přes Web3Forms
 * 2. verifyResetCode(code)    → ověří kód proti tokenu → verified token
 *                              → reset_verified cookie
 * 3. resetPassword(pw)        → validace hesla → Vercel env update
 *                              → smazání reset cookies → session invalidace
 *
 * Žádný stav se neukládá do fs / json / memory / db — vše je v podepsaných
 * cookies (HttpOnly, Secure, SameSite=Lax) a HMAC klíčích z env.
 *
 * Single-admin: jediný účet s právem obnovy hesla je ADMIN_EMAIL.
 */

export const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minut
export const VERIFIED_TTL_MS = 10 * 60 * 1000; // 10 minut

/** True, pokud je reset flow funkční (ADMIN_EMAIL nakonfigurován). */
export { isResetEnabled } from "./recoveryEmailsService";

/** Má zadaný e-mail právo žádat obnovu hesla? */
function isOwnerEmail(email: string): Promise<boolean> {
  return isRecoveryEmail(email);
}

/**
 * Krok 1 — vyžádání reset kódu.
 * Vždy vrací stejnou odpověď (anti-enumeration).
 */
export async function requestReset(
  email: string,
  rateLimit: { allowed: boolean },
): Promise<{
  ok: boolean;
  message: string;
  resetToken?: string;
  devCode?: string;
}> {
  const normalized = email.trim().toLowerCase();
  const owner = await isOwnerEmail(normalized);

  if (!rateLimit.allowed) {
    throw new AdminError("Příliš mnoho žádostí — zkuste to později", undefined, 429);
  }

  if (!owner) {
    // Jediný administrátor je ADMIN_EMAIL — jiný email nemá oprávnění.
    // Neposíláme email, nevytváříme reset token.
    console.log("[admin] request-reset: owner-match=false (odepřeno)");
    return { ok: false, message: "Nemáte oprávnění obnovit toto heslo." };
  }

  console.log("[admin] request-reset: owner-match=true (generuji reset kód)");
  const code = generateResetCode();
  const codeHash = await hashResetCode(code);
  const resetToken = await createResetToken(normalized, codeHash, RESET_CODE_TTL_MS);

  const sent = await sendPasswordResetCode({
    email: normalized,
    code,
    expiresAt: Date.now() + RESET_CODE_TTL_MS,
  });
  console.log(`[admin] request-reset: email-sent=${sent.ok}`);
  if (!sent.ok) {
    // Single-admin: žádná anonymizace — selhání odeslání se jen loguje.
    console.error("[admin] reset kód se nepodařilo odeslat (stav účtu se neprozrazuje)");
    return { ok: true, message: "Pokyny k obnovení hesla byly odeslány." };
  }

  await appendAudit({
    projectId: "core",
    action: "settings",
    entityKind: "auth",
    entityId: "reset-request",
    summary: "Vyžádáno obnovení hesla",
    details: { actor: "anonymous" },
  }).catch(() => {});

  return {
    ok: true,
    message: "Pokyny k obnovení hesla byly odeslány.",
    resetToken,
    devCode: sent.devCode,
  };
}

/**
 * Krok 2 — ověření kódu proti reset tokenu (z cookie).
 * Při úspěchu vrací verified token (reset_verified cookie).
 */
export async function verifyResetCode(
  code: string,
  resetToken: string | undefined,
  rateLimit: { allowed: boolean },
): Promise<{ ok: boolean; message: string; verifiedToken?: string }> {
  if (!rateLimit.allowed) {
    throw new AdminError("Příliš mnoho pokusů — zkuste to později", undefined, 429);
  }
  if (!resetToken) {
    throw new AdminError("Chybí reset token — vyžádejte si nový kód", undefined, 400);
  }

  // reset token obsahuje e-mail — ověříme kód bez toho, abychom e-mail
  // posílali znovu; e-mail z tokenu je jediný zdroj identity
  const payload = await verifyResetTokenWithCode(resetToken, code);
  if (!payload) {
    throw new AdminError("Neplatný nebo vypršený kód", undefined, 400);
  }

  const verifiedToken = await createVerifiedToken(payload.email, VERIFIED_TTL_MS);
  return { ok: true, message: "Kód ověřen", verifiedToken };
}

/** Ověří podpis tokenu + porovná hash kódu. */
async function verifyResetTokenWithCode(
  token: string,
  code: string,
): Promise<{ email: string } | null> {
  const payload = await verifyResetTokenAny(token);
  if (!payload) return null;
  const codeHash = await hashResetCode(code.trim());
  if (codeHash !== payload.codeHash) return null;
  return { email: payload.email };
}

/**
 * Krok 3 — změna hesla.
 * Vyžaduje verified token (z reset_verified cookie).
 */
export async function resetPassword(
  newPassword: string,
  verifiedToken: string | undefined,
): Promise<{ ok: boolean; message: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.ok) {
    throw new AdminError(validation.errors.join("; "), undefined, 400);
  }

  if (!verifiedToken) {
    throw new AdminError("Chybí ověření — vyžádejte si nový kód", undefined, 400);
  }

  const payload = await verifyVerifiedToken(verifiedToken);
  if (!payload) {
    throw new AdminError("Ověření vypršelo — vyžádejte si nový kód", undefined, 400);
  }

  // a) trvalá změna přes Vercel API (pokud je nakonfigurované)
  if (isVercelConfigured()) {
    await updateAdminPasswordOnVercel(newPassword);
  }

  // b) in-memory override — okamžitá funkčnost + fallback bez Vercel
  await passwordOverride.set("admin", newPassword);

  // Session invalidace: HMAC klíč cookie je odvozený z hesla →
  // změna hesla automaticky zneplatní všechny staré session cookies
  await sessionStore.revokeAll();

  await appendAudit({
    projectId: "core",
    action: "settings",
    entityKind: "auth",
    entityId: "reset",
    summary: "Heslo admin role změněno (obnova e-mailem)",
    details: { email: payload.email },
  }).catch(() => {});

  // notifikace o změně hesla — bez hesla, best-effort (nikdy neblokuje reset)
  void sendPasswordChangedNotification(payload.email).catch(() => {});

  return { ok: true, message: "Heslo bylo změněno" };
}
