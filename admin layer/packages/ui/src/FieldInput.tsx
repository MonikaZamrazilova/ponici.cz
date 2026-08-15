"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { FieldSchema, MediaAsset } from "@admin/core";
import { Button } from "./primitives";
import { inputStyle, tokens } from "./tokens";

/**
 * Schema-driven renderer polí — jádro reusable Admin UI.
 * Z manifestu (FieldSchema) vykreslí správný input, podporuje
 * object / repeater / localized vnoření. Admin aplikace tak nemá
 * žádný know-how o konkrétních entitách.
 */

export interface FieldInputProps {
  field: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  locales?: string[];
  error?: string;
  /** prefix API media knihovny projektu (např. /api/projects/<projectId>) */
  mediaBaseUrl?: string;
  /** pole se liší od poslední publikované verze (A5.1) */
  changed?: boolean;
}

export function FieldInput({
  field,
  value,
  onChange,
  locales = ["cs"],
  error,
  mediaBaseUrl,
  changed = false,
}: FieldInputProps) {
  switch (field.type) {
    case "object":
      return (
        <ObjectFieldInput
          field={field}
          value={value}
          onChange={onChange}
          locales={locales}
          mediaBaseUrl={mediaBaseUrl}
          changed={changed}
        />
      );
    case "repeater":
      return (
        <RepeaterFieldInput
          field={field}
          value={value}
          onChange={onChange}
          locales={locales}
          mediaBaseUrl={mediaBaseUrl}
          changed={changed}
        />
      );
    case "localized":
      return (
        <LocalizedFieldInput
          field={field}
          value={value}
          onChange={onChange}
          locales={locales}
          error={error}
          changed={changed}
        />
      );
    default:
      return (
        <ScalarFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          mediaBaseUrl={mediaBaseUrl}
          changed={changed}
        />
      );
  }
}

type ScalarLike = Extract<
  FieldSchema,
  {
    type:
      | "text"
      | "textarea"
      | "number"
      | "boolean"
      | "url"
      | "image"
      | "select"
      | "multiselect"
      | "richtext";
  }
>;

function FieldShell({
  label,
  help,
  error,
  changed = false,
  group = false,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  changed?: boolean;
  /** true = skupina kontrol (multiselect, localized, object, repeater) → legend */
  group?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {group ? (
        <legend
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tokens.colors.primary,
            padding: 0,
            margin: 0,
          }}
        >
          {label}
        </legend>
      ) : (
        <label
          htmlFor={htmlFor}
          style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.primary }}
        >
          {label}
        </label>
      )}
      {changed && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: tokens.colors.info,
            background: tokens.colors.infoSoft,
            padding: "2px 6px",
            borderRadius: 999,
            fontFamily: tokens.font.mono,
          }}
        >
          změněno
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {group ? (
        <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>{header}</fieldset>
      ) : (
        header
      )}
      {children}
      {error && <span style={{ fontSize: 12, color: tokens.colors.danger }}>{error}</span>}
      {!error && help && <span style={{ fontSize: 12, color: tokens.colors.muted }}>{help}</span>}
    </div>
  );
}

function FieldShellGroup({
  label,
  help,
  error,
  changed = false,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  changed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        border: "none",
        margin: 0,
        padding: 0,
        minWidth: 0,
      }}
    >
      <FieldShell label={label} help={help} error={error} changed={changed} group>
        {children}
      </FieldShell>
    </fieldset>
  );
}

