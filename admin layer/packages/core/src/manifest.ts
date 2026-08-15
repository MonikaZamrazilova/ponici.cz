import { z } from "zod";
import type { ContentItem } from "./item";

/**
 * Kontrakt mezi Admin Layerem a externí aplikací.
 *
 * Externí aplikace definuje, co umí spravovat: druhy obsahu (kinds),
 * schémata polí a výchozí data. Admin Layer konzumuje tento manifest
 * genericky — nezná žádnou business logiku veřejného webu.
 *
 * Jediné místo, kde se obě strany potkávají, je tento JSON kontrakt
 * (content/manifest.json) a JSON soubory s drafty/publikovaným obsahem.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "select",
  "multiselect",
  "url",
  "image",
  "richtext",
  "object",
  "repeater",
  "localized",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface BaseField {
  name: string;
  label: string;
  required?: boolean;
  help?: string;
}

export interface ScalarField extends BaseField {
  type: "text" | "textarea" | "number" | "boolean" | "url" | "image";
  placeholder?: string;
}

export interface SelectField extends BaseField {
  type: "select";
  options: { value: string; label: string }[];
}

export interface MultiSelectField extends BaseField {
  type: "multiselect";
  options: { value: string; label: string }[];
}

export interface RichTextField extends BaseField {
  type: "richtext";
  placeholder?: string;
}

export interface ObjectField extends BaseField {
  type: "object";
  fields: FieldSchema[];
}

export interface RepeaterField extends BaseField {
  type: "repeater";
  itemLabel?: string;
  fields: FieldSchema[];
}

export interface LocalizedField extends BaseField {
  type: "localized";
  inner: LocalizedInnerField;
}

/** Uvnitř localized smí být jen skaláry — lokalizace objektů/polí je nad rámec. */
export type LocalizedInnerField = ScalarField | SelectField;

export type FieldSchema =
  | ScalarField
  | SelectField
  | MultiSelectField
  | RichTextField
  | ObjectField
  | RepeaterField
  | LocalizedField;

export interface EntityKindDef {
  kind: string;
  label: string;
  description?: string;
  /** Políčko, které je stabilní identitou entity (např. "slug"). */
  idField: string;
  /** Políčko zobrazované v seznamech; výchozí je idField. */
  listField?: string;
  /** Sloupce v list view (jména polí z fields); výchozí = [listField, idField]. */
  listColumns?: string[];
  fields: FieldSchema[];
  /** Výchozí obsah aplikace (business data, ne logika). */
  baseItems?: ContentItem[];
}

export interface ContentManifest {
  app: {
    name: string;
    description?: string;
    repo?: string;
  };
  locales: string[];
  kinds: EntityKindDef[];
}

/* ─────────────── zod validace kontraktu samotného ─────────────── */

const baseFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  help: z.string().optional(),
});

const scalarFieldSchema = baseFieldSchema.extend({
  type: z.enum(["text", "textarea", "number", "boolean", "url", "image"]),
  placeholder: z.string().optional(),
});

const selectFieldSchema = baseFieldSchema.extend({
  type: z.literal("select"),
  options: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
});

const multiSelectFieldSchema = baseFieldSchema.extend({
  type: z.literal("multiselect"),
  options: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
});

const richTextFieldSchema = baseFieldSchema.extend({
  type: z.literal("richtext"),
  placeholder: z.string().optional(),
});

export const localizedInnerFieldSchema = z.discriminatedUnion("type", [
  scalarFieldSchema,
  selectFieldSchema,
]);

export const fieldSchema: z.ZodType<FieldSchema> = z.lazy(() =>
  z.discriminatedUnion("type", [
    scalarFieldSchema,
    selectFieldSchema,
    multiSelectFieldSchema,
    richTextFieldSchema,
    baseFieldSchema.extend({
      type: z.literal("object"),
      fields: z.array(fieldSchema),
    }),
    baseFieldSchema.extend({
      type: z.literal("repeater"),
      itemLabel: z.string().optional(),
      fields: z.array(fieldSchema),
    }),
    baseFieldSchema.extend({
      type: z.literal("localized"),
      inner: localizedInnerFieldSchema,
    }),
  ]),
);

export const entityKindSchema = z.object({
  kind: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  idField: z.string().min(1),
  listField: z.string().optional(),
  listColumns: z.array(z.string()).optional(),
  fields: z.array(fieldSchema),
  baseItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const contentManifestSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    repo: z.string().optional(),
  }),
  locales: z.array(z.string()).min(1),
  kinds: z.array(entityKindSchema).min(1),
});
