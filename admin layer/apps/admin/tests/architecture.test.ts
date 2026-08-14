import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Architecture guard — single source of truth.
 *
 * Web (repo root) musí číst published overrides PŘÍMO z repo souboru
 * `admin layer/content/projects/ponici/store/published.json` (cíl GitHub
 * Contents API commitů adminu), ne z lokálního zrcadla. Jinak by se
 * "GitHub commit → Vercel deploy → live web" rozpadl na dvě kopie.
 */

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const webRepository = readFileSync(path.join(repoRoot, "src/lib/repository.ts"), "utf8");

const REPO_PUBLISHED_PATH = "../../admin layer/content/projects/ponici/store/published.json";
const MIRROR_PUBLISHED = "./published.json";
const LEGACY_MIRROR = "src/lib/published.json";

describe("single source of truth (architecture)", () => {
  it("web repository čte overrides z repo souboru (cíl GitHub commitů)", () => {
    expect(webRepository).toContain(REPO_PUBLISHED_PATH);
  });

  it("web repository nečte lokální zrcadlo published.json", () => {
    expect(webRepository).not.toContain(MIRROR_PUBLISHED);
    expect(webRepository).not.toContain(LEGACY_MIRROR);
  });

  it("repo published.json je git-trackovaný (source of truth v repu)", async () => {
    const { execSync } = await import("node:child_process");
    const tracked = execSync("git ls-files", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(tracked).toContain("admin layer/content/projects/ponici/store/published.json");
  });

  it("admin override store píše commit se standardem admin(<projectId>): akce", async () => {
    const source = readFileSync(
      path.join(repoRoot, "admin layer/apps/admin/src/lib/storage/githubOverrideStore.ts"),
      "utf8"
    );
    expect(source).toMatch(/admin\(\$\{projectId\}\): save/);
    expect(source).toMatch(/admin\(\$\{projectId\}\): remove/);
  });
});
