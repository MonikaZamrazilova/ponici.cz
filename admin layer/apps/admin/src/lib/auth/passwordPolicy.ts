/**
 * Password policy — centrální validace hesel.
 *
 * Požadavek (UX): minimálně 8 znaků, žádné povinné speciální znaky,
 * žádná povinná čísla. Pouze kontrola délky.
 *
 * Vrací pole chyb — UI zobrazí všechny najednou, server je vynucuje
 * znovu (client validace není ochrana).
 */

export interface PasswordValidationResult {
  ok: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Heslo je povinné");
    return { ok: false, errors };
  }
  if (password.length < 8) {
    errors.push("Heslo musí mít alespoň 8 znaků");
  }

  return { ok: errors.length === 0, errors };
}
