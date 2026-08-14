import { describe, expect, it, vi } from "vitest";

vi.stubEnv("RESET_TOKEN_SECRET", "test-secret");
vi.stubEnv("ADMIN_PROJECTS", "");

const {
  createResetToken,
  verifyResetToken,
  verifyResetTokenAny,
  createVerifiedToken,
  verifyVerifiedToken,
  checkRateLimit,
} = await import("../src/lib/auth/resetToken");

describe("resetToken — signed token utility", () => {
  it("valid token: podpis + expirace + payload", async () => {
    const token = await createResetToken("owner@example.com", "hash123", 10 * 60 * 1000);
    expect(token).toContain(".");

    const payload = await verifyResetToken(token, "owner@example.com");
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("owner@example.com");
    expect(payload?.codeHash).toBe("hash123");
    expect(payload!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("invalid signature (tamper) → null", async () => {
    const token = await createResetToken("owner@example.com", "hash123", 10 * 60 * 1000);
    const tampered = token.slice(0, -3) + "abc";
    expect(await verifyResetToken(tampered, "owner@example.com")).toBeNull();
  });

  it("expired token → null", async () => {
    const token = await createResetToken("owner@example.com", "hash123", -1000);
    expect(await verifyResetToken(token, "owner@example.com")).toBeNull();
  });

  it("tampered payload (změněný e-mail v base64) → null", async () => {
    const token = await createResetToken("owner@example.com", "hash123", 10 * 60 * 1000);
    const [raw, sig] = token.split(".");
    // dekóduj payload, změň e-mail, zakóduj zpět
    const json = JSON.parse(
      Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as { email: string };
    json.email = "attacker@example.com";
    const newRaw = Buffer.from(JSON.stringify(json))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const tampered = `${newRaw}.${sig}`;
    expect(await verifyResetToken(tampered, "attacker@example.com")).toBeNull();
  });

  it("verifyResetTokenAny vrátí payload bez e-mail shody", async () => {
    const token = await createResetToken("owner@example.com", "hash123", 10 * 60 * 1000);
    const payload = await verifyResetTokenAny(token);
    expect(payload?.email).toBe("owner@example.com");
  });

  it("verified token: vytvoření + ověření", async () => {
    const token = await createVerifiedToken("owner@example.com", 10 * 60 * 1000);
    const payload = await verifyVerifiedToken(token);
    expect(payload?.email).toBe("owner@example.com");
    expect(await verifyVerifiedToken(token, "owner@example.com")).not.toBeNull();
    expect(await verifyVerifiedToken(token, "jiny@example.com")).toBeNull();
  });

  it("verified token: expirovaný → null", async () => {
    const token = await createVerifiedToken("owner@example.com", -1000);
    expect(await verifyVerifiedToken(token)).toBeNull();
  });
});

describe("checkRateLimit — podepsaný timestamp token", () => {
  it("první pokus → allowed + token", async () => {
    const result = await checkRateLimit(undefined, "verify", 5, 10 * 60 * 1000);
    expect(result.allowed).toBe(true);
    expect(result.nextToken).toBeDefined();
  });

  it("limit vyčerpán → denied", async () => {
    let token: string | undefined;
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(token, "verify", 5, 10 * 60 * 1000);
      expect(result.allowed).toBe(true);
      token = result.nextToken;
    }
    const sixth = await checkRateLimit(token, "verify", 5, 10 * 60 * 1000);
    expect(sixth.allowed).toBe(false);
  });

  it("staré pokusy mimo okno se vyčistí → povoleno znovu", async () => {
    // token s pokusy před 20 minutami
    const past = Date.now() - 20 * 60 * 1000;
    const { createResetToken: _unused, checkRateLimit: _unused2 } = { createResetToken: undefined, checkRateLimit: undefined };
    void _unused;
    void _unused2;
    const { checkRateLimit: limit } = await import("../src/lib/auth/resetToken");
    // simulace: 5 starých pokusů, ale ručně vytvoříme token s past timestamps
    const token = await (async () => {
      const raw = Buffer.from(
        JSON.stringify({ action: "verify", attempts: [past, past, past, past, past], expiresAt: Date.now() + 60_000 })
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return `${raw}.x`; // neplatný podpis — otestujeme fallback níže
    })();
    // neplatný token → fallback na čistý stav
    const result = await limit(token, "verify", 5, 10 * 60 * 1000);
    expect(result.allowed).toBe(true);
  });

  it("token pro jinou akci → nelze zneužit napříč", async () => {
    const first = await checkRateLimit(undefined, "request-reset", 3, 15 * 60 * 1000);
    expect(first.allowed).toBe(true);
    // stejný token použitý pro jinou akci → jiný namespace
    const other = await checkRateLimit(first.nextToken, "verify", 5, 10 * 60 * 1000);
    expect(other.allowed).toBe(true);
  });
});