function MultiSelectControl({
  field,
  value,
  onChange,
}: {
  field: Extract<FieldSchema, { type: "multiselect" }>;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  function toggle(option: { value: string; label: string }) {
    onChange(
      selected.includes(option.value)
        ? selected.filter((v) => v !== option.value)
        : [...selected, option.value],
    );
  }
  return (
    <div
      role="group"
      aria-label={field.label}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 6,
        padding: 10,
        border: `1px solid ${tokens.colors.borderHi}`,
        borderRadius: tokens.radius.md,
        background: tokens.colors.card,
      }}
    >
      {field.options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 6,
              background: checked ? tokens.colors.accentSoft : "transparent",
              fontWeight: checked ? 600 : 400,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(option)}
              style={{ accentColor: tokens.colors.primary }}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function RichTextControl({
  value,
  onChange,
  placeholder,
  controlId,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
  controlId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [valueText, setValueText] = useState(String(value ?? ""));

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== valueText) {
      ref.current.innerHTML = valueText;
    }
  }, [valueText]);

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command);
    const html = ref.current?.innerHTML ?? "";
    setValueText(html);
    onChange(html);
  }

  const toolbarButton: CSSProperties = {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    color: tokens.colors.secondary,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        border: `1px solid ${tokens.colors.borderHi}`,
        borderRadius: tokens.radius.md,
        background: tokens.colors.surface,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "4px 6px",
          borderBottom: `1px solid ${tokens.colors.border}`,
          background: tokens.colors.card,
        }}
      >
        {[
          ["bold", "B", "Tučné"],
          ["italic", "I", "Kurzíva"],
          ["underline", "U", "Podtržení"],
          ["insertUnorderedList", "•", "Seznam"],
        ].map(([command, glyph, label]) => (
          <button
            key={command}
            type="button"
            title={label}
            aria-label={label}
            style={toolbarButton}
            onClick={() => exec(command)}
          >
            {glyph}
          </button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <div
          ref={ref}
          id={controlId}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            const html = e.currentTarget.innerHTML;
            setValueText(html);
            onChange(html);
          }}
          style={{
            minHeight: 120,
            padding: "10px 12px",
            fontSize: 14,
            lineHeight: 1.6,
            outline: "none",
            color: tokens.colors.primary,
          }}
        />
        {!valueText && placeholder && (
          <span
            style={{
              position: "absolute",
              insetInlineStart: 12,
              top: 12,
              fontSize: 14,
              color: tokens.colors.mutedSoft,
              pointerEvents: "none",
            }}
          >
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}

function ScalarControl({
  field,
  value,
  onChange,
  placeholder,
  controlId,
}: {
  field: ScalarLike;
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
  controlId?: string;
}) {
  switch (field.type) {
    case "multiselect":
      return <MultiSelectControl field={field} value={value} onChange={onChange} />;
    case "richtext":
      return (
        <RichTextControl
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          controlId={controlId}
        />
      );
    case "textarea":
      return (
        <textarea
          id={controlId}
          style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
    case "number":
      return (
        <input
          id={controlId}
          type="number"
          style={inputStyle}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={placeholder}
        />
      );
    case "boolean":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
          <input
            id={controlId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label
            htmlFor={controlId}
            style={{ fontSize: 14, color: tokens.colors.secondary, cursor: "pointer" }}
          >
            {placeholder ?? "Ano / Ne"}
          </label>
        </div>
      );
    case "select":
      return (
        <select
          id={controlId}
          style={inputStyle}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— vyberte —</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          id={controlId}
          style={inputStyle}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
  }
}

/**
 * Cache seznamu media per projekt (A9.2) — editor s N image poli
 * volá /api/media jen jednou místo N×.
 */
const mediaCache = new Map<string, Promise<MediaAsset[]>>();

function loadMediaList(mediaBaseUrl: string): Promise<MediaAsset[]> {
  const cached = mediaCache.get(mediaBaseUrl);
  if (cached) return cached;
  const promise = fetch(`${mediaBaseUrl}/media`)
    .then((r) => {
      if (r.status === 401) {
        window.location.assign("/login?expired=1");
        throw new Error("SESSION_EXPIRED");
      }
      return r.json();
    })
    .then((res) => (res?.ok ? (res.data as MediaAsset[]) : []))
    .catch(() => []);
  mediaCache.set(mediaBaseUrl, promise);
  return promise;
}

function ImageControl({
  value,
  onChange,
  mediaBaseUrl,
  controlId,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  mediaBaseUrl?: string;
  controlId?: string;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  useEffect(() => {
    if (!mediaBaseUrl) return;
    let cancelled = false;
    loadMediaList(mediaBaseUrl).then((list) => {
      if (!cancelled) setAssets(list);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaBaseUrl]);
  const v = String(value ?? "");
  const isMediaId = assets.some((a) => a.id === v);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={controlId}
          style={{ ...inputStyle, flex: 1 }}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL nebo výběr z media knihovny"
        />
        {mediaBaseUrl && (
          <select
            style={{ ...inputStyle, width: 200, flexShrink: 0 }}
            value=""
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
          >
            <option value="">— media knihovna —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {isMediaId && (
        <img
          src={`${mediaBaseUrl}/media/${v}`}
          alt={v}
          style={{
            width: 120,
            height: 72,
            objectFit: "cover",
            borderRadius: 8,
            border: `1px solid ${tokens.colors.borderHi}`,
          }}
        />
      )}
    </div>
  );
}

function ScalarFieldInput({
  field,
  value,
  onChange,
  error,
  mediaBaseUrl,
  changed = false,
}: {
  field: ScalarLike;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  mediaBaseUrl?: string;
  changed?: boolean;
}) {
  const controlId = useId();
  return (
    <FieldShell
      label={field.label}
      help={field.help}
      error={error}
      changed={changed}
      htmlFor={controlId}
    >
      {field.type === "image" ? (
        <ImageControl
          value={value}
          onChange={onChange}
          mediaBaseUrl={mediaBaseUrl}
          controlId={controlId}
        />
      ) : (
        <ScalarControl
          field={field}
          value={value}
          onChange={onChange}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          controlId={controlId}
        />
      )}
    </FieldShell>
  );
}

function ObjectFieldInput({
  field,
  value,
  onChange,
  locales,
  mediaBaseUrl,
  changed = false,
}: {
  field: Extract<FieldSchema, { type: "object" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  locales: string[];
  mediaBaseUrl?: string;
  changed?: boolean;
}) {
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return (
    <FieldShellGroup label={field.label} help={field.help} changed={changed}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          padding: 16,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: 12,
          background: tokens.colors.card,
        }}
      >
        {field.fields.map((sub) => (
          <FieldInput
            key={sub.name}
            field={sub}
            value={obj[sub.name]}
            onChange={(v) => onChange({ ...obj, [sub.name]: v })}
            locales={locales}
            mediaBaseUrl={mediaBaseUrl}
          />
        ))}
      </div>
    </FieldShellGroup>
  );
}

function RepeaterFieldInput({
  field,
  value,
  onChange,
  locales,
  mediaBaseUrl,
  changed = false,
}: {
  field: Extract<FieldSchema, { type: "repeater" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  locales: string[];
  mediaBaseUrl?: string;
  changed?: boolean;
}) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const itemName = field.itemLabel ?? field.label;
  return (
    <FieldShellGroup label={field.label} help={field.help} changed={changed}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: 10,
              background: tokens.colors.card,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colors.muted }}>
                {itemName} {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(items.filter((_, j) => j !== index))}
              >
                Odebrat
              </Button>
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}
            >
              {field.fields.map((sub) => (
                <FieldInput
                  key={sub.name}
                  field={sub}
                  value={item[sub.name]}
                  onChange={(v) => {
                    const next = [...items];
                    next[index] = { ...item, [sub.name]: v };
                    onChange(next);
                  }}
                  locales={locales}
                  mediaBaseUrl={mediaBaseUrl}
                />
              ))}
            </div>
          </div>
        ))}
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange([...items, {}])}>
            + Přidat {itemName.toLowerCase()}
          </Button>
        </div>
      </div>
    </FieldShellGroup>
  );
}

function LocalizedFieldInput({
  field,
  value,
  onChange,
  locales,
  error,
  changed = false,
}: {
  field: Extract<FieldSchema, { type: "localized" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  locales: string[];
  error?: string;
  changed?: boolean;
}) {
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return (
    <FieldShellGroup label={field.label} help={field.help} error={error} changed={changed}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {locales.map((locale) => (
          <div key={locale} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: tokens.colors.muted,
                textTransform: "uppercase",
                fontFamily: tokens.font.mono,
              }}
            >
              {locale}
            </span>
            <div style={{ flex: 1 }}>
              <ScalarControl
                field={field.inner}
                value={obj[locale]}
                onChange={(v) => onChange({ ...obj, [locale]: v })}
                placeholder={"placeholder" in field.inner ? field.inner.placeholder : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </FieldShellGroup>
  );
}
