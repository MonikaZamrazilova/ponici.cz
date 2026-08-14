import { describe, expect, it, vi } from "vitest";

vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");

const { githubManifestSource } = await import("../src/lib/adapters/githubManifestSource");

const PATH = "admin layer/content/projects/ponici/manifest.json";

function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const validManifest = {
  app: { name: "Ponici.cz" },
  locales: ["cs"],
  kinds: [
    {
      kind: "site",
      label: "Texty webu",
      idField: "id",
      listField: "name",
      fields: [{ type: "text", name: "name", label: "Název" }],
    },
  ],
};

describe("githubManifestSource", () => {
  it("načte a validuje manifest z GitHubu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(jsonResponse({ content: base64(JSON.stringify(validManifest)), sha: "s" }))
      ) as unknown as typeof fetch
    );

    const source = githubManifestSource(PATH);
    const manifest = await source.load();
    expect(manifest.app.name).toBe("Ponici.cz");
    expect(manifest.kinds).toHaveLength(1);
    expect(manifest.kinds[0].kind).toBe("site");
  });

  it("404 → AdminError 404 s jasnou hláškou", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Not Found", { status: 404 }))) as unknown as typeof fetch
    );

    const source = githubManifestSource(PATH);
    await expect(source.load()).rejects.toMatchObject({ status: 404 });
  });

  it("nevalidní manifest → AdminError 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(jsonResponse({ content: base64(JSON.stringify({ app: { name: "x" } })), sha: "s" }))
      ) as unknown as typeof fetch
    );

    const source = githubManifestSource(PATH);
    await expect(source.load()).rejects.toMatchObject({ status: 502 });
  });
});
