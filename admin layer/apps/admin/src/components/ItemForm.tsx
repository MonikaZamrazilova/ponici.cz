"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, FieldInput, useForm, useNotifications, useUnsavedGuard, tokens } from "@admin/ui";
import {
  diffItemFields,
  formatFieldValue,
  issuesToFieldErrors,
  validateEntity,
  type ContentItem,
  type EntityKindDef,
  type FieldSchema,
  type ProjectFeatures,
} from "@admin/core";
import { apiFetch } from "@/lib/clientApi";
import { Can } from "@/components/Permissions";

type EditorView = "edit" | "published" | "preview";

/**
 * Editor položky — oddělený draft a publikovaný stav (A5.1).
 *
 * Taby:
 *  - Upravit          — editable form (draft); změněná pole mají chip
 *  - Publikovaná verze — co je dnes na webu (base + override, BEZ draftu)
 *  - Náhled           — co web uvidí po publishi (base + override + draft)
 *
 * Publikace je vždy explicitní krok; draft nikdy nemění web.
 */
export function ItemForm({
  projectId,
  kind,
  kindLabel,
  kindDef,
  locales,
  id,
  isNew,
  initial,
  draft,
  publishedVersion,
  hasDraft,
  isPublished,
  canPublish,
  canDiscard,
  canDelete,
  isDeletable,
  hasBase,
  features,
}: {
  projectId: string;
  kind: string;
  kindLabel: string;
  kindDef: EntityKindDef;
  locales: string[];
  id: string;
  isNew: boolean;
  initial: ContentItem;
  draft: ContentItem | null;
  publishedVersion: ContentItem | null;
  hasDraft: boolean;
  isPublished: boolean;
  canPublish: boolean;
  canDiscard: boolean;
  canDelete: boolean;
  isDeletable: boolean;
  hasBase: boolean;
  features: Required<ProjectFeatures>;
}) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [idInput, setIdInput] = useState(id);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"publish" | "discard" | "delete" | null>(null);
  const [view, setView] = useState<EditorView>("edit");

  const form = useForm<Record<string, unknown>>({
    initialValues: stripMeta(initial),
    validate: (values) => {
      const result = validateEntity(kindDef, locales, { id: idInput, ...values });
      return result.ok ? {} : issuesToFieldErrors(result.issues);
    },
    onSubmit: async (values) => {
      const res = await apiFetch<ContentItem>(`/api/projects/${projectId}/items/${kind}/${idInput}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", data: { id: idInput, ...values } }),
      });
      if (!res.ok) {
        notify({ type: "error", title: "Uložení se nepovedlo", message: res.error.message });
        return { ok: false, message: res.error.message, fields: res.error.fields };
      }
      notify({ type: "success", title: isNew ? "Draft vytvořen" : "Draft uložen" });
      setSavedId(res.data.id);
      return { ok: true };
    },
  });

  const setField = form.setValue;

  // warning o neuložených změnách jen při editaci
  useUnsavedGuard(view === "edit" && form.dirty && !form.submitting && actionBusy === null);

  // pole, která se liší od poslední publikované verze
  const changedFields = useMemo(() => {
    if (!hasDraft || !draft || !publishedVersion) return new Set<string>();
    return diffItemFields(
      kindDef.fields.map((f) => f.name),
      draft,
      publishedVersion
    );
  }, [hasDraft, draft, publishedVersion, kindDef]);

  // po vytvoření nové položky přejít do editoru
  useEffect(() => {
    if (savedId && isNew) {
      router.replace(`/admin/projects/${projectId}/kinds/${kind}/${savedId}`);
    }
  }, [savedId, isNew, router, projectId, kind]);

  async function runRollback() {
    if (!window.confirm("Vrátit obsah na base verzi (z webu)? Publikovaný override bude smazán.")) return;
    setActionBusy("delete");
    try {
      const res = await apiFetch<{ rolledBack?: boolean }>(
        `/api/projects/${projectId}/items/${kind}/${idInput}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "rollback" }),
        }
      );
      if (!res.ok) {
        notify({ type: "error", title: "Rollback selhal", message: res.error.message });
        return;
      }
      notify({ type: "warning", title: "Rollback na base verzi" });
      router.refresh();
    } catch {
      notify({ type: "error", title: "Rollback selhal", message: "Chyba komunikace se serverem" });
    } finally {
      setActionBusy(null);
    }
  }

  async function runAction(action: "publish" | "discard" | "delete") {
    const confirmText =
      action === "publish"
        ? "Publikovat tento obsah? Web se změní až po nasazení buildu."
        : action === "delete"
          ? "Smazat položku natrvalo? Tuto akci nelze vrátit."
          : "Zahodit draft a vrátit se k poslední publikované verzi?";
    if (!window.confirm(confirmText)) return;

    setActionBusy(action);
    try {
      const res = await apiFetch<{ published?: boolean } | { discarded?: boolean } | { deleted?: boolean }>(
        `/api/projects/${projectId}/items/${kind}/${idInput}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        notify({
          type: "error",
          title: action === "publish" ? "Publikování selhalo" : action === "delete" ? "Smazání selhalo" : "Zahození selhalo",
          message: res.error.message,
        });
        return;
      }
      notify({
        type: action === "delete" ? "warning" : "success",
        title: action === "publish" ? "Publikováno" : action === "delete" ? "Položka smazána" : "Draft zahozen",
      });
      if (action === "delete") {
        router.push(`/admin/projects/${projectId}/kinds/${kind}`);
        return;
      }
      if (action === "discard" && publishedVersion) {
        form.reset(stripMeta(publishedVersion)); // bezpečný návrat k publikované verzi
      } else {
        form.markClean();
      }
      router.refresh();
    } catch {
      form.setResult({ tone: "err", text: "Chyba komunikace se serverem" });
    } finally {
      setActionBusy(null);
    }
  }

  const busy = form.submitting || actionBusy !== null;
  const publishDisabled = busy || !canPublish || (isNew && !hasDraft);

  const tabs: { key: EditorView; label: string }[] = [
    { key: "edit", label: "Upravit" },
    ...(features.publishedVersion ? [{ key: "published" as const, label: "Publikovaná verze" }] : []),
    ...(features.preview ? [{ key: "preview" as const, label: "Náhled (po publishi)" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {kindLabel}
        </h1>
        {isPublished && !hasDraft && <Badge tone="success">Publikováno</Badge>}
        {hasDraft && <Badge tone="warning">Draft</Badge>}
        {form.dirty && <Badge tone="info">Neuložené změny</Badge>}
        {!isNew && (
          <span style={{ fontSize: 13, color: tokens.colors.muted, fontFamily: tokens.font.mono }}>
            {id}
          </span>
        )}
      </div>

      {/* taby verze */}
      <div
        role="tablist"
        aria-label="Verze položky"
        style={{ display: "flex", gap: 4, borderBottom: `1px solid ${tokens.colors.border}`, flexWrap: "wrap" }}
      >
        {tabs.map((tab) => {
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(tab.key)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? `2px solid ${tokens.colors.primary}` : "2px solid transparent",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? tokens.colors.primary : tokens.colors.secondary,
                cursor: "pointer",
                fontFamily: tokens.font.body,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={`Verze: ${tabs.find((t) => t.key === view)?.label ?? ""}`}>
      {view === "published" && (
        <>
          <ReadOnlyItem
            kindDef={kindDef}
            item={publishedVersion}
            locales={locales}
            mediaBaseUrl={`/api/projects/${projectId}`}
            emptyTitle="Ještě nic nebylo publikováno"
            emptyHint="Po prvním publishi se tu objeví poslední publikovaná verze."
            note="Poslední publikovaná verze — rozpracovaný draft se sem nepromítá."
          />
          {hasBase && isPublished && canPublish && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: 12,
                background: tokens.colors.bg,
                borderRadius: 12,
                border: `1px solid ${tokens.colors.border}`,
                flexWrap: "wrap",
              }}
            >
              <Can permission="content:publish">
                <Button variant="secondary" disabled={busy} onClick={runRollback}>
                  Vrátit na base verzi (z webu)
                </Button>
              </Can>
              <span style={{ fontSize: 12, color: tokens.colors.muted, alignSelf: "center" }}>
                Smaže publikovaný override — web se vrátí k obsahu, který dodává sám.
              </span>
            </div>
          )}
        </>
      )}

      {view === "preview" && (
        <ReadOnlyItem
          kindDef={kindDef}
          item={draft ?? publishedVersion}
          locales={locales}
          mediaBaseUrl={`/api/projects/${projectId}`}
          emptyTitle="Zatím není co náhlednout"
          emptyHint="Nejdřív uložte draft."
          note={
            hasDraft
              ? "Takto bude obsah vypadat na webu po publishi (base + draft)."
              : "Web zobrazuje poslední publikovanou verzi — draft není uložen."
          }
        />
      )}

      {view === "edit" && (
        <>
          <Card padded={false}>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {isNew && (
                <FieldInput
                  field={{
                    type: "text",
                    name: "id",
                    label: "ID (slug)",
                    required: true,
                    help: "Stabilní identita — malá písmena, číslice, pomlčky. Později ji nelze měnit.",
                  }}
                  value={idInput}
                  onChange={(v) => setIdInput(String(v))}
                  error={form.errors["id"]}
                />
              )}
              {kindDef.fields.map((field) => (
                <FormFieldRow
                  key={field.name}
                  field={field}
                  value={form.values[field.name]}
                  error={form.errors[field.name]}
                  changed={changedFields.has(field.name)}
                  setField={setField}
                  locales={locales}
                  mediaBaseUrl={`/api/projects/${projectId}`}
                  features={features}
                />
              ))}
            </div>
          </Card>

          <div
            style={{
              display: "flex",
              gap: 8,
              position: "sticky",
              bottom: 16,
              padding: 12,
              background: tokens.colors.bg,
              borderRadius: 12,
              border: `1px solid ${tokens.colors.border}`,
              flexWrap: "wrap",
            }}
          >
            <Can permission={isNew ? "content:create" : "content:update"}>
              <Button disabled={busy} onClick={() => form.submit()}>
                {form.submitting ? "Ukládám…" : "Uložit draft"}
              </Button>
            </Can>
            {canPublish && (
              <Can permission="content:publish">
                <Button
                  variant="secondary"
                  disabled={publishDisabled}
                  title={isNew && !hasDraft ? "Nejdřív uložte draft" : undefined}
                  onClick={() => runAction("publish")}
                >
                  {actionBusy === "publish" ? "Publikuji…" : "Publikovat"}
                </Button>
              </Can>
            )}
            {hasDraft && canDiscard && (
              <Can permission="content:delete">
                <Button variant="ghost" disabled={busy} onClick={() => runAction("discard")}>
                  {actionBusy === "discard" ? "Zahazuji…" : "Vrátit bez publikování"}
                </Button>
              </Can>
            )}
            {!isNew && canDelete && isDeletable && (
              <Can permission="content:delete">
                <Button variant="danger" disabled={busy} onClick={() => runAction("delete")}>
                  {actionBusy === "delete" ? "Mažu…" : "Smazat položku"}
                </Button>
              </Can>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

/* ─────────────── read-only verze položky ─────────────── */

function ReadOnlyItem({
  kindDef,
  item,
  locales,
  mediaBaseUrl,
  note,
  emptyTitle,
  emptyHint,
}: {
  kindDef: EntityKindDef;
  item: ContentItem | null;
  locales: string[];
  mediaBaseUrl: string;
  note: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  if (!item) {
    return (
      <EmptyState title={emptyTitle} hint={emptyHint} />
    );
  }

  return (
    <Card padded={false}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${tokens.colors.border}`, fontSize: 12, color: tokens.colors.muted }}>
        {note}
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {kindDef.fields.map((field) => (
          <FieldValueRow
            key={field.name}
            field={field}
            value={item[field.name]}
            locales={locales}
            mediaBaseUrl={mediaBaseUrl}
          />
        ))}
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: "pointer", color: tokens.colors.secondary, fontWeight: 600 }}>
            Data (JSON)
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: 14,
              background: tokens.colors.card,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: tokens.colors.secondary,
            }}
          >
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    </Card>
  );
}

