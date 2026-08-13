import "server-only";
import { adminConfig } from "./config";

/**
 * Odesílání e-mailů — Formspree (formulář, na který majitelka dostává
 * e-maily z webu). Výměna providera = nová implementace.
 *
 * MOCK režim: dokud není vyplněno ADMIN_FORMSPREE_ID, kód se jen
 * loguje na server a (v developmentu) vrací v odpovědi API — flow
 * je testovatelné bez skutečného e-mailu. Po doplnění ID se posílá
 * na formulář (schránku) Moniky.
 */

const FORMPREE_URL = "https://formspree.io/f/";

export interface SendResult {
  ok: boolean;
  /** jen vývojový režim — kód pro lokální test */
  devCode?: string;
}

export async function sendResetCodeEmail(email: string, code: string): Promise<SendResult> {
  const formspreeId = adminConfig.formspreeId;
  const isDev = process.env.NODE_ENV === "development";

  if (!formspreeId) {
    // MOCK — kód zatím nikam nechodí
    console.log(`[admin] MOCK kód pro obnovení hesla (${email}): ${code}`);
    return { ok: true, devCode: isDev ? code : undefined };
  }

  const body = new FormData();
  body.set("_subject", "Kód pro obnovení hesla — administrace webu");
  body.set("email", email);
  body.set(
    "message",
    [
      "Dobrý den,",
      "",
      "obdrželi jsme žádost o obnovení hesla do administrace webu.",
      "",
      `Váš ověřovací kód: ${code}`,
      "",
      `Kód platí ${Math.round(adminConfig.resetCodeTtlMs / 60000)} minut. Pokud jste žádost neodesílali, tento e-mail ignorujte.`,
      "",
      "— Administrace webu",
    ].join("\n")
  );

  const res = await fetch(`${FORMPREE_URL}${formspreeId}`, {
    method: "POST",
    body,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[admin] odeslání kódu přes Formspree selhalo: HTTP ${res.status}`);
    return { ok: false };
  }
  return { ok: true };
}
