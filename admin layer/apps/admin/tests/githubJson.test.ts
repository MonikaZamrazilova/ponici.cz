import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// env MUSÍ být nastaven před importem githubJson (githubRepo čte process.env)
vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");

const { githubRead, githubReadJson, githubUpdateJson, githubRepo } =
  await import("../src/lib/storage/githubJson");

const URL_GET =
  "https://api.github.com/repos/test-owner/test-repo/contents/test/path.json?ref=main";
const URL_PUT = "https://api.github.com/repos/test-owner/test-repo/contents/test/path.json";

function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn(handler) as unknown as typeof fetch);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("githubRepo (env)", () => {
  it("načte konfiguraci z env", () => {
    expect(githubRepo()).toEqual({
      owner: "test-owner",
      repo: "test-repo",
      branch: "main",
      token: "test-token",
    });
  });
});

describe("githubRead", () => {
  it("přečte a dekóduje base64 obsah", async () => {
    mockFetch((url) => {
      expect(url).toBe(URL_GET);
      return Promise.resolve(jsonResponse({ content: base64('{"a":1}'), sha: "sha123" }));
    });
    const file = await githubRead(githubRepo(), "test/path.json");
    expect(file).toEqual({ sha: "sha123", content: '{"a":1}' });
  });

  it("vrátí null při 404", async () => {
    mockFetch(() => Promise.resolve(new Response("Not Found", { status: 404 })));
    expect(await githubRead(githubRepo(), "test/path.json")).toBeNull();
  });

  it("posílá Bearer token a správné hlavičky", async () => {
    let captured: RequestInit | undefined;
    mockFetch((_url, init) => {
      captured = init;
      return Promise.resolve(jsonResponse({ content: base64("{}"), sha: "s" }));
    });
    await githubRead(githubRepo(), "test/path.json");
    const headers = captured?.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer test-token");
    expect(headers["accept"]).toContain("github");
  });
});

describe("githubReadJson", () => {
  it("vrátí fallback, když soubor neexistuje", async () => {
    mockFetch(() => Promise.resolve(new Response("Not Found", { status: 404 })));
    expect(await githubReadJson("test/path.json", { def: true })).toEqual({ def: true });
  });

  it("vrátí fallback při nevalidním JSON", async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ content: base64("not-json"), sha: "s" })));
    expect(await githubReadJson("test/path.json", 42)).toBe(42);
  });
});

describe("githubUpdateJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("vytvoří soubor bez sha (create), vrací false", async () => {
    const puts: Array<{ url: string; init: RequestInit }> = [];
    mockFetch((url, init) => {
      if (init?.method === "PUT") {
        puts.push({ url, init });
        return Promise.resolve(jsonResponse({ content: { sha: "new-sha" } }, 201));
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });

    const existed = await githubUpdateJson(
      "test/path.json",
      {},
      (c) => ({ ...c, n: 1 }),
      "test msg",
    );
    expect(existed).toBe(false);
    expect(puts).toHaveLength(1);
    const body = JSON.parse(String(puts[0].init.body)) as Record<string, unknown>;
    expect(body.sha).toBeUndefined();
    expect(body.message).toBe("test msg");
    expect(body.branch).toBe("main");
    expect(Buffer.from(String(body.content), "base64").toString("utf8")).toBe('{\n  "n": 1\n}\n');
  });

  it("update: čte sha a zapíše s ním, vrací true", async () => {
    let putBody: Record<string, unknown> | undefined;
    mockFetch((_url, init) => {
      if (init?.method === "PUT") {
        putBody = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve(jsonResponse({ content: { sha: "new-sha" } }, 200));
      }
      return Promise.resolve(jsonResponse({ content: base64('{"a":1}'), sha: "old-sha" }));
    });

    const existed = await githubUpdateJson("test/path.json", {}, (c) => ({ ...c, b: 2 }));
    expect(existed).toBe(true);
    expect(putBody?.sha).toBe("old-sha");
  });

  it("konflikt 409: znovu načte, znovu aplikuje transformaci a zapíše", async () => {
    let reads = 0;
    let writes = 0;
    mockFetch((_url, init) => {
      if (init?.method === "PUT") {
        writes++;
        // první zápis konflikt, druhý úspěch
        if (writes === 1) return Promise.resolve(new Response("Conflict", { status: 409 }));
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body.sha).toBe("sha2"); // čerstvá sha z druhé čtení
        const content = Buffer.from(String(body.content), "base64").toString("utf8");
        expect(content).toContain('"c": 3'); // transformace aplikovaná na čerstvý stav
        return Promise.resolve(jsonResponse({ content: { sha: "sha3" } }, 200));
      }
      // GET: první čtení stará verze, druhé (po konfliktu) novější verze
      reads++;
      if (reads === 1)
        return Promise.resolve(jsonResponse({ content: base64('{"a":1}'), sha: "sha1" }));
      return Promise.resolve(jsonResponse({ content: base64('{"a":1,"c":3}'), sha: "sha2" }));
    });

    const result = await githubUpdateJson("test/path.json", {}, (current) => {
      // transformace: zachová cizí pole c, přidá b
      return { ...current, b: 2 };
    });
    expect(result).toBe(true);
    expect(writes).toBe(2);
  });

  it("dva konflikty po sobě → AdminError 409", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "PUT") return Promise.resolve(new Response("Conflict", { status: 409 }));
      return Promise.resolve(jsonResponse({ content: base64("{}"), sha: "s" }));
    });

    const { AdminError } = await import("@admin/core");
    await expect(githubUpdateJson("test/path.json", {}, (c) => c)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("server error → AdminError 502", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "PUT") return Promise.resolve(new Response("Bad", { status: 500 }));
      return Promise.resolve(jsonResponse({ content: base64("{}"), sha: "s" }));
    });

    const { AdminError } = await import("@admin/core");
    await expect(githubUpdateJson("test/path.json", {}, (c) => c)).rejects.toMatchObject({
      status: 502,
    });
  });
});

describe("githubRepo — chybějící env", () => {
  it("bez tokenu vyhodí AdminError 500", async () => {
    const { AdminError } = await import("@admin/core");
    const saved = { ...process.env };
    delete process.env.GITHUB_TOKEN;
    try {
      expect(() => githubRepo()).toThrow(AdminError);
    } finally {
      process.env.GITHUB_TOKEN = saved.GITHUB_TOKEN;
    }
  });
});
