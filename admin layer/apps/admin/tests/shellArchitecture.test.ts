import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Architecture guard — ADMIN SHELL MUST BE SINGLE.
 *
 * Admin má přesně JEDEN kanonický shell (app/admin/layout.tsx):
 *  - ShellLayout se renderuje jen tam (stránky jsou čistý obsah)
 *  - žádný nested layout pod /admin
 *  - žádná stránka si nesmí renderovat vlastní Nav/Topbar/Shell
 */
const adminDir = fileURLToPath(new URL("../", import.meta.url)); // = apps/admin
const srcDir = path.join(adminDir, "src");

async function collect(dir: string, acc: string[] = []): Promise<string[]> {
  const { readdirSync, statSync } = await await_import_fs();
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) await collect(full, acc);
    else if (/\.(tsx|ts)$/.test(entry)) acc.push(full);
  }
  return acc;
}

let _fs: typeof import("node:fs") | null = null;
async function await_import_fs() {
  if (!_fs) _fs = await import("node:fs");
  return _fs;
}

describe("admin shell — single canonical layout (architecture)", () => {
  it("pod /admin existuje POUZE jeden layout.tsx", async () => {
    const files = await collect(path.join(srcDir, "app", "admin"));
    const layouts = files.filter((f) => f.endsWith("layout.tsx"));
    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toContain(`${path.sep}admin${path.sep}layout.tsx`);
  });

  it("ShellLayout se renderuje JEN v admin/layout.tsx", async () => {
    const files = await collect(srcDir);
    const offenders = files.filter((f) => {
      if (!f.endsWith(".tsx")) return false;
      const content = readFileSync(f, "utf8");
      if (!content.includes("ShellLayout")) return false;
      // jediný povolený render je app/admin/layout.tsx
      return !f.endsWith(`${path.sep}admin${path.sep}layout.tsx`);
    });
    expect(offenders).toEqual([]);
  });

  it("stránky pod /admin jsou čistý obsah (žádný Nav/Topbar/MobileNav)", async () => {
    const files = await collect(path.join(srcDir, "app", "admin"));
    const pages = files.filter((f) => f.endsWith("page.tsx"));
    const offenders = pages.filter((f) => {
      const content = readFileSync(f, "utf8");
      return /Nav|Topbar|MobileNav|ShellLayout/.test(content);
    });
    expect(offenders).toEqual([]);
  });
});
