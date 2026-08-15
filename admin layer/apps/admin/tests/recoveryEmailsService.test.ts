import { afterEach, describe, expect, it, vi } from "vitest";

const { normalizeEmail, getAdminEmail, isResetEnabled, isRecoveryEmail } =
  await import("../src/lib/services/recoveryEmailsService");

const ADMIN = "monika.zamrazilova@seznam.cz";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("recoveryEmailsService — single-admin model", () => {
  it("normalizeEmail: validní → lowercase", () => {
    expect(normalizeEmail(" Monika.Zamrazilova@Seznam.cz ")).toBe(ADMIN);
  });

  it("normalizeEmail: neplatné formáty → null", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("bez-at-znaminka")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });

  it("getAdminEmail: vrací ADMIN_EMAIL z env (normalizovaný)", () => {
    vi.stubEnv("ADMIN_EMAIL", ADMIN);
    expect(getAdminEmail()).toBe(ADMIN);
  });

  it("getAdminEmail: bez ADMIN_EMAIL → null (žádný hardcoded fallback)", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(getAdminEmail()).toBeNull();
  });

  it("isResetEnabled: true s ADMIN_EMAIL", async () => {
    vi.stubEnv("ADMIN_EMAIL", ADMIN);
    expect(await isResetEnabled()).toBe(true);
  });

  it("isResetEnabled: false bez ADMIN_EMAIL (produkce nemá fallback)", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(await isResetEnabled()).toBe(false);
  });

  it("isRecoveryEmail: jediný admin email má oprávnění", async () => {
    vi.stubEnv("ADMIN_EMAIL", ADMIN);
    expect(await isRecoveryEmail(ADMIN)).toBe(true);
  });

  it("isRecoveryEmail: jakýkoli jiný email nemá oprávnění", async () => {
    vi.stubEnv("ADMIN_EMAIL", ADMIN);
    expect(await isRecoveryEmail("cizi@example.com")).toBe(false);
    expect(await isRecoveryEmail("vojanmatyas@gmail.com")).toBe(false);
  });
});