function FieldValueRow({
  field,
  value,
  locales,
  mediaBaseUrl,
}: {
  field: FieldSchema;
  value: unknown;
  locales: string[];
  mediaBaseUrl: string;
}) {
  const isComplex = field.type === "object" || field.type === "repeater";
  const isImage = field.type === "image" && typeof value === "string" && value;
  const formatted = isComplex ? "" : formatFieldValue(field, value, locales[0]);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.primary, marginBottom: 4 }}>
        {field.label}
        {field.required && <span style={{ color: tokens.colors.danger }}> *</span>}
      </div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.startsWith("http") ? value : `${mediaBaseUrl}/media/${value}`}
          alt={String(value)}
          style={{ width: 200, maxHeight: 120, objectFit: "cover", borderRadius: 8, border: `1px solid ${tokens.colors.borderHi}` }}
        />
      ) : isComplex ? (
        <pre
          style={{
            margin: 0,
            padding: 10,
            background: tokens.colors.card,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: 8,
            fontSize: 12,
            color: tokens.colors.secondary,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(value ?? null, null, 2)}
        </pre>
      ) : (
        <div style={{ fontSize: 14, color: formatted ? tokens.colors.primary : tokens.colors.mutedSoft, lineHeight: 1.5 }}>
          {formatted || "—"}
        </div>
      )}
    </div>
  );
}

