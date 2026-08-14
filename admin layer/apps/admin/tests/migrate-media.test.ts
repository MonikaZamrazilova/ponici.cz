import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// mock @vercel/blob — žádná síť
const blobDb = new Map<string, { data: Buffer; url: string }>();
let urlCounter = 0;
const putMock = vi.fn();
const headMock = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
  head: (...args: unknown[]) => headMock(...args),
}));

const { findMediaFiles, blobPath, migrateMedia } = await import(
  "../../../scripts/lib/mediaMigration.ts"
);

let tmpRoot = "";

beforeEach(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "media-migrate-"));
  // projekt ponici s 2 media soubory + .gitkeep
  const poniciMedia = path.join(tmpRoot, "ponici", "media");
  mkdirSync(poniciMedia, { recursive: true });
  writeFileSync(path.join(poniciMedia, "91f0b2be-15c6-4a1d-8544-8a48d7170e8f.jpg"), Buffer.from("JPEGDATA1"));
  writeFileSync(path.join(poniciMedia, "97ec0593-5dc1-4a4b-b4f7-935afd8c1310.jpg"), Buffer.from("JPEGDATA2"));
  writeFileSync(path.join(poniciMedia, ".gitkeep"), "");

  // projekt demo-web s 1 png
  const demoMedia = path.join(tmpRoot, "demo-web", "media");
  mkdirSync(demoMedia, { recursive: true });
  writeFileSync(path.join(demoMedia, "abc123.png"), Buffer.from("PNGDATA"));

  // projekt bez media
  mkdirSync(path.join(tmpRoot, "sandbox"), { recursive: true });

  putMock.mockClear();
  headMock.mockClear();
  blobDb.clear();
  urlCounter = 0;

  putMock.mockImplementation(async (pathname: string, data: Buffer) => {
    const url = `https://blob.vercel-storage.com/${pathname}-${++urlCounter}`;
    blobDb.set(pathname, { data, url });
    return { pathname, url };
  });
  headMock.mockImplementation(async (pathname: string) => {
    return blobDb.has(pathname) ? { pathname, url: blobDb.get(pathname)!.url } : null;
  });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("migrate-media-to-blob — logika migrace", () => {
  it("najde media soubory napříč projekty, ignoruje .gitkeep a adresáře bez media", () => {
    const files = findMediaFiles(tmpRoot);
    expect(files).toHaveLength(3);
    expect(files.map((f) => f.projectId).sort()).toEqual(["demo-web", "ponici", "ponici"]);
    expect(files.every((f) => f.filename !== ".gitkeep")).toBe(true);
  });

  it("parsuje metadata: id (bez přípony), mime, size", () => {
    const files = findMediaFiles(tmpRoot);
    const jpg = files.find((f) => f.filename.endsWith(".jpg"));
    expect(jpg?.id).toBe("91f0b2be-15c6-4a1d-8544-8a48d7170e8f");
    expect(jpg?.mime).toBe("image/jpeg");
    expect(jpg?.size).toBe(9);
    const png = files.find((f) => f.filename.endsWith(".png"));
    expect(png?.mime).toBe("image/png");
    expect(png?.size).toBe(7);
  });

  it("blobPath zachovává id a používá konvenci mediaStore", () => {
    const files = findMediaFiles(tmpRoot);
    const jpg = files.find((f) => f.filename.endsWith(".jpg"))!;
    expect(blobPath(jpg)).toBe("ponici-admin/media/91f0b2be-15c6-4a1d-8544-8a48d7170e8f.jpg");
  });

  it("dry-run: nic se nenahraje, report má found=3/uploaded=0", async () => {
    const result = await migrateMedia(tmpRoot, { dryRun: true, onLog: () => {} });
    expect(result.found).toBe(3);
    expect(result.uploaded).toBe(0);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("reálný běh: nahraje 3 soubory s addRandomSuffix:false a contentType", async () => {
    const result = await migrateMedia(tmpRoot, { onLog: () => {} });
    expect(result.found).toBe(3);
    expect(result.uploaded).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);

    expect(putMock).toHaveBeenCalledTimes(3);
    const calls = putMock.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain("ponici-admin/media/91f0b2be-15c6-4a1d-8544-8a48d7170e8f.jpg");
    expect(calls).toContain("ponici-admin/media/abc123.png");

    const jpgCall = putMock.mock.calls.find((c) => String(c[0]).endsWith(".jpg"));
    const opts = jpgCall![2] as { addRandomSuffix: boolean; contentType: string };
    expect(opts.addRandomSuffix).toBe(false); // zachová ID
    expect(opts.contentType).toBe("image/jpeg");

    // originály NEMAŽE
    expect(findMediaFiles(tmpRoot)).toHaveLength(3);
  });

  it("idempotence: existující soubor se přeskočí", async () => {
    // soubor už v Blobu je
    blobDb.set("ponici-admin/media/91f0b2be-15c6-4a1d-8544-8a48d7170e8f.jpg", {
      data: Buffer.from("x"),
      url: "https://blob.vercel-storage.com/existing",
    });

    const result = await migrateMedia(tmpRoot, { onLog: () => {} });
    expect(result.uploaded).toBe(2); // 1 přeskočen
    expect(result.skipped).toBe(1);
    expect(putMock).toHaveBeenCalledTimes(2);
  });

  it("chyba uploadu se zaznamená do errors, ostatní pokračují", async () => {
    putMock.mockImplementationOnce(async () => {
      throw new Error("put failed");
    });
    const result = await migrateMedia(tmpRoot, { onLog: () => {} });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain("put failed");
    expect(result.uploaded).toBe(2); // zbylé dva prošly
  });

  it("žádný upload mimo ponici-admin/media/ prefix", async () => {
    await migrateMedia(tmpRoot, { onLog: () => {} });
    for (const call of putMock.mock.calls) {
      expect(String(call[0])).toMatch(/^ponici-admin\/media\//);
    }
  });
});
