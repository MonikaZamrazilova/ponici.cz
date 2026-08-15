import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
vi.stubEnv("VERCEL_PROJECT_ID", "prj_test123");
vi.stubEnv("ADMIN_PROJECTS", "");

const { getVercelConfig, isVercelConfigured, updateAdminPasswordOnVercel } =
  await import("../src/lib/services/vercelEnvService");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("vercelEnvService — konfigurace", () => {
  it("getVercelConfig() čte VERCEL_* env", () => {
    expect(getVercelConfig()).toEqual({
      token: "test-vercel-token",
      projectId: "prj_test123",
      teamId: undefined,
    });
    expect(isVercelConfigured()).toBe(true);
  });

  it("bez VERCEL_* env → null / false", () => {
    const saved = { ...process.env };
    delete process.env.VERCEL_TOKEN;
    try {
      expect(getVercelConfig()).toBeNull();
      expect(isVercelConfigured()).toBe(false);
    } finally {
      process.env.VERCEL_TOKEN = saved.VERCEL_TOKEN;
    }
  });
});

describe("updateAdminPasswordOnVercel", () => {
  it("existující env → PATCH (GET list + PATCH + redeploy best-effort)", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (String(url).includes("/env")) {
          return Promise.resolve(
            jsonResponse({
              envs: [{ id: "env_abc", key: "ADMIN_PASSWORD", target: ["production"] }],
            }),
          );
        }
        if (String(url).includes("/deployments")) {
          return Promise.resolve(jsonResponse({ deployments: [{ uid: "dpl_xyz" }] }));
        }
        if (String(url).includes("/redeploy")) {
          return Promise.resolve(jsonResponse({}, 200));
        }
        return Promise.resolve(jsonResponse({}, 200));
      }) as unknown as typeof fetch,
    );

    const ok = await updateAdminPasswordOnVercel("nove-silne-heslo");
    expect(ok).toBe(true);

    const listCall = calls.find((c) => c.url.includes("/env") && !c.init?.method);
    expect(listCall).toBeDefined();
    const patchCall = calls.find((c) => c.url.includes("/env/env_abc"));
    expect(patchCall?.init?.method).toBe("PATCH");
    const patchBody = JSON.parse(String(patchCall?.init?.body)) as {
      value: string;
      target: string[];
    };
    expect(patchBody.value).toBe("nove-silne-heslo");
    expect(patchBody.target).toContain("production");

    const redeploy = calls.find((c) => c.url.includes("/redeploy"));
    expect(redeploy?.init?.method).toBe("POST");
  });

  it("neexistující env → POST create", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (String(url).includes("/v10/projects") && init?.method === "POST") {
          return Promise.resolve(jsonResponse({ id: "env_new" }, 200));
        }
        if (String(url).includes("/env")) {
          return Promise.resolve(jsonResponse({ envs: [] }));
        }
        return Promise.resolve(jsonResponse({}, 200));
      }) as unknown as typeof fetch,
    );

    const ok = await updateAdminPasswordOnVercel("jine-heslo");
    expect(ok).toBe(true);
    const createCall = calls.find(
      (c) => c.url.includes("/v10/projects") && c.init?.method === "POST",
    );
    const body = JSON.parse(String(createCall?.init?.body)) as {
      key: string;
      value: string;
      type: string;
    };
    expect(body.key).toBe("ADMIN_PASSWORD");
    expect(body.value).toBe("jine-heslo");
    expect(body.type).toBe("encrypted");
  });

  it("chyba Vercel API (500) → AdminError 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("Server Error", { status: 500 })),
      ) as unknown as typeof fetch,
    );

    const { AdminError } = await import("@admin/core");
    await expect(updateAdminPasswordOnVercel("heslo")).rejects.toMatchObject({ status: 502 });
  });

  it("bez Vercel konfigurace → false, žádné API volání (bezpečný fallback)", async () => {
    const saved = { ...process.env };
    delete process.env.VERCEL_TOKEN;
    const fetchSpy = vi.fn(() => Promise.resolve(jsonResponse({})));
    vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
    try {
      const ok = await updateAdminPasswordOnVercel("heslo");
      expect(ok).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      process.env.VERCEL_TOKEN = saved.VERCEL_TOKEN;
    }
  });
});

describe("bezpečnost — žádné tajemství v logech", () => {
  it("token a heslo se nikdy nelogují (žádný console.log/error s hodnotami)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("Server Error", { status: 500 })),
      ) as unknown as typeof fetch,
    );

    const { AdminError } = await import("@admin/core");
    await expect(updateAdminPasswordOnVercel("tajne-heslo-123")).rejects.toMatchObject({
      status: 502,
    });

    for (const spy of [logSpy, errorSpy]) {
      const output = spy.mock.calls.flat().map(String).join(" ");
      expect(output).not.toContain("test-vercel-token");
      expect(output).not.toContain("tajne-heslo-123");
    }
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
