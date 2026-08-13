import { promises as fs } from "fs";
import path from "path";
import { uid, type MediaAsset, type MediaStorePort } from "@admin/core";

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

/** Media úložiště na filesystému (content/media/). id = basename souboru. */
export function mediaFsStore(dir: string): MediaStorePort {
  async function files(): Promise<{ name: string; mime: string; size: number; createdAt: string }[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const out = [];
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name);
        const stat = await fs.stat(path.join(dir, entry.name));
        out.push({
          name: entry.name,
          mime: EXT_TO_MIME[ext] ?? "application/octet-stream",
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  return {
    async list() {
      const list = await files();
      return list.map((f) => ({ id: path.parse(f.name).name, ...f }));
    },
    async get(id) {
      const list = await files();
      const match = list.find((f) => path.parse(f.name).name === id);
      if (!match) return null;
      const data = await fs.readFile(path.join(dir, match.name));
      const asset = { id, name: match.name, mime: match.mime, size: match.size, createdAt: match.createdAt };
      return { asset, data: new Uint8Array(data) };
    },
    async save(file) {
      const ext = MIME_TO_EXT[file.mime] ?? path.extname(file.name).toLowerCase();
      const id = uid();
      const filename = `${id}${ext}`;
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), Buffer.from(file.data));
      const asset: MediaAsset = { id, name: filename, mime: file.mime, size: file.data.byteLength, createdAt: new Date().toISOString() };
      return asset;
    },
    async remove(id) {
      const list = await files();
      const match = list.find((f) => path.parse(f.name).name === id);
      if (!match) return false;
      await fs.unlink(path.join(dir, match.name));
      return true;
    },
  };
}
