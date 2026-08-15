/**
 * Jednorázová migrace lokálních media souborů na Vercel Blob.
 *
 * Zdroj:   content/projects/<projectId>/media/*  (filesystem, legacy)
 * Cíl:     Vercel Blob (ponici-admin/media/<id><ext>)
 *
 * Vlastnosti:
 *  - DRY-RUN mód: `--dry-run` jen vypíše, co by se nahrálo
 *  - zachovává ID souborů (basename bez přípony) — existující reference
 *    v obsahu (`/api/projects/<id>/media/<uuid>`) zůstávají funkční
 *  - zachovává metadata: filename, type (MIME), size, projectId
 *  - NEMAZE originály — odstranění je samostatný krok (viz report)
 *  - už existující soubor v Blobu se přeskočí (idempotentní)
 *
 * Spuštění:
 *   BLOB_READ_WRITE_TOKEN=... npm run migrate:media            # reálný běh
 *   BLOB_READ_WRITE_TOKEN=... npm run migrate:media -- --dry-run
 *
 * Žádný soubor se neodešle mimo Vercel Blob (jen @vercel/blob put).
 * Soubory se čtou z lokálního disku (migrace je dev-time nástroj,
 * ne runtime aplikace).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateMedia } from "./lib/mediaMigration.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.resolve(__dirname, "..", "content", "projects");

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  console.log(
    `[migrate-media] Nalezeno: (DRY-RUN: ${DRY_RUN ? "ano" : "ne"}) — zdroj: ${MEDIA_ROOT}`,
  );
  console.log("");

  const result = await migrateMedia(MEDIA_ROOT, { dryRun: DRY_RUN });

  console.log("");
  console.log("========== REPORT ==========");
  console.log(`Nalezeno:           ${result.found}`);
  console.log(`Úspěšně nahráno:    ${result.uploaded}`);
  console.log(`Přeskočeno (máme):  ${result.skipped}`);
  console.log(`Chyby:              ${result.errors.length}`);
  if (result.errors.length) {
    console.log("");
    console.log("Chyby:");
    for (const e of result.errors) console.log(`  ✗ ${e.file}: ${e.error}`);
  }
  if (DRY_RUN) {
    console.log("");
    console.log("DRY-RUN — nic se nenahrálo. Spusťte bez --dry-run pro reálnou migraci.");
  } else {
    console.log("");
    console.log("Doporučení:");
    console.log("  1. Ověřte uploady v dashboardu Vercel (Storage → Blob).");
    console.log("  2. Originály v content/projects/*/media/ NEJSOU smazány.");
    console.log("  3. Po ověření je smažte ručně (nebo gitu):");
    console.log("       git rm 'content/projects/ponici/media/*.jpg'");
    console.log("  4. .gitkeep v media/ adresářích můžete ponechat.");
  }
}

main().catch((err) => {
  console.error("[migrate-media] selhání:", err);
  process.exit(1);
});