function stripMeta(item: ContentItem): Record<string, unknown> {
  const { id: _id, status: _s, createdAt: _c, updatedAt: _u, publishedAt: _p, ...rest } = item;
  return rest;
}

/**
 * Feature flagy řídí dostupná pole: rich text → textarea, multi-select →
 * text (čárkami). Data se zachovávají, jen se mění editace.
 */
/**
 * Memoizovaný řádek formuláře (A9.2) — při editaci jednoho pole se
 * re-renderují jen závislé řádky, ne celý formulář.
 */
const FormFieldRow = memo(function FormFieldRow({
  field,
  value,
  error,
  changed,
  setField,
  locales,
  mediaBaseUrl,
  features,
}: {
  field: FieldSchema;
  value: unknown;
  error?: string;
  changed: boolean;
  setField: (name: string, v: unknown) => void;
  locales: string[];
  mediaBaseUrl: string;
  features: Required<ProjectFeatures>;
}) {
  const onChange = useCallback(
    (v: unknown) => {
      if (field.type === "multiselect" && !features.multiselect) {
        setField(field.name, String(v).split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        setField(field.name, v);
      }
    },
    [field, setField, features]
  );

  return (
    <FieldInput
      field={fallbackField(field, features)}
      value={
        field.type === "multiselect" && !features.multiselect
          ? ((value as string[] | undefined) ?? []).join(", ")
          : value
      }
      onChange={onChange}
      locales={locales}
      error={error}
      mediaBaseUrl={mediaBaseUrl}
      changed={changed}
    />
  );
});

function fallbackField(field: FieldSchema, features: Required<ProjectFeatures>): FieldSchema {
  if (field.type === "richtext" && !features.richText) {
    return { ...field, type: "textarea", placeholder: field.placeholder };
  }
  if (field.type === "multiselect" && !features.multiselect) {
    return {
      type: "text",
      name: field.name,
      label: field.label,
      required: field.required,
      help: `${field.help ?? ""} (multi-select je vypnutý — oddělte hodnoty čárkami)`.trim(),
    };
  }
  return field;
}
