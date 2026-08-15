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

const { sendPasswordResetCode, isEmailConfigured, sendPasswordChangedNotification } =
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

  it("RESET_TEST_EMAIL override: email jde na test adresu (ne admin)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    vi.stubEnv("RESET_TEST_EMAIL", "testovaci@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_456" }, error: null });

    const result = await sendPasswordResetCode({
      email: "monika.zamrazilova@seznam.cz",
      code: "123456",
      expiresAt: Date.now() + 600_000,
    });

    expect(result.ok).toBe(true);
    const payload = sendMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.to).toBe("testovaci@example.com");
  });

  it("bez RESET_TEST_EMAIL: email jde na ADMIN_EMAIL (default)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    vi.stubEnv("RESET_TEST_EMAIL", "");
    sendMock.mockResolvedValue({ data: { id: "email_789" }, error: null });

    await sendPasswordResetCode({
      email: "monika.zamrazilova@seznam.cz",
      code: "123456",
      expiresAt: Date.now() + 600_000,
    });

    const payload = sendMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.to).toBe("monika.zamrazilova@seznam.cz");
  });

  it("recipient mode log je bezpečný (žádný email/kód)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    vi.stubEnv("RESET_TEST_EMAIL", "testovaci@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_abc" }, error: null });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await sendPasswordResetCode({
        email: "monika.zamrazilova@seznam.cz",
        code: "999999",
        expiresAt: Date.now() + 600_000,
      });
      const output = logSpy.mock.calls.flat().map(String).join(" ");
      expect(output).toContain("recipient mode: test override");
      expect(output).not.toContain("999999");
      expect(output).not.toContain("monika.zamrazilova@seznam.cz");
      expect(output).not.toContain("testovaci@example.com");
    } finally {
      logSpy.mockRestore();
    }
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

  it("notifikace o změně hesla — správný subject/body, bez hesla", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    vi.stubEnv("RESET_TEST_EMAIL", "");
    sendMock.mockResolvedValue({ data: { id: "email_notif" }, error: null });

    await sendPasswordChangedNotification("monika.zamrazilova@seznam.cz");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.from).toBe("admin@ponici.cz");
    expect(payload.to).toBe("monika.zamrazilova@seznam.cz");
    expect(payload.subject).toBe("Administrátorské heslo bylo změněno");
    const body = String(payload.text);
    expect(body).toContain("Dobrý den");
    expect(body).toContain("heslo administrátorského účtu bylo právě změněno");
    expect(body).toContain("Pokud jste tuto změnu neprovedli");
    expect(body).toContain("Ponici.cz");
    // nikdy žádné heslo v emailu
    expect(body).not.toContain("heslo:");
    expect(body).not.toContain("abcdefgh");
  });

  it("notifikace o změně hesla: chyba → bezpečný log, žádné vyhození", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FROM_EMAIL", "admin@ponici.cz");
    sendMock.mockResolvedValue({ data: null, error: { message: "API error" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(
        sendPasswordChangedNotification("monika.zamrazilova@seznam.cz"),
      ).resolves.toBeUndefined();
      const output = errorSpy.mock.calls.flat().map(String).join(" ");
      expect(output).toContain("notifikace o změně hesla selhala");
      expect(output).not.toContain("monika.zamrazilova@seznam.cz");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
