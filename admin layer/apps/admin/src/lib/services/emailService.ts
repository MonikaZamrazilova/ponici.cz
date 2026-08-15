import "server-only";

/**
 * Email delivery přes Resend API — systémové recovery emaily.
 *
 * Resend je server-to-server email API (na rozdíl od Web3Forms, který
 * Cloudflare blokuje pro headless requesty). Doména ponici.cz je
 * ověřená v Resend dashboardu.
 *
 * Env:
 *   RESEND_API_KEY — API klíč (server-only, nikdy na klienta)
 *   FROM_EMAIL     — ověřená odesílací adresa
 *   RESET_TEST_EMAIL — [TEMPORARY] dočasný příjemce pro testování bez
 *                      přístupu k ADMIN_EMAIL (viz REMOVE BEFORE)
 *
 * Bezpečnost:
 *   - nikdy neloguje reset kód, heslo, email ani token (jen stav/statusy)
 *   - žádné ukládání e-mailů
 *   - error handling bez úniku detailů
 *   - žádný hardcoded email ani klíč
 */

const TIMEOUT_MS = 10_000;

export interface SendPasswordResetCodeInput {
  email: string;
  code: string;
  /** epoch ms — kdy kód vyprší */
  expiresAt: number;
}

export interface SendResult {
  ok: boolean;
  /** jen vývojový režim — kód pro lokální test (nikdy v produkci) */
  devCode?: string;
}

/** True, pokud je Resend nakonfigurovaný (API klíč + FROM_EMAIL). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
}

/**
 * REMOVE BEFORE CLIENT HANDOVER — dočasný override příjemce reset emailu.
 * Pouze změní příjemce (to:), NE permission check (ADMIN_EMAIL dál
 * rozhoduje, kdo smí reset spustit). Kód se nikdy neposílá cizím lidem —
 * jen na testovací adresu místo admin adresy.
 */
function resolveRecipient(adminEmail: string): string {
  const testEmail = process.env.RESET_TEST_EMAIL?.trim().toLowerCase();
  if (testEmail) {
    // TODO: REMOVE BEFORE CLIENT HANDOVER — odstranit RESET_TEST_EMAIL
    console.log("[admin] password reset email recipient mode: test override");
    return testEmail;
  }
  console.log("[admin] password reset email recipient mode: admin");
  return adminEmail;
}

function buildEmailBody(code: string, expiresAt: number): string {
  const minutes = Math.max(1, Math.round((expiresAt - Date.now()) / 60_000));
  return [
    "Váš kód pro obnovení hesla administrátora:",
    "",
    code,
    "",
    `Kód je platný ${minutes} minut.`,
    "",
    "Pokud jste obnovení hesla nevyžádali, tento e-mail ignorujte.",
  ].join("\n");
}

export async function sendPasswordResetCode({
  email,
  code,
  expiresAt,
}: SendPasswordResetCodeInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const isDev = process.env.NODE_ENV === "development";

  // Diagnostika (bez hodnoty klíče/emailu): je provider nakonfigurovaný?
  console.log(
    `[admin] email provider configured: ${Boolean(apiKey && from)} (NODE_ENV=${isDev ? "development" : "production"})`,
  );

  if (!apiKey || !from) {
    // MOCK se nikdy nesmí spustit v produkci — reset by tiše prošel bez e-mailu.
    // V dev režimu se kód jen loguje (bezpečné: kód samotný se neloguje).
    if (!isDev) {
      console.error("[admin] Resend není nakonfigurováno (chybí RESEND_API_KEY/FROM_EMAIL)");
      return { ok: false };
    }
    console.log(`[admin] MOCK reset kód (expires ${expiresAt})`);
    return { ok: true, devCode: code };
  }

  try {
    console.log("[admin] Resend send spuštěn");
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const recipient = resolveRecipient(email);

    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: "Obnovení hesla administrátora",
      text: buildEmailBody(code, expiresAt),
    });

    if (error || !data?.id) {
      // bez secrets v logu — jen chybová zpráva od API
      console.error(
        "[admin] Resend odeslání selhalo:",
        error ? String(error.message ?? error) : "neznámá chyba",
      );
      return { ok: false };
    }

    console.log(`[admin] Resend response: id ${data.id}`);
    return { ok: true };
  } catch (err) {
    // timeout / síť — žádná tajemství v logu
    console.error(
      "[admin] Resend odeslání selhalo:",
      err instanceof Error ? err.message : "síťová chyba",
    );
    return { ok: false };
  }
}

/**
 * Notifikace po změně hesla — bez hesla, bez secrets.
 * Best-effort: selhání notifikace nikdy neblokuje reset (jen bezpečný log).
 */
export async function sendPasswordChangedNotification(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const recipient = resolveRecipient(email);
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: "Administrátorské heslo bylo změněno",
      text: [
        "Dobrý den,",
        "",
        "heslo administrátorského účtu bylo právě změněno.",
        "",
        "Pokud jste tuto změnu neprovedli, kontaktujte správce webu.",
        "",
        "Ponici.cz",
      ].join("\n"),
    });
    if (error || !data?.id) {
      // bez secrets v logu — jen chybová zpráva od API
      console.error(
        "[admin] notifikace o změně hesla selhala:",
        error ? String(error.message ?? error) : "neznámá chyba",
      );
      return;
    }
    console.log(`[admin] notifikace o změně hesla odeslána: id ${data.id}`);
  } catch (err) {
    // best-effort — reset NIKDY neblokuje; bez secrets v logu
    console.error(
      "[admin] notifikace o změně hesla selhala:",
      err instanceof Error ? err.message : "síťová chyba",
    );
  }
}
