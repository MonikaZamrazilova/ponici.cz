import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentManifest, ProjectConfig } from "@admin/core";

// env PŘED importem — GitHub storage backend
vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");
vi.stubEnv("GITHUB_CONTENT_ROOT", "admin layer/content/projects");
vi.stubEnv("ADMIN_PROJECTS", "");

const { createGithubProjectAdapter } = await import("../src/lib/projects/fileAdapter");
const { projectConfig } = await import("@admin/core");
const {
  deleteItem,
  discardDraft,
  getItemVersions,
  publishItem,
  rollbackItem,
  saveDraft,
} = await import("../src/lib/services/itemService");

const manifest: ContentManifest = {
  app: { name: "Test" },
  locales: ["cs"],
  kinds: [
    {
      kind: "note",
      label: "Poznámky",
      idField: "slug",
      listField: "title",
      fields: [
        { type: "text", name: "title", label: "Nadpis", required: true },
        { type: "richtext", name: "body", label: "Obsah" },
      ],
      baseItems: [
        {
          id: "base-note",
          slug: "base-note",
          status: "published",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          title: "Base",
          body: "<p>Base body</p>",
        },
      ],
    },
  ],
};

/**
 * In-memory "GitHub" mock: GET vrací stav souborů z mapy, PUT je aktualizuje.
 * Chová se jako Contents API (base64 + sha), ale bez sítě.
 */
function makeGithubMock(initial: Record<string, unknown> = {}) {
  const files = new Map<string, { content: string; sha: string }>();
  let shaCounter = 0;

  for (const [path, data] of Object.entries(initial)) {
    files.set(path, { content: typeof data === "string" ? data : JSON.stringify(data), sha: `sha${++shaCounter}` });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      void init;
      const pathMatch = String(url).match(/\/contents\/(.+?)(?:\?|$)/);
      const repoPath = decodeURIComponent(pathMatch?.[1] ?? "").replace(/\+/g, " ");
      const method = init?.method ?? "GET";

      if (method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { content: string; message: string; sha?: string };
        const current = files.get(repoPath);
        if (current && current.sha !== body.sha) {
          return Promise.resolve(new Response("Conflict", { status: 409 }));
        }
        files.set(repoPath, {
          content: Buffer.from(body.content, "base64").toString("utf8"),
          sha: `sha${++shaCounter}`,
        });
        return Promise.resolve(
          new Response(JSON.stringify({ content: { sha: `sha${shaCounter}` } }), {
            status: 201,
            headers: { "content-type": "application/json" },
          })
        );
      }

      const file = files.get(repoPath);
      if (!file) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ content: Buffer.from(file.content, "utf8").toString("base64"), sha: file.sha }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    }) as unknown as typeof fetch
  );

  return {
    getContent: (repoPath: string) => files.get(repoPath)?.content ?? null,
    files,
  };
}

function makeAdapter(overrides: Partial<ProjectConfig> = {}) {
  const cfg = projectConfig({
    identity: { id: "testproject", name: "Test Projekt" },
    media: { provider: "none" },
    content: { create: true, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
    ...overrides,
  });
  return createGithubProjectAdapter(cfg, "admin layer/content/projects");
}

const kindDef = manifest.kinds[0];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("itemService — CRUD/publish/rollback (A11.1)", () => {
  it("saveDraft vytvoří draft; druhý save = update (createdAt zůstává)", async () => {
    const mock = makeGithubMock({
      "admin layer/content/projects/testproject/manifest.json": manifest,
    });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    const created = await saveDraft(ctx, kindDef, "nova", { title: "První", body: "<p>a</p>" });
    expect(created.status).toBe("draft");
    const v1 = await getItemVersions(ctx, kindDef, "nova");
    expect(v1?.hasDraft).toBe(true);
    expect(v1?.publishedVersion).toBeNull(); // admin-owned, ještě nepublikováno

    // obsah se uložil přes GitHub (drafts.json)
    const drafts = JSON.parse(
      mock.getContent("admin layer/content/projects/testproject/store/drafts.json") ?? "{}"
    ) as Record<string, Record<string, { createdAt?: string }>>;
    expect(drafts.note?.nova?.createdAt).toBeDefined();

    await saveDraft(ctx, kindDef, "nova", { title: "Druhý", body: "<p>b</p>" });
    const v2 = await getItemVersions(ctx, kindDef, "nova");
    expect(v2?.draft?.title).toBe("Druhý");
    expect(v2?.draft?.createdAt).toBe(created.createdAt);
    void mock;
  });

  it("validace blokuje chybějící povinné pole", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await expect(saveDraft(ctx, kindDef, "bez-nazvu", { body: "<p>x</p>" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("publish: draft → published + draft se smaže; base položka publikuje base", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await saveDraft(ctx, kindDef, "nova", { title: "Nová", body: "<p>n</p>" });
    const published = await publishItem(ctx, kindDef, "nova");
    expect(published.status).toBe("published");

    const versions = await getItemVersions(ctx, kindDef, "nova");
    expect(versions?.hasDraft).toBe(false);
    expect(versions?.publishedVersion?.title).toBe("Nová");

    // base položka — publish bez draftu publikuje base data
    await publishItem(ctx, kindDef, "base-note");
  });

  it("rollback: smaže published override → web se vrátí k base", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await saveDraft(ctx, kindDef, "base-note", { title: "Změněný", body: "<p>x</p>" });
    await publishItem(ctx, kindDef, "base-note");

    await rollbackItem(ctx, kindDef, "base-note");
    const versions = await getItemVersions(ctx, kindDef, "base-note");
    expect(versions?.publishedVersion?.title).toBe("Base");
  });

  it("discardDraft: smaže draft, published zůstává", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await saveDraft(ctx, kindDef, "nova", { title: "Nová", body: "<p>n</p>" });
    await publishItem(ctx, kindDef, "nova");
    // discard po publishi: draft zmizí, published zůstává
    await discardDraft(ctx, kindDef, "nova");
    const versions = await getItemVersions(ctx, kindDef, "nova");
    expect(versions).not.toBeNull();
    expect(versions?.hasDraft).toBe(false);
    expect(versions?.publishedVersion?.title).toBe("Nová");
  });

  it("deleteItem: smaže draft i published (admin-owned)", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await saveDraft(ctx, kindDef, "nova", { title: "Nová", body: "<p>n</p>" });
    await publishItem(ctx, kindDef, "nova");
    await deleteItem(ctx, kindDef, "nova");
    const versions = await getItemVersions(ctx, kindDef, "nova");
    expect(versions).toBeNull();
  });

  it("deleteItem: base položku nelze smazat", async () => {
    makeGithubMock({ "admin layer/content/projects/testproject/manifest.json": manifest });
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    await expect(deleteItem(ctx, kindDef, "base-note")).rejects.toMatchObject({ status: 400 });
  });
});
