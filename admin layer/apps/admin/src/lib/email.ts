import "server-only";
import { adminConfig } from "./config";

/**
 * Odesílání e-mailů — EmailJS REST API (server-side, free 200/měsíc).
 * Kód chodí na e-mail, ke kterému je připojený EmailJS service (majitelka).
 *
 * MOCK režim: dokud nejsou vyplněné EMAILJS_* proměnné, kód se jen
 * loguje na server a (v developmentu) vrací v odpovědi API — flow
 * je testovatelné bez skutečného e-mailu.
 */

const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";

export interface SendResult {
  ok: boolean;
  /** jen vývojový režim — kód pro lokální test */
  devCode?: string;
}

const RESET_CODE_TTL_MIN = Math.round(adminConfig.resetCodeTtlMs / 60000);

function buildResetEmailBody(code: string): string {
  return [
    "Dobrý den,",
    "",
    "obdrželi jsme žádost o obnovení hesla do administrace webu.",
    "",
    `Váš ověřovací kód: ${code}`,
    "",
    `Kód platí ${RESET_CODE_TTL_MIN} minut. Pokud jste žádost neodesílali, tento e-mail ignorujte.`,
    "",
    "— Administrace webu",
  ].join("\n");
}

export async function sendResetCodeEmail(email: string, code: string): Promise<SendResult> {
  const { serviceId, templateId, publicKey, privateKey } = adminConfig.emailjs;
  const isDev = process.env.NODE_ENV === "development";

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    // MOCK — kód zatím nikam nechodí
    console.log(`[admin] MOCK kód pro obnovení hesla (${email}): ${code}`);
    return { ok: true, devCode: isDev ? code : undefined };
  }

  const res = await fetch(EMAILJS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        email,
        code,
        validity: String(RESET_CODE_TTL_MIN),
        message: buildResetEmailBody(code),
      },
    }),
  });

  if (!res.ok) {
    console.error(`[admin] EmailJS odeslání selhalo: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
    return { ok: false };
  }
  return { ok: true };
}
