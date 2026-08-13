import { describe, expect, it } from "vitest";
import { generateResetCode, hashResetCode, RESET_CODE_DIGITS } from "@admin/core";

describe("reset code primitives", () => {
  it("generuje 6místný numerický kód", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateResetCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(RESET_CODE_DIGITS);
    }
  });

  it("generuje různé kódy", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateResetCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("hashuje kód deterministicky a neobsahuje původní kód", async () => {
    const code = "123456";
    const h1 = await hashResetCode(code);
    const h2 = await hashResetCode(code);
    expect(h1).toBe(h2);
    expect(h1).not.toContain(code);
    expect(await hashResetCode("654321")).not.toBe(h1);
  });
});
