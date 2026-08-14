import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NODE_ENV", "production");
vi.stubEnv("ADMIN_PROJECTS", "");

const { sendPasswordResetCode, isEmailConfigured } = await import(
  "../src/lib/services/emailService"
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("emailService — Web3Forms", () => {
  it("isEmailConfigured() podle WEB3FORMS_ACCESS_KEY", () => {
    delete process.env.WEB3FORMS_ACCESS_KEY;
    expect(isEmailConfigured()).toBe(false);
    process.env.WEB3FORMS_ACCESS_KEY = "test-key";
    expect(isEmailConfigured()).toBe(true);
    delete process.env.WEB3FORMS_ACCESS_KEY;
  });

  it("odešle POST na Web3Forms s access_key a kódem", async () => {
    process.env.WEB3FORMS_ACCESS_KEY = "test-key";
    let captured: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        captured = { url, init };
        return Promise.resolve(jsonResponse({ success: true }));
      }) as unknown as typeof fetch
    );

    const result = await sendPasswordResetCode({
      email: "owner@example.com",
      code: "123456",
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    expect(result.ok).toBe(true);
    expect(captured?.url).toBe("https://api.web3forms.com/submit");
    const body = JSON.parse(String(captured?.init?.body)) as Record<string, string>;
    expect(body.access_key).toBe("test-key");
    expect(body.subject).toBe("Admin password reset code");
    expect(body.code).toBe("123456");
    expect(body.email).toBe("owner@example.com");
  });

  it("chyba Web3Forms (500) → ok:false, žádný devCode v produkci", async () => {
    process.env.WEB3FORMS_ACCESS_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Server Error", { status: 500 }))) as unknown as typeof fetch
    );

    const result = await sendPasswordResetCode({
      email: "owner@example.com",
      code: "123456",
      expiresAt: Date.now() + 60_000,
    });
    expect(result.ok).toBe(false);
    expect(result.devCode).toBeUndefined();
  });

  it("timeout / síťová chyba → ok:false", async () => {
    process.env.WEB3FORMS_ACCESS_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("fetch failed"))) as unknown as typeof fetch
    );

    const result = await sendPasswordResetCode({
      email: "owner@example.com",
      code: "123456",
      expiresAt: Date.now() + 60_000,
    });
    expect(result.ok).toBe(false);
  });

  it("MOCK bez klíče: ok:true, devCode jen v dev režimu", async () => {
    delete process.env.WEB3FORMS_ACCESS_KEY;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const dev = await sendPasswordResetCode({
        email: "owner@example.com",
        code: "123456",
        expiresAt: Date.now() + 60_000,
      });
      expect(dev.ok).toBe(true);
      // v production NODE_ENV se devCode nevrací
      expect(dev.devCode).toBeUndefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("logy neobsahují kód", async () => {
    process.env.WEB3FORMS_ACCESS_KEY = "test-key";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Server Error", { status: 500 }))) as unknown as typeof fetch
    );
    try {
      await sendPasswordResetCode({
        email: "owner@example.com",
        code: "999999",
        expiresAt: Date.now() + 60_000,
      });
      const output = errorSpy.mock.calls.flat().map(String).join(" ");
      expect(output).not.toContain("999999");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
