import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Security guard — secrets nikdy v client bundle.
 *
 * Env proměnné s tokeny (GITHUB_*, BLOB_READ_WRITE_TOKEN, VERCEL_TOKEN,
 * WEB3FORMS_ACCESS_KEY) smí být čtené JEN v server-only souborech
 * (`import "server-only"`) a nikdy v "use client" komponentách.
 */

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

const SECRET_ENV_PATTERNS = [
  "process.env.GITHUB_TOKEN",
  "process.env.GITHUB_OWNER",
  "process.env.GITHUB_REPO",
  "process.env.BLOB_READ_WRITE_TOKEN",
  "process.env.VERCEL_TOKEN",
  "process.env.WEB3FORMS_ACCESS_KEY",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(srcDir).filter((f) => !f.includes("tests"));

describe("security — secrets v client bundle (A13)", () => {
  it("každý soubor čtoucí token env je server-only (import \"server-only\")", () => {
    const offenders = files
      .map((file) => {
        const content = readFileSync(file, "utf8");
        const usesSecret = SECRET_ENV_PATTERNS.some((pattern) => content.includes(pattern));
        if (!usesSecret) return null;
        const isServerOnly = content.includes('import "server-only"') || content.includes("server-only");
        return isServerOnly ? null : file.replace(srcDir, "src/");
      })
      .filter((f): f is string => f !== null);

    expect(offenders).toEqual([]);
  });

  it("žádný soubor čtoucí token env není client komponenta (\"use client\")", () => {
    const offenders = files
      .map((file) => {
        const content = readFileSync(file, "utf8");
        const usesSecret = SECRET_ENV_PATTERNS.some((pattern) => content.includes(pattern));
        if (!usesSecret) return null;
        if (!content.includes('"use client"')) return null;
        return file.replace(srcDir, "src/");
      })
      .filter((f): f is string => f !== null);

    expect(offenders).toEqual([]);
  });

  it("GitHub storage soubory deklarují server-only", () => {
    for (const rel of [
      "lib/storage/githubJson.ts",
      "lib/storage/githubOverrideStore.ts",
      "lib/storage/githubAuditStore.ts",
      "lib/storage/mediaStore.ts",
      "lib/services/vercelEnvService.ts",
    ]) {
      const content = readFileSync(path.join(srcDir, rel), "utf8");
      expect(content, rel).toContain('import "server-only"');
    }
  });
});
