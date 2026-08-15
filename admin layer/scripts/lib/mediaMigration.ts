/**
 * Sdílená logika migrace media → Vercel Blob.
 * Používá ji scripts/migrate-media-to-blob.ts i testy.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { put, head } from "@vercel/blob";

/** MIME podle přípony (shodné s apps/admin mediaStore.ts). */
export const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export interface LocalMedia {
  projectId: string;
  filePath: string;
  filename: string;
  id: string; // basename bez přípony — klíčové pro zachování referencí
  ext: string;
  mime: string;
  size: number;
}

export function findMediaFiles(mediaRoot: string): LocalMedia[] {
  const results: LocalMedia[] = [];
  if (!existsSync(mediaRoot)) return results;
  for (const projectId of readdirSync(mediaRoot)) {
    const mediaDir = path.join(mediaRoot, projectId, "media");
    if (!existsSync(mediaDir)) continue;
    for (const filename of readdirSync(mediaDir)) {
      if (filename === ".gitkeep") continue;
      const filePath = path.join(mediaDir, filename);
      if (!statSync(filePath).isFile()) continue;
      const ext = path.extname(filename).toLowerCase();
      const id = path.basename(filename, ext);
      results.push({
        projectId,
        filePath,
        filename,
        id,
        ext,
        mime: EXT_TO_MIME[ext] ?? "application/octet-stream",
        size: statSync(filePath).size,
      });
    }
  }
  return results;
}

/** Cesta v Blobu — stejná konvence jako blobMediaStore (addRandomSuffix: false). */
export function blobPath(media: LocalMedia): string {
  return `ponici-admin/media/${media.id}${media.ext}`;
}

export interface MigrateResult {
  found: number;
  uploaded: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Nahraje soubory do Blobu. Při dryRun jen prochází (bez uploadu).
 * Existující soubor se přeskočí (idempotence). Originály se nemění.
 */
export async function migrateMedia(
  mediaRoot: string,
  opts: { dryRun?: boolean; onLog?: (msg: string) => void } = {},
): Promise<MigrateResult> {
  const log = opts.onLog ?? ((m: string) => console.log(m));
  const files = findMediaFiles(mediaRoot);
  const result: MigrateResult = { found: files.length, uploaded: 0, skipped: 0, errors: [] };

  for (const media of files) {
    const target = blobPath(media);
    log(`  • ${media.projectId}/${media.filename} (${media.mime}, ${media.size} B) → ${target}`);

    if (opts.dryRun) continue;

    try {
      const existing = await head(target).catch(() => null);
      if (existing) {
        log(`    ↦ už existuje — přeskočeno`);
        result.skipped++;
        continue;
      }
      const data = readFileSync(media.filePath);
      await put(target, data, {
        access: "public",
        addRandomSuffix: false, // zachová ID → reference zůstávají funkční
        contentType: media.mime,
      });
      result.uploaded++;
      log(`    ↦ OK`);
    } catch (err) {
      result.errors.push({ file: `${media.projectId}/${media.filename}`, error: String(err) });
      log(`    ↦ CHYBA: ${err instanceof Error ? err.message : err}`);
    }
  }
  return result;
}
