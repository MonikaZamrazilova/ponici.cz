import "server-only";
import {
  AdminError,
  getItemLabel,
  issuesToFieldErrors,
  nowIso,
  sanitizeRichText,
  validateEntity,
  type ContentItem,
  type EntityKindDef,
  type ProjectContentCapability,
  type ProjectContext,
} from "@admin/core";
import { appendAudit } from "./auditService";

/**
 * Application service — obsahový workflow (use-cases), scoped per projekt.
 *
 * Veškerá data jdou přes porty adapteru (drafts/published/deploy).
 * Každá operace se řídí explicitní capability projektu — žádné
 * if (project === ...), jen typovaná politika.
 */

export interface ItemSummary {
  item: ContentItem;
  hasDraft: boolean;
  isPublished: boolean;
}

/** Všechny verze položky (A5.1) — draft vs publikovaný stav odděleně. */
export interface ItemVersions {
  base: ContentItem | null;
  /** rozpracovaný draft (admin-only, web ho nikdy nevidí) */
  draft: ContentItem | null;
  /** poslední publikovaná verze = base + published override, bez draftu */
  publishedVersion: ContentItem | null;
  /** co uvidí web po publishi = base + published + draft */
  merged: ContentItem;
  hasDraft: boolean;
  isPublished: boolean;
}

function mergeBase(
  base: ContentItem,
  draft: ContentItem | null,
  published: ContentItem | null
): ContentItem {
  return { ...base, ...(published ?? {}), ...(draft ?? {}) };
}

function requireContentCapability(
  ctx: ProjectContext,
  capability: keyof ProjectContentCapability
): void {
  if (!ctx.adapter.capabilities.content[capability]) {
    throw new AdminError("Projekt tuto operaci neumožňuje (capability)", undefined, 403);
  }
}

export async function listItems(
  ctx: ProjectContext,
  kindDef: EntityKindDef
): Promise<ItemSummary[]> {
  const { adapter } = ctx;
  const [drafts, published] = await Promise.all([
    adapter.drafts.list(kindDef.kind),
    adapter.published.list(kindDef.kind),
  ]);

  const rows = new Map<string, ItemSummary>();
  for (const base of kindDef.baseItems ?? []) {
    rows.set(base.id, {
      item: mergeBase(base, drafts[base.id] ?? null, published[base.id] ?? null),
      hasDraft: Boolean(drafts[base.id]),
      isPublished: Boolean(published[base.id]),
    });
  }
  for (const [id, draft] of Object.entries(drafts)) {
    if (!rows.has(id)) {
      rows.set(id, { item: draft, hasDraft: true, isPublished: Boolean(published[id]) });
    }
  }
  for (const [id, item] of Object.entries(published)) {
    if (!rows.has(id)) {
      rows.set(id, { item, hasDraft: Boolean(drafts[id]), isPublished: true });
    }
  }

  return [...rows.values()].sort((a, b) =>
    getItemLabel(kindDef, a.item).localeCompare(getItemLabel(kindDef, b.item))
  );
}

