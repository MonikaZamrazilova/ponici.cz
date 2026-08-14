import { afterEach, describe, expect, it, vi } from "vitest";

// GITHUB env PŘED importem — registry vytvoří GitHub backend adapter
vi.stubEnv("ADMIN_PROJECTS", "ponici");
vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");

const { requireProject } = await import("../src/lib/projects/registry");
const { isGithubConfigured, githubContentRoot } = await import("../src/lib/storage/githubJson");

function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const manifest = {
  app: { name: "Ponici.cz" },
  locales: ["cs"],
  kinds: [
    {
      kind: "site",
      label: "Texty",
      idField: "id",
      listField: "name",
      fields: [{ type: "text", name: "name", label: "Název" }],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registry — GitHub backend (100% cloud)", () => {
  it("isGithubConfigured() = true", () => {
    expect(isGithubConfigured()).toBe(true);
  });

  it("requireProject('ponici') vytvoří GitHub-backed adapter (manifest z GitHub API)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(url).toContain("/contents/admin%20layer/content/projects/ponici/manifest.json");
        return Promise.resolve(jsonResponse({ content: base64(JSON.stringify(manifest)), sha: "s" }));
      }) as unknown as typeof fetch
    );

    const adapter = requireProject("ponici");
    const loaded = await adapter.manifest.load();
    expect(loaded.app.name).toBe("Ponici.cz");
    expect(loaded.kinds).toHaveLength(1);
  });

  it("drafts přes GitHub API (save → PUT na drafts.json)", async () => {
    const puts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as { content: string; message: string };
          expect(body.message).toContain("admin: save");
          puts.push(Buffer.from(body.content, "base64").toString("utf8"));
          return Promise.resolve(jsonResponse({ content: { sha: "s" } }, 200));
        }
        // GET drafts.json — prázdný fallback
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as unknown as typeof fetch
    );

    const adapter = requireProject("ponici");
    await adapter.drafts.save(
      { id: "x1", status: "draft", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      "site"
    );
    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0])).toEqual({ site: { x1: { id: "x1", status: "draft", createdAt: "2026-01-01", updatedAt: "2026-01-01" } } });
  });

  it("githubContentRoot() má default admin layer/content/projects", () => {
    expect(githubContentRoot()).toBe("admin layer/content/projects");
  });
});
