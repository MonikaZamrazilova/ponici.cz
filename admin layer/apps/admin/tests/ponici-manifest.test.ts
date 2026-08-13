import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { contentManifestSchema } from "@admin/core";

const manifestFile = path.resolve(__dirname, "../../../content/projects/ponici/manifest.json");

describe("ponici manifest", () => {
  it("je validní kontrakt", () => {
    const raw = fs.readFileSync(manifestFile, "utf8");
    const parsed = contentManifestSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error.issues, null, 1));
    }
  });
});
