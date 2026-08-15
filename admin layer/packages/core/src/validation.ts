import { z } from "zod";
import type { EntityKindDef, FieldSchema } from "./manifest";
import type { ContentItem, ItemStatus } from "./item";

/**
 * Validace — staví zod schéma z manifestu. Server i klient sdílí
 * stejná pravidla, pravidla nikde neduplikujeme.
 */

export function zodFromField(
  field: FieldSchema,
  locales: string[],
  forceRequired?: boolean,
): z.ZodType<unknown> {
  const required = forceRequired ?? field.required;
  const base = zodFromFieldRaw(field, locales, required);
  return required ? base : base.optional();
}

function zodFromFieldRaw(
  field: FieldSchema,
  locales: string[],
  required = field.required,
): z.ZodType<unknown> {
  switch (field.type) {
    case "text":
    case "textarea":
    case "image":
      return required ? z.string().min(1, "Povinné pole") : z.string();
    case "url":
      return required ? z.url("Neplatná URL") : z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "select":
      return required ? z.string().min(1, "Vyberte hodnotu") : z.string();
    case "multiselect":
      return required
        ? z.array(z.string()).min(1, "Vyberte alespoň jednu hodnotu")
        : z.array(z.string());
    case "richtext":
      return required ? z.string().min(1, "Povinné pole") : z.string();
    case "object": {
      const record: Record<string, z.ZodTypeAny> = {};
      for (const sub of field.fields) {
        const schema = zodFromField(sub, locales);
        if (sub.required) {
          record[sub.name] = schema as z.ZodTypeAny;
        } else {
          record[sub.name] = (schema as z.ZodTypeAny).optional();
        }
      }
      return z.object(record).passthrough();
    }
    case "repeater": {
      const record: Record<string, z.ZodTypeAny> = {};
      for (const sub of field.fields) {
        const schema = zodFromField(sub, locales);
        record[sub.name] = sub.required
          ? (schema as z.ZodTypeAny)
          : (schema as z.ZodTypeAny).optional();
      }
      return z.array(z.object(record).passthrough());
    }
    case "localized": {
      const record: Record<string, z.ZodTypeAny> = {};
      for (const locale of locales) {
        // required na localized poli se propaguje na hodnoty všech lokací
        record[locale] = zodFromField(field.inner, locales, field.required) as z.ZodTypeAny;
      }
      return z.object(record).passthrough();
    }
  }
}

export function zodFromKind(
  kindDef: EntityKindDef,
  locales: string[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const record: Record<string, z.ZodTypeAny> = {
    id: z
      .string()
      .min(1, "Chybí ID")
      .regex(/^[a-z0-9][a-z0-9-]*$/, "ID: jen malá písmena, číslice a pomlčky"),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    publishedAt: z.string().optional(),
  };
  for (const field of kindDef.fields) {
    record[field.name] = zodFromField(field, locales) as z.ZodTypeAny;
  }
  return z.object(record).passthrough();
}

export type EntityValidationResult =
  { ok: true; value: ContentItem } | { ok: false; issues: z.ZodIssue[] };

export function validateEntity(
  kindDef: EntityKindDef,
  locales: string[],
  data: unknown,
): EntityValidationResult {
  const result = zodFromKind(kindDef, locales).safeParse(data);
  if (result.success) {
    return { ok: true, value: result.data as ContentItem };
  }
  return { ok: false, issues: result.error.issues };
}

export function issuesToFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "id");
    fields[key] = fields[key] ?? issue.message;
  }
  return fields;
}

export type { ItemStatus };
