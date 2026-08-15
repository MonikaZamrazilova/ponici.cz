import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaAsset, MediaStorePort, ProjectAdapter } from "@admin/core";

// env PŘED importem — GitHub audit store backend
vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");
vi.stubEnv("GITHUB_AUDIT_PATH", "admin layer/content/audit/central.jsonl");

const { saveMedia, removeMedia, listMedia } = await import("../src/lib/services/mediaService");

const asset: MediaAsset = {
  id: "a1",
  name: "foto.jpg",
  url: "https://blob.vercel-storage.com/ponici-admin/media/a1.jpg",
  mime: "image/jpeg",
  size: 1234,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function makeAdapter(
  overrides: { mediaEnabled?: boolean; store?: Partial<MediaStorePort> } = {},
): ProjectAdapter {
  const store: MediaStorePort = {
    async list() {
      return [asset];
    },
    async get(id) {
      return id === asset.id ? { asset, data: new Uint8Array() } : null;
    },
    async save(file) {
      return { ...asset, name: file.name, mime: file.mime, size: file.data.byteLength };
    },
    async remove(id) {
      return id === asset.id;
    },
    ...overrides.store,
  };
  return {
    identity: { id: "testproject", name: "Test" },
    manifest: { app: { name: "Test" }, locales: ["cs"], kinds: [] },
    capabilities: {
      content: { create: true, edit: true, publish: true, discard: true, delete: true },
      media: {
        enabled: overrides.mediaEnabled ?? true,
        maxSizeMb: 20,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      },
      audit: true,
    },
    modules: { content: true, media: true, audit: true },
    features: { preview: false, publishedVersion: false, richText: false, multiselect: false },
    media: overrides.mediaEnabled === false ? undefined : store,
    drafts: {} as ProjectAdapter["drafts"],
    published: {} as ProjectAdapter["published"],
  } as unknown as ProjectAdapter;
}

/** Stub fetch pro GitHub audit store — zachytává PUT (append JSONL). */
function stubAuditFetch(auditLines: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { content: string };
        auditLines.push(Buffer.from(body.content, "base64").toString("utf8"));
        return new Response(JSON.stringify({ content: { sha: "s" } }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mediaService — audit mutací (A8.1)", () => {
  it("saveMedia: nahraje a zapíše audit create s metadata (filename/mime/size)", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);

    const adapter = makeAdapter();
    const result = await saveMedia(adapter, {
      name: "nova-foto.jpg",
      mime: "image/jpeg",
      data: new Uint8Array([1, 2, 3]),
    });
    expect(result.id).toBe("a1");

    // audit je fire-and-forget — počkáme na mikrotask
    await new Promise((resolve) => setTimeout(resolve, 0));
    const last = auditLines[auditLines.length - 1];
    const event = JSON.parse(last) as Record<string, unknown>;
    expect(event.action).toBe("create");
    expect(event.entityKind).toBe("media");
    expect(event.details).toMatchObject({ filename: "nova-foto.jpg", mime: "image/jpeg", size: 3 });
    // audit NIKDY neobsahuje URL ani credentials
    expect(JSON.stringify(event)).not.toContain("blob.vercel-storage.com");
    expect(JSON.stringify(event)).not.toContain("http");
    expect(Object.keys((event.details ?? {}) as object)).toEqual(["filename", "mime", "size"]);
  });

  it("removeMedia: smaže a zapíše audit delete s názvem souboru", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);

    const adapter = makeAdapter();
    expect(await removeMedia(adapter, "a1")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const event = JSON.parse(auditLines[auditLines.length - 1]) as Record<string, unknown>;
    expect(event.action).toBe("delete");
    expect(event.entityKind).toBe("media");
    expect(event.entityId).toBe("a1");
    expect(JSON.stringify(event)).not.toContain("http");
  });

  it("saveMedia: bez media capability → 403 (permission denied)", async () => {
    const adapter = makeAdapter({ mediaEnabled: false });
    await expect(
      saveMedia(adapter, { name: "x.jpg", mime: "image/jpeg", data: new Uint8Array([1]) }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("removeMedia: bez media capability → 403 (permission denied)", async () => {
    const adapter = makeAdapter({ mediaEnabled: false });
    await expect(removeMedia(adapter, "a1")).rejects.toMatchObject({ status: 403 });
  });

  it("saveMedia: nepovolený MIME → chyba bez auditu", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);
    const adapter = makeAdapter();
    await expect(
      saveMedia(adapter, { name: "x.mp4", mime: "video/mp4", data: new Uint8Array([1]) }),
    ).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auditLines).toHaveLength(0);
  });

  it("saveMedia: Blob put selže → chyba se propaguje, žádný audit", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);
    const adapter = makeAdapter({
      store: {
        async save() {
          throw new Error("Blob store unavailable (500)");
        },
      },
    });
    await expect(
      saveMedia(adapter, { name: "x.jpg", mime: "image/jpeg", data: new Uint8Array([1]) }),
    ).rejects.toThrow("Blob store unavailable");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auditLines).toHaveLength(0);
  });

  it("removeMedia: Blob del selže → chyba se propaguje, žádný audit", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);
    const adapter = makeAdapter({
      store: {
        async remove() {
          throw new Error("Blob delete failed (502)");
        },
      },
    });
    await expect(removeMedia(adapter, "a1")).rejects.toThrow("Blob delete failed");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auditLines).toHaveLength(0);
  });

  it("removeMedia: neexistující id → false, žádný audit", async () => {
    const auditLines: string[] = [];
    stubAuditFetch(auditLines);
    const adapter = makeAdapter();
    expect(await removeMedia(adapter, "nope")).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auditLines).toHaveLength(0);
  });

  it("listMedia: vrací assety z Blob", async () => {
    const adapter = makeAdapter();
    const list = await listMedia(adapter);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a1");
  });

  it("listMedia: Blob list selže → chyba se propaguje", async () => {
    const adapter = makeAdapter({
      store: {
        async list() {
          throw new Error("Blob list failed (503)");
        },
      },
    });
    await expect(listMedia(adapter)).rejects.toThrow("Blob list failed");
  });
});
