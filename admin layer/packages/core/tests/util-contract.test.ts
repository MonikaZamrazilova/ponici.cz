import { describe, expect, it } from "vitest";
import { contentManifestSchema, entityKindSchema } from "../src/manifest";
import { diffItemFields, formatFieldValue, getItemLabel } from "../src/util";

describe("util (A3.1, A5.1)", () => {
  it("diffItemFields najde změněná pole", () => {
    const changed = diffItemFields(
      ["name", "desc"],
      { name: "A", desc: "x" },
      { name: "B", desc: "x" },
    );
    expect(changed.has("name")).toBe(true);
    expect(changed.has("desc")).toBe(false);
  });

  it("getItemLabel — string i localized", () => {
    const kind = { idField: "slug", listField: "name" };
    expect(getItemLabel(kind, { id: "x", name: "Jméno" })).toBe("Jméno");
    expect(getItemLabel(kind, { id: "x", name: { cs: "Česky", en: "English" } })).toBe("Česky");
    expect(getItemLabel({ idField: "slug" }, { id: "x" })).toBe("x");
  });

  it("formatFieldValue — select label, localized, repeater", () => {
    const select = { type: "select", options: [{ value: "a", label: "Áčko" }] };
    expect(formatFieldValue(select, "a")).toBe("Áčko");
    expect(formatFieldValue({ type: "text" }, { cs: "cs-hodnota" })).toBe("cs-hodnota");
    expect(formatFieldValue({ type: "repeater" }, [{ tag: "x" }, { tag: "y" }])).toBe("x, y");
  });
});

describe("kontrakt (A0.2)", () => {
  it("validní manifest projde schema", () => {
    const result = contentManifestSchema.safeParse({
      app: { name: "Test" },
      locales: ["cs"],
      kinds: [
        {
          kind: "note",
          label: "Poznámky",
          idField: "slug",
          listColumns: ["title"],
          fields: [{ type: "text", name: "title", label: "Nadpis", required: true }],
          baseItems: [{ id: "x", status: "published", createdAt: "", updatedAt: "", title: "A" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("nevalidní manifest selže (prázdné kinds, chybný field)", () => {
    expect(
      contentManifestSchema.safeParse({ app: { name: "x" }, locales: [], kinds: [] }).success,
    ).toBe(false);
    expect(
      entityKindSchema.safeParse({ kind: "", label: "x", idField: "slug", fields: [] }).success,
    ).toBe(false);
    expect(
      entityKindSchema.safeParse({
        kind: "x",
        label: "x",
        idField: "slug",
        fields: [{ type: "neexistuje", name: "a", label: "A" }],
      }).success,
    ).toBe(false);
  });

  it("multiselect/richtext field typy jsou součástí kontraktu", () => {
    const result = entityKindSchema.safeParse({
      kind: "x",
      label: "x",
      idField: "slug",
      fields: [
        { type: "multiselect", name: "m", label: "M", options: [{ value: "a", label: "A" }] },
        { type: "richtext", name: "r", label: "R" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
