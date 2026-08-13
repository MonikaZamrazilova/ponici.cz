import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ContentManifest, ProjectConfig } from "@admin/core";

// izolovaný storage (env) MUSÍ být nastaven před importem config/services
const tmpRoot = mkdtempSync(path.join(tmpdir(), "admin-test-"));
vi.stubEnv("ADMIN_STORE_DIR", tmpRoot);
vi.stubEnv("ADMIN_PROJECTS", "testproject");

const { createFileProjectAdapter } = await import("../src/lib/projects/fileAdapter");
const { projectConfig } = await import("@admin/core");
const {
  deleteItem,
  discardDraft,
  getItemVersions,
  publishItem,
  rollbackItem,
  saveDraft,
} = await import("../src/lib/services/itemService");

const manifest: ContentManifest = {
  app: { name: "Test" },
  locales: ["cs"],
  kinds: [
    {
      kind: "note",
      label: "Poznámky",
      idField: "slug",
      listField: "title",
      fields: [
        { type: "text", name: "title", label: "Nadpis", required: true },
        { type: "richtext", name: "body", label: "Obsah" },
      ],
      baseItems: [
        {
          id: "base-note",
          slug: "base-note",
          status: "published",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          title: "Base",
          body: "<p>Base body</p>",
        },
      ],
    },
  ],
};

function makeAdapter(overrides: Partial<ProjectConfig> = {}) {
  const dir = path.join(tmpRoot, overrides.identity?.id ?? "testproject");
  mkdirSync(path.join(dir, "store"), { recursive: true });
  mkdirSync(path.join(dir, "audit"), { recursive: true });
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
  writeFileSync(path.join(dir, "store", "drafts.json"), "{}\n");
  writeFileSync(path.join(dir, "store", "published.json"), "{}\n");
  const cfg = projectConfig({
    identity: { id: "testproject", name: "Test Projekt" },
    media: { provider: "none" },
    content: { create: true, edit: true, publish: true, discard: true, delete: true },
    publish: { model: "overrides" },
    ...overrides,
  });
  return createFileProjectAdapter(cfg, tmpRoot);
}

const kindDef = manifest.kinds[0];

describe("itemService — CRUD/publish/rollback (A11.1)", () => {
  it("saveDraft vytvoří draft; druhý save = update (createdAt zůstává)", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    const created = await saveDraft(ctx, kindDef, "nova", { title: "První", body: "<p>a</p>" });
    expect(created.status).toBe("draft");
    const v1 = await getItemVersions(ctx, kindDef, "nova");
    expect(v1?.hasDraft).toBe(true);
    expect(v1?.publishedVersion).toBeNull(); // admin-owned, ještě nepublikováno

    const updated = await saveDraft(ctx, kindDef, "nova", { title: "Druhý", body: "<p>b</p>" });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it("saveDraft validuje — chybějící required pole hodí AdminError s field chybou", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    await expect(saveDraft(ctx, kindDef, "nova", { title: "" })).rejects.toMatchObject({
      fields: { title: "Povinné pole" },
    });
  });

  it("rich text se sanitizuje při save (security)", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    const saved = await saveDraft(ctx, kindDef, "nova", {
      title: "X",
      body: "<p>ok</p><script>alert(1)</script>",
    });
    expect(String(saved.body)).toBe("<p>ok</p>");
  });

  it("publish přesune draft do published a smaže draft", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    await saveDraft(ctx, kindDef, "nova", { title: "Publikováno" });
    const published = await publishItem(ctx, kindDef, "nova");
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeDefined();

    const after = await getItemVersions(ctx, kindDef, "nova");
    expect(after?.hasDraft).toBe(false);
    expect(after?.isPublished).toBe(true);
  });

  it("publish bez capability publish → AdminError 403", async () => {
    const adapter = makeAdapter({
      content: { create: true, edit: true, publish: false, discard: true, delete: true },
    });
    const ctx = { adapter, manifest };
    await saveDraft(ctx, kindDef, "nova", { title: "X" });
    await expect(publishItem(ctx, kindDef, "nova")).rejects.toMatchObject({ status: 403 });
  });

  it("rollback smaže published override base položky; bez base → error", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };

    // base položka: publikovat override pak rollback
    await saveDraft(ctx, kindDef, "base-note", { title: "Override", body: "<p>o</p>" });
    await publishItem(ctx, kindDef, "base-note");
    expect((await getItemVersions(ctx, kindDef, "base-note"))?.isPublished).toBe(true);

    const rolledBack = await rollbackItem(ctx, kindDef, "base-note");
    expect(rolledBack).toBe(true);
    const after = await getItemVersions(ctx, kindDef, "base-note");
    expect(after?.isPublished).toBe(false);
    expect(after?.publishedVersion?.title).toBe("Base"); // web se vrací k base

    // admin-owned položka → rollback zakázán
    await saveDraft(ctx, kindDef, "nova", { title: "X" });
    await expect(rollbackItem(ctx, kindDef, "nova")).rejects.toThrow("base verzí");
  });

  it("deleteItem: base položka blokovaná, admin-owned smazatelná", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    await expect(deleteItem(ctx, kindDef, "base-note")).rejects.toThrow("z webu");

    await saveDraft(ctx, kindDef, "nova", { title: "X" });
    await publishItem(ctx, kindDef, "nova");
    expect(await deleteItem(ctx, kindDef, "nova")).toBe(true);
    expect(await getItemVersions(ctx, kindDef, "nova")).toBeNull();
  });

  it("discardDraft zahodí draft, published zůstává", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    await saveDraft(ctx, kindDef, "base-note", { title: "Draft změna" });
    expect(await discardDraft(ctx, kindDef, "base-note")).toBe(true);
    const after = await getItemVersions(ctx, kindDef, "base-note");
    expect(after?.hasDraft).toBe(false);
    expect(after?.merged.title).toBe("Base");
  });

  it("capability create:false blokuje vytvoření nové položky", async () => {
    const adapter = makeAdapter({
      content: { create: false, edit: true, publish: true, discard: true, delete: true },
    });
    const ctx = { adapter, manifest };
    await expect(saveDraft(ctx, kindDef, "nova", { title: "X" })).rejects.toMatchObject({
      status: 403,
    });
    // editace existující base položky ale projde
    await expect(saveDraft(ctx, kindDef, "base-note", { title: "Upraveno" })).resolves.toBeTruthy();
  });

  it("audit se zapisuje do centrálního logu", async () => {
    const adapter = makeAdapter();
    const ctx = { adapter, manifest };
    await saveDraft(ctx, kindDef, "nova", { title: "X" });
    await publishItem(ctx, kindDef, "nova");
    const audit = await import("../src/lib/services/auditService");
    const events = await audit.listAudit("testproject", 10);
    const actions = events.map((e) => e.action);
    expect(actions).toContain("create");
    expect(actions).toContain("publish");
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });
});
