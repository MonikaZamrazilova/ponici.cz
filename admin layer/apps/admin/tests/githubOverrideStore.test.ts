import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");

const { githubOverrideStore } = await import("../src/lib/storage/githubOverrideStore");

const PATH = "admin layer/content/projects/ponici/store/drafts.json";
const URL_GET = `https://api.github.com/repos/test-owner/test-repo/contents/admin%20layer/content/projects/ponici/store/drafts.json?ref=main`;
const URL_PUT = `https://api.github.com/repos/test-owner/test-repo/contents/admin%20layer/content/projects/ponici/store/drafts.json`;

function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const item = {
  id: "n1",
  slug: "n1",
  status: "draft" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "Poznámka",
};

describe("githubOverrideStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save: vytvoří soubor (create bez sha) se strukturou {kind: {id: item}}", async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          expect(url).toBe(URL_PUT);
          putBody = JSON.parse(String(init.body)) as Record<string, unknown>;
          return Promise.resolve(jsonResponse({ content: { sha: "s" } }, 201));
        }
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    await store.save(item, "note");

    const decoded = Buffer.from(String(putBody?.content), "base64").toString("utf8");
    expect(JSON.parse(decoded)).toEqual({ note: { n1: item } });
    expect(putBody?.message).toBe("admin(ponici): save note/n1");
  });

  it("save: update existujícího souboru zachová ostatní položky (sha v PUT)", async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          putBody = JSON.parse(String(init.body)) as Record<string, unknown>;
          return Promise.resolve(jsonResponse({ content: { sha: "s2" } }, 200));
        }
        return Promise.resolve(
          jsonResponse({ content: base64(JSON.stringify({ note: { old: { ...item, id: "old" } } })), sha: "s1" })
        );
      }) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    await store.save(item, "note");

    expect(putBody?.sha).toBe("s1");
    const decoded = Buffer.from(String(putBody?.content), "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Record<string, Record<string, unknown>>;
    expect(Object.keys(parsed.note).sort()).toEqual(["n1", "old"]);
  });

  it("list/get: čte z GitHubu a vrací položky", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(jsonResponse({ content: base64(JSON.stringify({ note: { n1: item } })), sha: "s" }))
      ) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    expect(await store.list("note")).toEqual({ n1: item });
    expect(await store.get("note", "n1")).toEqual(item);
    expect(await store.get("note", "missing")).toBeNull();
    expect(await store.list("other")).toEqual({});
  });

  it("list: prázdný fallback, když soubor neexistuje", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Not Found", { status: 404 }))) as unknown as typeof fetch
    );
    const store = githubOverrideStore(PATH);
    expect(await store.list("note")).toEqual({});
  });

  it("remove: smaže položku a zapíše; vrací true/false", async () => {
    // simulovaná "databáze" — GET vrací stav po posledním PUT
    let db: Record<string, Record<string, unknown>> = {
      note: { n1: item, n2: { ...item, id: "n2" } },
    };
    let dbSha = "s0";
    const puts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          db = JSON.parse(Buffer.from(String(body.content), "base64").toString("utf8")) as Record<string, Record<string, unknown>>;
          dbSha = "s" + (puts.length + 1);
          puts.push(JSON.stringify(db));
          return Promise.resolve(jsonResponse({ content: { sha: dbSha } }, 200));
        }
        return Promise.resolve(jsonResponse({ content: base64(JSON.stringify(db)), sha: dbSha }));
      }) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    expect(await store.remove("note", "n1")).toBe(true);
    expect(await store.remove("note", "nope")).toBe(false);

    expect(Object.keys(JSON.parse(puts[0]).note)).toEqual(["n2"]);
    // druhý remove nenašel položku → stav beze změny
    expect(Object.keys(JSON.parse(puts[1]).note)).toEqual(["n2"]);
  });

  it("remove: commit message obsahuje projekt, akci a entitu", async () => {
    let message: string | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          message = (JSON.parse(String(init.body)) as { message?: string }).message;
          return Promise.resolve(jsonResponse({ content: { sha: "s" } }, 200));
        }
        return Promise.resolve(jsonResponse({ content: base64(JSON.stringify({ note: { n1: item } })), sha: "s" }));
      }) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    await store.remove("note", "n1");
    expect(message).toBe("admin(ponici): remove note/n1");
  });

  it("konflikt 409: retry s čerstvým stavem, transformace se aplikuje znovu", async () => {
    let reads = 0;
    let writes = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          writes++;
          if (writes === 1) return Promise.resolve(new Response("Conflict", { status: 409 }));
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          const content = JSON.parse(Buffer.from(String(body.content), "base64").toString("utf8")) as Record<string, Record<string, unknown>>;
          expect(content.note.n1).toBeDefined();
          expect(content.note.other).toBeDefined(); // cizí změna zachována
          return Promise.resolve(jsonResponse({ content: { sha: "s3" } }, 200));
        }
        reads++;
        if (reads === 1) return Promise.resolve(jsonResponse({ content: base64("{}"), sha: "s1" }));
        // mezi čtením a zápisem se objevila cizí položka
        return Promise.resolve(jsonResponse({ content: base64(JSON.stringify({ note: { other: { ...item, id: "other" } } })), sha: "s2" }));
      }) as unknown as typeof fetch
    );

    const store = githubOverrideStore(PATH);
    await store.save(item, "note");
    expect(writes).toBe(2);
  });
});
