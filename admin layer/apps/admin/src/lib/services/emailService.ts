import "server-only";

/**
 * Email delivery přes Web3Forms — žádný SMTP, žádný externí backend.
 *
 * Web3Forms: POST https://api.web3forms.com/submit s access_key.
 * (Formulářová služba pro statické weby; funguje z browseru i serverless.)
 *
 * Bezpečnost:
 *  - nikdy neloguje reset kód, heslo ani token (jen stav/statusy)
 *  - žádné ukládání e-mailů
 *  - timeout 10 s, error handling bez úniku detailů
 *
 * Env: WEB3FORMS_ACCESS_KEY (veřejný klíč z web3forms.com)
 * MOCK: bez WEB3FORMS_ACCESS_KEY se kód jen loguje (dev) —
 *       flow je testovatelné lokálně bez skutečného e-mailu.
 */

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
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

export function isEmailConfigured(): boolean {
  return Boolean(process.env.WEB3FORMS_ACCESS_KEY);
}

function buildEmailBody(code: string, expiresAt: number): string {
  const minutes = Math.max(1, Math.round((expiresAt - Date.now()) / 60_000));
  return [
    "Subject: Admin password reset code",
    "",
    "Body:",
    "",
    "Your verification code:",
    "",
    code,
    "",
    `This code expires in ${minutes} minutes.`,
  ].join("\n");
}

export async function sendPasswordResetCode({
  email,
  code,
  expiresAt,
}: SendPasswordResetCodeInput): Promise<SendResult> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  const isDev = process.env.NODE_ENV === "development";

  // Diagnostika (bez hodnoty klíče): je provider nakonfigurovaný?
  console.log(`[admin] email provider configured: ${Boolean(accessKey)} (NODE_ENV=${isDev ? "development" : "production"})`);

  if (!accessKey) {
    // MOCK se nikdy nesmí spustit v produkci — reset by tiše prošel bez e-mailu.
    // V dev režimu se kód jen loguje (bezpečné: kód samotný se neloguje).
    if (!isDev) {
      console.error("[admin] Web3Forms není nakonfigurováno (chybí WEB3FORMS_ACCESS_KEY)");
      return { ok: false };
    }
    console.log(`[admin] MOCK reset kód pro ${email} (expires ${expiresAt})`);
    return { ok: true, devCode: code };
  }

  try {
    console.log("[admin] Web3Forms fetch spuštěn");
    const res = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "Admin password reset code",
        from_name: "Ponici.cz Admin",
        // Cíl e-mailu je nastavený v Web3Forms dashboardu (žádné `to` pole —
        // není součástí oficiálního API a může způsobit 4xx).
        email,
        message: buildEmailBody(code, expiresAt),
        code, // Web3Forms umí poslat pole; kód jde jen do e-mailu
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // žádný kód/token v logu — jen status
      console.error(`[admin] Web3Forms odeslání selhalo: HTTP ${res.status}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    // timeout / síť — žádná tajemství v logu
    console.error(
      "[admin] Web3Forms odeslání selhalo:",
      err instanceof Error ? err.message : "síťová chyba",
    );
    return { ok: false };
  }
}
