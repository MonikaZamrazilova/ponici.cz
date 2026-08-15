import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NODE_ENV", "production");
vi.stubEnv("ADMIN_PROJECTS", "");

// Resend SDK mock — chování se nastavuje per test přes sendMock
const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: sendMock,
    };
  },
}));

const { sendPasswordResetCode, isEmailConfigured } =
  await import("../src/lib/services/emailService");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

beforeEach(() => {
  sendMock.mockReset();
});

describe("emailService — Resend", () => {
  it("isEmailConfigured(): true jen s RESEND_API_KEY i FROM_EMAIL", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    expect(isEmailConfigured()).toBe(true);

    vi.stubEnv("RESEND_API_KEY", "");
    expect(isEmailConfigured()).toBe(false);

    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "");
    expect(isEmailConfigured()).toBe(false);
  });

  it("odešle email přes Resend s from/subject/text", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const result = await sendPasswordResetCode({
      email: "monika.zamrazilova@seznam.cz",
      code: "123456",
      expiresAt: Date.now() + 600_000,
    });

    expect(result.ok).toBe(true);
    expect(result.devCode).toBeUndefined();
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.from).toBe("admin@ponici.cz");
    expect(payload.to).toBe("monika.zamrazilova@seznam.cz");
    expect(payload.subject).toBe("Obnovení hesla administrátora");
    expect(String(payload.text)).toContain("123456");
  });

  it("chyba Resend (error objekt) → ok:false, žádný devCode v produkci", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    sendMock.mockResolvedValue({ data: null, error: { message: "Invalid API key" } });

    const result = await sendPasswordResetCode({
      email: "owner@example.com",
      code: "123456",
      expiresAt: Date.now() + 600_000,
    });
    expect(result.ok).toBe(false);
    expect(result.devCode).toBeUndefined();
  });

  it("timeout / síťová chyba → ok:false", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    sendMock.mockRejectedValue(new Error("ECONNRESET"));

    const result = await sendPasswordResetCode({
      email: "owner@example.com",
      code: "123456",
      expiresAt: Date.now() + 600_000,
    });
    expect(result.ok).toBe(false);
  });

  it("MOCK bez klíče v produkci: ok:false (žádný tiše prošlý reset)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FROM_EMAIL", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await sendPasswordResetCode({
        email: "owner@example.com",
        code: "123456",
        expiresAt: Date.now() + 600_000,
      });
      expect(result.ok).toBe(false);
      expect(result.devCode).toBeUndefined();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("MOCK bez klíče v dev režimu: ok:true s devCode (lokální test)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FROM_EMAIL", "");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const result = await sendPasswordResetCode({
        email: "owner@example.com",
        code: "654321",
        expiresAt: Date.now() + 600_000,
      });
      expect(result.ok).toBe(true);
      expect(result.devCode).toBe("654321");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("logy neobsahují kód", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    sendMock.mockRejectedValue(new Error("chyba"));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await sendPasswordResetCode({
        email: "owner@example.com",
        code: "999999",
        expiresAt: Date.now() + 600_000,
      });
      const output = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map(String).join(" ");
      expect(output).not.toContain("999999");
      expect(output).not.toContain("owner@example.com");
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
