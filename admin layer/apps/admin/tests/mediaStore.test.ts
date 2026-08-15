import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-blob-token");

// mock @vercel/blob — žádná síť; respektuje addRandomSuffix: false
const blobDb = new Map<string, { data: Uint8Array; url: string; size: number }>();
let urlCounter = 0;

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string, data: Uint8Array, opts?: { addRandomSuffix?: boolean }) => {
    const path = opts?.addRandomSuffix === false ? pathname : `${pathname}-${++urlCounter}`;
    const url = `https://blob.vercel-storage.com/${path}`;
    blobDb.set(path, { data, url, size: data.byteLength });
    return { pathname: path, url, size: data.byteLength, uploadedAt: new Date().toISOString() };
  }),
  head: vi.fn(async (pathname: string) => {
    const entry = blobDb.get(pathname);
    if (!entry) return null;
    return {
      pathname,
      url: entry.url,
      size: entry.size,
      uploadedAt: new Date(),
    };
  }),
  list: vi.fn(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
    const all = [...blobDb.entries()]
      .filter(([p]) => p.startsWith(prefix))
      .map(([pathname, entry]) => ({
        pathname,
        url: entry.url,
        size: entry.size,
        uploadedAt: new Date(),
      }));
    // jednoduchá paginace: bez cursoru vše
    return { blobs: all, cursor: cursor ? undefined : undefined };
  }),
  del: vi.fn(async (url: string) => {
    for (const [pathname, entry] of blobDb) {
      if (entry.url === url) blobDb.delete(pathname);
    }
  }),
}));

const { mediaStore } = await import("../src/lib/storage/mediaStore");

afterEach(() => {
  blobDb.clear();
  vi.restoreAllMocks();
});

// get() stahuje data z blob URL — stub fetch
function stubBlobFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      for (const [, entry] of blobDb) {
        if (entry.url === url) {
          return new Response(Buffer.from(entry.data), { status: 200 });
        }
      }
      return new Response("Not Found", { status: 404 });
    }) as unknown as typeof fetch,
  );
}

describe("blobMediaStore — Vercel Blob media", () => {
  it("save: uloží soubor do Blob, vrátí asset s id/url/mime", async () => {
    const asset = await mediaStore.save({
      name: "fotka.png",
      mime: "image/png",
      data: new TextEncoder().encode("png-data"),
    });
    expect(asset.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(asset.name.endsWith(".png")).toBe(true);
    expect(asset.url).toContain("blob.vercel-storage.com");
    expect(asset.mime).toBe("image/png");
    expect(asset.size).toBe(8);
  });

  it("get: najde soubor podle id (bez přípony) a vrátí data", async () => {
    stubBlobFetch();
    const saved = await mediaStore.save({
      name: "fotka.jpg",
      mime: "image/jpeg",
      data: new TextEncoder().encode("jpeg-data"),
    });
    const result = await mediaStore.get(saved.id);
    expect(result).not.toBeNull();
    expect(result?.asset.id).toBe(saved.id);
    expect(result?.asset.mime).toBe("image/jpg"); // přípona .jpg dle MIME_TO_EXT
    expect(new TextDecoder().decode(result?.data)).toBe("jpeg-data");
  });

  it("get: neexistující id → null", async () => {
    expect(await mediaStore.get("neexistuje")).toBeNull();
  });

  it("list: vrátí všechna media", async () => {
    await mediaStore.save({
      name: "a.png",
      mime: "image/png",
      data: new TextEncoder().encode("a"),
    });
    await mediaStore.save({
      name: "b.gif",
      mime: "image/gif",
      data: new TextEncoder().encode("b"),
    });
    const all = await mediaStore.list();
    expect(all).toHaveLength(2);
  });

  it("remove: smaže soubor; druhý remove → false", async () => {
    stubBlobFetch();
    const saved = await mediaStore.save({
      name: "x.png",
      mime: "image/png",
      data: new TextEncoder().encode("x"),
    });
    expect(await mediaStore.remove(saved.id)).toBe(true);
    expect(await mediaStore.remove(saved.id)).toBe(false);
    expect(await mediaStore.list()).toHaveLength(0);
  });
});
