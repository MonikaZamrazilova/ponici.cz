/**
 * Export kontraktu — vygeneruje content/manifest.json na úrovni workspace.
 * Spouští se: npm run manifest:export
 * (spouští přímo Node.js 22+ — type stripping, žádný build krok)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { manifest } from "./index.ts";

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../content/projects/demo-web"
);
const outFile = path.join(outDir, "manifest.json");

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`manifest.json zapsán: ${outFile} (${manifest.kinds.length} kinds)`);