export async function getItem(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<ItemSummary | null> {
  const versions = await getItemVersions(ctx, kindDef, id);
  if (!versions) return null;
  return {
    item: versions.merged,
    hasDraft: versions.hasDraft,
    isPublished: versions.isPublished,
  };
}

/**
 * Vrátí oddělené verze: draft, poslední publikovanou (base + override)
 * a merged (co web uvidí po publishi). Draft nikdy neovlivní publikovanou
 * verzi — oddělení stavů je garantované na úrovni storage portů.
 */
export async function getItemVersions(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<ItemVersions | null> {
  const { adapter } = ctx;
  const [draft, published] = await Promise.all([
    adapter.drafts.get(kindDef.kind, id),
    adapter.published.get(kindDef.kind, id),
  ]);
  const base = (kindDef.baseItems ?? []).find((item) => item.id === id) ?? null;
  if (!base && !draft && !published) return null;

  const publishedVersion: ContentItem | null =
    base || published ? { ...(base ?? ({} as ContentItem)), ...(published ?? {}) } : null;
  const merged: ContentItem = { ...(publishedVersion ?? ({} as ContentItem)), ...(draft ?? {}) };

  return {
    base,
    draft,
    publishedVersion,
    merged,
    hasDraft: Boolean(draft),
    isPublished: Boolean(published),
  };
}

/** Uloží (upsert) draft; validuje data proti manifestu. */
export async function saveDraft(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string,
  data: unknown
): Promise<ContentItem> {
  const existing = await getItem(ctx, kindDef, id);
  requireContentCapability(ctx, existing ? "edit" : "create");

  const validation = validateEntity(kindDef, ctx.manifest.locales, {
    id,
    ...(data as object),
  });
  if (!validation.ok) {
    throw new AdminError(
      "Obsah neprošel validací",
      issuesToFieldErrors(validation.issues)
    );
  }

  const fields: Record<string, unknown> = {};
  for (const field of kindDef.fields) {
    let value = validation.value[field.name];
    if (field.type === "richtext" && typeof value === "string") {
      value = sanitizeRichText(value); // security: žádné skripty/event handlery v HTML
    }
    fields[field.name] = value;
  }

  const item: ContentItem = {
    id: validation.value.id,
    status: "draft",
    createdAt: existing?.item.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    publishedAt: existing?.item.publishedAt,
    ...fields,
  };

  await ctx.adapter.drafts.save(item, kindDef.kind);
  void appendAudit({
    projectId: ctx.adapter.identity.id,
    action: existing?.hasDraft ? "update" : "create",
    entityKind: kindDef.kind,
    entityId: item.id,
    summary: `Draft uložen: ${getItemLabel(kindDef, item)}`,
    details: { state: "draft" },
  }).catch(() => {});
  return item;
}

/** Publikuje obsah: draft (nebo base bez draftu) → published + deploy hook. */
export async function publishItem(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<ContentItem> {
  requireContentCapability(ctx, "publish");

  const [draft, published] = await Promise.all([
    ctx.adapter.drafts.get(kindDef.kind, id),
    ctx.adapter.published.get(kindDef.kind, id),
  ]);
  const base = (kindDef.baseItems ?? []).find((item) => item.id === id) ?? null;
  const source = draft ?? base ?? published;
  if (!source) {
    throw new AdminError(`Položka ${id} neexistuje`);
  }

  const publishedFields: Record<string, unknown> = {};
  for (const field of kindDef.fields) {
    let value = source[field.name];
    if (field.type === "richtext" && typeof value === "string") {
      value = sanitizeRichText(value);
    }
    publishedFields[field.name] = value;
  }

  const item: ContentItem = {
    ...source,
    ...publishedFields,
    status: "published",
    updatedAt: nowIso(),
    publishedAt: source.publishedAt ?? nowIso(),
  };

  await ctx.adapter.published.save(item, kindDef.kind);
  await ctx.adapter.drafts.remove(kindDef.kind, id);
  void appendAudit({
    projectId: ctx.adapter.identity.id,
    action: "publish",
    entityKind: kindDef.kind,
    entityId: id,
    summary: `Publikováno: ${getItemLabel(kindDef, item)}`,
    details: { state: "published" },
  }).catch(() => {});
  await ctx.adapter.deploy?.notify({
    event: "publish",
    projectId: ctx.adapter.identity.id,
    entityKind: kindDef.kind,
    entityId: id,
  });
  return item;
}

/** Zahodí draft (published obsah se nemění). */
export async function discardDraft(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<boolean> {
  requireContentCapability(ctx, "discard");
  const removed = await ctx.adapter.drafts.remove(kindDef.kind, id);
  if (removed) {
    void appendAudit({ projectId: ctx.adapter.identity.id,
      action: "delete",
      entityKind: kindDef.kind,
      entityId: id,
      summary: `Draft zahozen: ${id}`,
      details: { state: "draft-discarded" },
    }).catch(() => {});
  }
  return removed;
}

/**
 * Rollback — smaže published override base položky; web se vrátí
 * k obsahu, který dodává sám (base). Pouze pro položky s base verzí.
 */
export async function rollbackItem(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<boolean> {
  requireContentCapability(ctx, "publish");

  const base = (kindDef.baseItems ?? []).find((item) => item.id === id);
  if (!base) {
    throw new AdminError("Rollback je možný jen u položek s base verzí (z webu)");
  }
  const removed = await ctx.adapter.published.remove(kindDef.kind, id);
  if (!removed) {
    throw new AdminError("Žádný published override k vrácení", undefined, 404);
  }
  await ctx.adapter.drafts.remove(kindDef.kind, id);

  void appendAudit({
    projectId: ctx.adapter.identity.id,
    action: "rollback",
    entityKind: kindDef.kind,
    entityId: id,
    summary: `Rollback na base verzi: ${getItemLabel(kindDef, base)}`,
    details: { state: "rollback-to-base" },
  }).catch(() => {});
  return true;
}

/**
 * Tvrdé smazání položky vytvořené v adminu (draft i published záznam).
 * Base položky (vlastněné webem) smazat nelze — jen se na ně aplikují
 * overrides. Položka se nevrátí.
 */
export async function deleteItem(
  ctx: ProjectContext,
  kindDef: EntityKindDef,
  id: string
): Promise<boolean> {
  requireContentCapability(ctx, "delete");

  const base = (kindDef.baseItems ?? []).find((item) => item.id === id);
  if (base) {
    throw new AdminError(
      "Položka pochází z webu (base) — nelze ji smazat, jen upravit přes publish"
    );
  }

  const [removedDraft, removedPublished] = await Promise.all([
    ctx.adapter.drafts.remove(kindDef.kind, id),
    ctx.adapter.published.remove(kindDef.kind, id),
  ]);
  if (!removedDraft && !removedPublished) {
    throw new AdminError(`Položka ${id} neexistuje`, undefined, 404);
  }

  void appendAudit({
    projectId: ctx.adapter.identity.id,
    action: "delete",
    entityKind: kindDef.kind,
    entityId: id,
    summary: `Položka smazána: ${id}`,
    details: { state: "deleted" },
  }).catch(() => {});
  return true;
}
