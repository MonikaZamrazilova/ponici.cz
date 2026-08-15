import { describe, expect, it } from "vitest";
import { issuesToFieldErrors, validateEntity, type EntityKindDef } from "../src";

const kindDef: EntityKindDef = {
  kind: "note",
  label: "Poznámky",
  idField: "slug",
  fields: [
    { type: "text", name: "title", label: "Nadpis", required: true },
    { type: "url", name: "link", label: "Odkaz" },
    {
      type: "multiselect",
      name: "tags",
      label: "Štítky",
      required: true,
      options: [{ value: "a", label: "A" }],
    },
    { type: "select", name: "status", label: "Stav", options: [{ value: "ok", label: "OK" }] },
  ],
};

describe("validace (A4.1 — client i server sdílí)", () => {
  it("validní položka projde", () => {
    const result = validateEntity(kindDef, ["cs"], {
      id: "poznamka",
      title: "Ahoj",
      link: "https://example.com",
      tags: ["a"],
      status: "ok",
    });
    expect(result.ok).toBe(true);
  });

  it("chybějící required pole → issues s cs zprávou", () => {
    const result = validateEntity(kindDef, ["cs"], { id: "x", title: "", tags: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = issuesToFieldErrors(result.issues);
      expect(fields["title"]).toBe("Povinné pole");
      expect(fields["tags"]).toBe("Vyberte alespoň jednu hodnotu");
    }
  });

  it("nepovinný url field akceptuje prázdný i nevalidní řetězec", () => {
    const result = validateEntity(kindDef, ["cs"], {
      id: "x",
      title: "T",
      link: "neplatna-url",
      tags: ["a"],
    });
    expect(result.ok).toBe(true);
  });

  it("povinný url field odmítne nevalidní URL", () => {
    const strict: EntityKindDef = {
      kind: "note",
      label: "Poznámky",
      idField: "slug",
      fields: [{ type: "url", name: "link", label: "Odkaz", required: true }],
    };
    const result = validateEntity(strict, ["cs"], { id: "x", link: "neplatna" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(issuesToFieldErrors(result.issues)["link"]).toBe("Neplatná URL");
    }
  });

  it("ID musí být slug (malá písmena, číslice, pomlčky)", () => {
    const result = validateEntity(kindDef, ["cs"], {
      id: "Velke Písmeno",
      title: "x",
      tags: ["a"],
    });
    expect(result.ok).toBe(false);
  });

  it("required localized pole odmítne prázdné hodnoty všech lokací", () => {
    const localizedKind: EntityKindDef = {
      kind: "page",
      label: "Stránky",
      idField: "slug",
      fields: [
        {
          type: "localized",
          name: "title",
          label: "Titul",
          required: true,
          inner: { type: "text", name: "title", label: "Titul" },
        },
      ],
    };
    const empty = validateEntity(localizedKind, ["cs", "en"], {
      id: "x",
      title: { cs: "", en: "" },
    });
    expect(empty.ok).toBe(false);
    const partial = validateEntity(localizedKind, ["cs", "en"], {
      id: "x",
      title: { cs: "A", en: "" },
    });
    expect(partial.ok).toBe(false);
    const ok = validateEntity(localizedKind, ["cs", "en"], {
      id: "x",
      title: { cs: "A", en: "B" },
    });
    expect(ok.ok).toBe(true);
  });

  it("url field je nepovinný — prázdný projde", () => {
    const result = validateEntity(kindDef, ["cs"], {
      id: "x",
      title: "T",
      link: "",
      tags: ["a"],
    });
    expect(result.ok).toBe(true);
  });
});
