export function nowIso(): string {
  return new Date().toISOString();
}

export function uid(): string {
  return crypto.randomUUID();
}

/**
 * Lidsky čitelný label položky pro seznamy.
 * Použije listField (nebo idField); podporuje Localized hodnotu ("cs").
 */
export function getItemLabel(
  kindDef: {
    idField: string;
    listField?: string;
  },
  item: { id: string; [field: string]: unknown },
): string {
  const name = kindDef.listField ?? kindDef.idField;
  const value = item[name];
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const cs = (value as Record<string, unknown>)["cs"];
    if (typeof cs === "string" && cs.trim()) return cs;
  }
  return item.id;
}

/**
 * Formátování hodnoty pro list view sloupec (schema-driven).
 * Scalár → string, localized → zvolený locale, select → label, jinak "—".
 */
export function formatFieldValue(
  field: { type: string; options?: { value: string; label: string }[] },
  value: unknown,
  locale = "cs",
): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    if (field.type === "select") {
      return field.options?.find((o) => o.value === value)?.label ?? value;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (!Array.isArray(value) && typeof obj[locale] === "string") return obj[locale];
    if (Array.isArray(value)) {
      const items = value
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object") {
            return String(
              (entry as Record<string, unknown>)["name"] ?? entry["tag"] ?? entry["keyword"] ?? "",
            );
          }
          return "";
        })
        .filter(Boolean);
      return items.length ? items.join(", ") : "—";
    }
  }
  return "—";
}

/**
 * Porovná draft s poslední publikovanou verzí — vrátí jména změněných polí.
 * (JSON stringify — hluboké porovnání hodnot.)
 */
export function diffItemFields(
  fieldNames: string[],
  draft: Record<string, unknown>,
  published: Record<string, unknown>,
): Set<string> {
  const changed = new Set<string>();
  for (const name of fieldNames) {
    if (JSON.stringify(draft[name] ?? undefined) !== JSON.stringify(published[name] ?? undefined)) {
      changed.add(name);
    }
  }
  return changed;
}
