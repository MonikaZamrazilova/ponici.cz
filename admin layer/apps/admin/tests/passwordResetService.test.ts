import { afterAll, describe, expect, it, vi } from "vitest";

// env PŘED importem — config a service čtou module-level
vi.stubEnv("ADMIN_PROJECTS", "");
vi.stubEnv("ADMIN_PASSWORD", "puvodni-admin-heslo");
vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
vi.stubEnv("NODE_ENV", "development");
vi.stubEnv("RESET_TOKEN_SECRET", "test-reset-secret");

const { requestReset, verifyResetCode, resetPassword, isResetEnabled } =
  await import("../src/lib/services/passwordResetService");
const { passwordOverride } = await import("../src/lib/storage/passwordStore");
const { createResetToken } = await import("../src/lib/auth/resetToken");
const { hashResetCode } = await import("@admin/core");

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("passwordResetService — serverless 3-krokový flow", () => {
  it("isResetEnabled() podle ADMIN_EMAIL", async () => {
    expect(await isResetEnabled()).toBe(true);
  });

  it("requestReset pro cizí e-mail → anonymní ok:true bez resetToken (anti-enumeration)", async () => {
    const result = await requestReset("cizi@example.com", { allowed: true });
    expect(result.ok).toBe(true);
    expect(result.resetToken).toBeUndefined();
    expect(result.message).toContain("If the account exists");
  });

  it("requestReset pro majitele → vrátí devCode a resetToken (MOCK dev režim)", async () => {
    const result = await requestReset("owner@example.com", { allowed: true });
    expect(result.ok).toBe(true);
    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(result.resetToken).toBeDefined();
    expect(result.resetToken).toContain(".");
  });

  it("requestReset při rate limit → AdminError 429", async () => {
    await expect(requestReset("owner@example.com", { allowed: false })).rejects.toMatchObject({
      status: 429,
    });
  });

  it("verifyResetCode se správným kódem → verifiedToken", async () => {
    const reset = await requestReset("owner@example.com", { allowed: true });
    const result = await verifyResetCode(reset.devCode!, reset.resetToken, { allowed: true });
    expect(result.ok).toBe(true);
    expect(result.verifiedToken).toBeDefined();
  });

  it("verifyResetCode se špatným kódem → AdminError 400", async () => {
    const reset = await requestReset("owner@example.com", { allowed: true });
    await expect(
      verifyResetCode("000000", reset.resetToken, { allowed: true }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("verifyResetCode bez tokenu → AdminError 400", async () => {
    await expect(verifyResetCode("123456", undefined, { allowed: true })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("verifyResetCode s neplatným tokenem (tamper) → AdminError 400", async () => {
    await expect(
      verifyResetCode("123456", "neplatny.token.xyz", { allowed: true }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("verifyResetCode s expirovaným tokenem → AdminError 400", async () => {
    const { createResetToken: createExpired } = await import("../src/lib/auth/resetToken");
    const hash = await hashResetCode("123456");
    // token s okamžitou expirací
    const expired = await createExpired("owner@example.com", hash, -1000);
    await expect(verifyResetCode("123456", expired, { allowed: true })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("verifyResetCode při rate limit → AdminError 429", async () => {
    await expect(verifyResetCode("123456", "token", { allowed: false })).rejects.toMatchObject({
      status: 429,
    });
  });

  it("resetPassword se slabým heslem → AdminError 400 (password policy)", async () => {
    await expect(resetPassword("kratke", "verified-token")).rejects.toMatchObject({ status: 400 });
    await expect(
      resetPassword("aaaaaaaaaaaaaaaa", "verified-token"), // jen malá písmena
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      resetPassword("AAAAAAAAAAAAAAAA", "verified-token"), // jen velká
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      resetPassword("AaAaAaAaAaAa", "verified-token"), // bez číslice
    ).rejects.toMatchObject({ status: 400 });
  });

  it("resetPassword bez verified tokenu → AdminError 400", async () => {
    await expect(resetPassword("NoveHeslo1234!", undefined)).rejects.toMatchObject({ status: 400 });
  });

  it("resetPassword s neplatným verified tokenem → AdminError 400", async () => {
    await expect(resetPassword("NoveHeslo1234!", "neplatny.token")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("kompletní flow: request → verify → reset → heslo změněno", async () => {
    // plný flow bez Vercel env (fallback: in-memory override)
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;

    const reset = await requestReset("owner@example.com", { allowed: true });
    const verified = await verifyResetCode(reset.devCode!, reset.resetToken, { allowed: true });
    const result = await resetPassword("NoveHeslo1234!", verified.verifiedToken);

    expect(result.ok).toBe(true);
    expect(await passwordOverride.get("admin")).toBe("NoveHeslo1234!");
    await passwordOverride.set("admin", ""); // cleanup
  });

  it("kompletní flow: stará session je neplatná po změně hesla", async () => {
    const { signSession, verifySignedSession } = await import("@admin/core");

    // session podepsaná starým heslem
    const oldPayload = { sid: "s1", expiresAt: Date.now() + 60_000, role: "admin" as const };
    const oldToken = await signSession(oldPayload, "puvodni-admin-heslo");
    expect(await verifySignedSession(oldToken, "puvodni-admin-heslo")).not.toBeNull();

    const reset = await requestReset("owner@example.com", { allowed: true });
    const verified = await verifyResetCode(reset.devCode!, reset.resetToken, { allowed: true });
    await resetPassword("JineHeslo5678!", verified.verifiedToken);

    // nové heslo → stará cookie neplatná
    expect(await verifySignedSession(oldToken, "JineHeslo5678!")).toBeNull();
    await passwordOverride.set("admin", "");
  });
});
