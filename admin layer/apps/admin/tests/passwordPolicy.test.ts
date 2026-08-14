import { describe, expect, it } from "vitest";
import { validatePassword } from "../src/lib/auth/passwordPolicy";

describe("passwordPolicy", () => {
  it("validní heslo (12+, velké, malé, číslice) → ok", () => {
    expect(validatePassword("NoveHeslo1234!")).toEqual({ ok: true, errors: [] });
    expect(validatePassword("Abcdefghijkl1")).toEqual({ ok: true, errors: [] });
  });

  it("prázdné heslo → error", () => {
    const result = validatePassword("");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo je povinné");
  });

  it("méně než 12 znaků → error", () => {
    const result = validatePassword("Aa1");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo musí mít alespoň 12 znaků");
  });

  it("bez velkého písmena → error", () => {
    const result = validatePassword("abcdefghijkl1");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo musí obsahovat alespoň jedno velké písmeno");
  });

  it("bez malého písmena → error", () => {
    const result = validatePassword("ABCDEFGHIJKL1");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo musí obsahovat alespoň jedno malé písmeno");
  });

  it("bez číslice → error", () => {
    const result = validatePassword("Abcdefghijkl!");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo musí obsahovat alespoň jednu číslici");
  });

  it("vrátí všechny chyby najednou", () => {
    const result = validatePassword("abc");
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
