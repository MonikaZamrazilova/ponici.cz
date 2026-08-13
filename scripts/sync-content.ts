/**
 * Propsání schválených změn z adminu do kódu webu.
 *
 * Po publishi v admin módu leží změny v published.json (override vrstva).
 * Tento skript je sloučí do base obsahu (src/manifest/base.ts — součást
 * kódu, git-trackované) a override vyčistí. Pak je změna trvale v kódu:
 * commit → build → deploy.
 *
 * Spuštění: npm run sync:content
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseFaqs, basePrices, baseServices, baseSite } from "../src/manifest/base.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const baseFile = path.join(projectRoot, "src/manifest/base.ts");
const publishedFile = path.resolve(
  projectRoot,
  "../admin layer/content/projects/ponici/store/published.json"
);
/** zrcadlo published.json v tomto repo (web ho zabundluje při buildu) */
const webPublishedFile = path.join(projectRoot, "src/lib/published.json");
const mediaDir = path.resolve(
  projectRoot,
  "../admin layer/content/projects/ponici/media"
);
const publicImgDir = path.join(projectRoot, "public/images/ponici");

const KINDS: { kind: string; exportName: string; current: Array<Record<string, unknown>> }[] = [
  { kind: "site", exportName: "baseSite", current: baseSite as Array<Record<string, unknown>> },
  { kind: "service", exportName: "baseServices", current: baseServices as Array<Record<string, unknown>> },
  { kind: "price", exportName: "basePrices", current: basePrices as Array<Record<string, unknown>> },
  { kind: "faq", exportName: "baseFaqs", current: baseFaqs as Array<Record<string, unknown>> },
];

interface PublishedFile {
  [kind: string]: Record<string, Record<string, unknown>> | undefined;
}

function tsLiteral(items: Array<Record<string, unknown>>): string {
  return JSON.stringify(items, null, 2);
}

function mergeKind(
  kind: string,
  current: Array<Record<string, unknown>>,
  overrides: Record<string, Record<string, unknown>> | undefined
): Array<Record<string, unknown>> {
  const merged = new Map<string, Record<string, unknown>>();
  for (const item of current) {
    const id = String(item["id"] ?? "");
    merged.set(id, overrides?.[id] ? { ...item, ...overrides[id] } : item);
  }
  for (const [id, item] of Object.entries(overrides ?? {})) {
    if (!merged.has(id)) merged.set(id, item);
  }
  return [...merged.values()];
}

// ─────────────── merge ───────────────

const published = JSON.parse(readFileSync(publishedFile, "utf8")) as PublishedFile;
const mergedCount: Record<string, number> = {};

for (const entry of KINDS) {
  const overrides = published[entry.kind];
  const merged = mergeKind(entry.kind, entry.current, overrides);
  entry.current = merged;
  mergedCount[entry.kind] = Object.keys(overrides ?? {}).length;
}

// ─────────────── nahrané fotky → kód (public/images/ponici) ───────────────
//
// Obsah může odkazovat na /api/projects/ponici/media/{id} (media knihovna
// adminu — runtime data). Aby fotka byla skutečně součástí kódu/deploye,
// zkopírujeme soubor do public/ a URL přepíšeme na /images/ponici/{id}.{ext}.

const MEDIA_URL_RE = /\/api\/projects\/ponici\/media\/([a-f0-9-]+)/g;

function collectMediaRefs(value: unknown, refs: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(MEDIA_URL_RE)) refs.add(match[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaRefs(item, refs);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectMediaRefs(v, refs);
  }
}

function rewriteMediaUrls(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const [id, newUrl] of map) {
      out = out.split(`/api/projects/ponici/media/${id}`).join(newUrl);
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((item) => rewriteMediaUrls(item, map));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) next[k] = rewriteMediaUrls(v, map);
    return next;
  }
  return value;
}

const mediaRefs = new Set<string>();
for (const entry of KINDS) {
  for (const item of entry.current) collectMediaRefs(item, mediaRefs);
}

const urlMap = new Map<string, string>();
let copied = 0;
let missing = 0;
mkdirSync(publicImgDir, { recursive: true });

for (const id of mediaRefs) {
  const file = readdirSync(mediaDir).find((name) => path.parse(name).name === id);
  if (!file || !existsSync(path.join(mediaDir, file))) {
    missing++;
    continue;
  }
  copyFileSync(path.join(mediaDir, file), path.join(publicImgDir, file));
  urlMap.set(id, `/images/ponici/${file}`);
  copied++;
}

// úklid: fotky s UUID názvem (dříve zkopírované ze synce), které už nikdo neodkazuje
const referencedFiles = new Set([...urlMap.values()].map((url) => path.basename(url)));
for (const name of readdirSync(publicImgDir)) {
  const isUuid = /^[a-f0-9-]{20,}\.(jpg|jpeg|png|webp|gif)$/i.test(name);
  if (isUuid && !referencedFiles.has(name)) unlinkSync(path.join(publicImgDir, name));
}

for (const entry of KINDS) {
  entry.current = entry.current.map((item) => rewriteMediaUrls(item, urlMap) as Record<string, unknown>);
}

// ─────────────── zápis base.ts ───────────────

const sections = KINDS.map(
  (entry) =>
    `export const ${entry.exportName}: ContentItem[] = ${tsLiteral(entry.current)};`
).join("\n\n");

const generated = `import type { ContentItem } from "@admin/core";

/**
 * Business data webu ponici.cz — výchozí obsah (base).
 *
 * GENEROVÁNO: npm run sync:content (propsání schválených změn z adminu do kódu).
 * Ruční úpravy se přepíšou — obsah upravujte přes admin mód (publish) a pak
 * spusťte npm run sync:content.
 */

${sections}
`;

writeFileSync(baseFile, generated, "utf8");

// ─────────────── vyčištění overrides (admin store + web zrcadlo) ───────────────

const cleared: Record<string, Record<string, unknown>> = {};
for (const entry of KINDS) cleared[entry.kind] = {};
writeFileSync(publishedFile, JSON.stringify(cleared, null, 2) + "\n", "utf8");
mkdirSync(path.dirname(publishedFile), { recursive: true });
writeFileSync(webPublishedFile, JSON.stringify(cleared, null, 2) + "\n", "utf8");

console.log("Sync hotov — schválené změny jsou v kódu (base.ts):");
for (const entry of KINDS) {
  console.log(`  ${entry.kind}: ${mergedCount[entry.kind]} override${mergedCount[entry.kind] === 1 ? "" : "y"} sloučeno, celkem ${entry.current.length} položek`);
}
console.log(`  fotky: ${copied} zkopírováno do public/images/ponici${missing ? `, ${missing} chybělo` : ""}`);
console.log("published.json vyčištěn (admin store + web zrcadlo).");
