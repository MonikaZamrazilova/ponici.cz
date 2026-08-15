import { describe, expect, it } from "vitest";
import { validatePassword } from "../src/lib/auth/passwordPolicy";

describe("passwordPolicy", () => {
  it("validní heslo (8+ znaků, bez povinných znaků) → ok", () => {
    expect(validatePassword("NoveHeslo1234!")).toEqual({ ok: true, errors: [] });
    expect(validatePassword("abcdefgh")).toEqual({ ok: true, errors: [] });
    expect(validatePassword("12345678")).toEqual({ ok: true, errors: [] });
    expect(validatePassword("vsechnomaly")).toEqual({ ok: true, errors: [] });
  });

  it("prázdné heslo → error", () => {
    const result = validatePassword("");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo je povinné");
  });

  it("méně než 8 znaků → error", () => {
    const result = validatePassword("Aa1b2");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Heslo musí mít alespoň 8 znaků");
  });

  it("7 znaků → error", () => {
    const result = validatePassword("abcdefg");
    expect(result.ok).toBe(false);
  });

  it("přesně 8 znaků → ok (žádné speciální požadavky)", () => {
    expect(validatePassword("abcdefgh").ok).toBe(true);
  });
});
