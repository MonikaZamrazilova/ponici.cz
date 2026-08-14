/**
 * Password policy — centrální validace hesel.
 *
 * Bezpečnostní požadavky (security-first, viz master prompt):
 *  - minimálně 12 znaků
 *  - alespoň jedno velké písmeno (A-Z)
 *  - alespoň jedno malé písmeno (a-z)
 *  - alespoň jedna číslice (0-9)
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
  if (password.length < 12) {
    errors.push("Heslo musí mít alespoň 12 znaků");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Heslo musí obsahovat alespoň jedno velké písmeno");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Heslo musí obsahovat alespoň jedno malé písmeno");
  }
  if (!/\d/.test(password)) {
    errors.push("Heslo musí obsahovat alespoň jednu číslici");
  }

  return { ok: errors.length === 0, errors };
}
