import "server-only";
import { del, head, list, put, type ListBlobResultBlob, type PutBlobResult } from "@vercel/blob";
import { uid, type MediaAsset, type MediaStorePort } from "@admin/core";

/**
 * Media store na Vercel Blob — žádný filesystem, žádný lokální disk.
 *
 * Soubory se ukládají do Blob storage; metadata (id, filename, url,
 * uploadedAt, size, type) jsou v Blob objektu samotném — žádná databáze.
 *
 * Env: BLOB_READ_WRITE_TOKEN (Vercel Blob Store credentials, server-only)
 *
 * Bezpečnost:
 *  - validace MIME (allowlist) + velikost (capability) — v mediaService
 *  - bezpečný název: náhodný UUID + přípona z MIME (žádný path traversal)
 *  - URL je veřejně čitelná (web obrázky), ale náhodný UUID brání hádání
 *  - upload/delete vyžadují permission (media:write) — enforcement v routách
 */

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
};

const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime])
);

const MEDIA_PREFIX = "ponici-admin/media/";

/** id = náhodný UUID; pathname obsahuje příponu podle MIME. */
function mediaPath(id: string, ext?: string): string {
  return `${MEDIA_PREFIX}${id}${ext ?? ""}`;
}

/** id z pathname (bez přípony). */
function idFromPathname(pathname: string): string {
  const name = pathname.split("/").pop() ?? "";
  const ext = name.slice(name.lastIndexOf("."));
  return ext && name !== ext ? name.slice(0, name.lastIndexOf(".")) : name;
}

function assetFromPut(blob: PutBlobResult, size: number): MediaAsset {
  return {
    id: idFromPathname(blob.pathname),
    name: blob.pathname.split("/").pop() ?? blob.pathname,
    url: blob.url,
    mime: EXT_TO_MIME[blob.pathname.slice(blob.pathname.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream",
    size,
    createdAt: new Date().toISOString(),
  };
}

function assetFromList(blob: ListBlobResultBlob): MediaAsset {
  return {
    id: idFromPathname(blob.pathname),
    name: blob.pathname.split("/").pop() ?? blob.pathname,
    url: blob.url,
    mime: EXT_TO_MIME[blob.pathname.slice(blob.pathname.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream",
    size: blob.size,
    createdAt: blob.uploadedAt.toISOString(),
  };
}

/** Media store na Vercel Blob — implementuje MediaStorePort. */
export function blobMediaStore(): MediaStorePort {
  return {
    async list(): Promise<MediaAsset[]> {
      const blobs: ListBlobResultBlob[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: MEDIA_PREFIX, cursor });
        blobs.push(...page.blobs);
        cursor = page.cursor;
      } while (cursor);
      return blobs.map(assetFromList);
    },

    async get(id): Promise<{ asset: MediaAsset; data: Uint8Array } | null> {
      // id je UUID bez přípony — najdeme asset přes list (má url)
      const all = await this.list();
      const match = all.find((m) => m.id === id);
      if (!match) return null;
      const res = await fetch(match.url);
      if (!res.ok) return null;
      return { asset: match, data: new Uint8Array(await res.arrayBuffer()) };
    },

    async save(file): Promise<MediaAsset> {
      const id = uid();
      const ext = MIME_TO_EXT[file.mime] ?? ".bin";
      const blob = await put(mediaPath(id, ext), Buffer.from(file.data), {
        access: "public",
        addRandomSuffix: false,
        contentType: file.mime,
      });
      return assetFromPut(blob, file.data.byteLength);
    },

    async remove(id): Promise<boolean> {
      const asset = await this.get(id);
      if (!asset) return false;
      await del(asset.asset.url);
      return true;
    },
  };
}

/** Singleton — jeden media store pro celou aplikaci. */
export const mediaStore: MediaStorePort = blobMediaStore();

export { MIME_TO_EXT };
