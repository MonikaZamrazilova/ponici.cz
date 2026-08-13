"use client";

import { useState, type ReactNode } from "react";
import { useEditMode } from "./EditModeProvider";
import { EditDialog } from "./EditDialog";

/**
 * Editovatelný text — v admin módu klik → "Chcete změnit? Čím?".
 */

export function EditableText({
  kind,
  id,
  field,
  label,
  value,
  multiline = false,
  buildPatch,
  children,
}: {
  kind: string;
  id: string;
  field: string;
  label: string;
  value: string;
  multiline?: boolean;
  /** vlastní patch (např. pro pole typu seznam/odstavec) */
  buildPatch?: (newValue: string) => Record<string, unknown>;
  children?: ReactNode;
}) {
  const { enabled, saveField } = useEditMode();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return <>{children}</>;

  const openDialog = () => {
    setDraft(value);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const patch = buildPatch ? buildPatch(draft) : { [field]: draft };
    const err = await saveField(kind, id, patch, label);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <span
        onClick={openDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && openDialog()}
        title={`Změnit: ${label}`}
        style={{
          cursor: "pointer",
          outline: "1.5px dashed #3f6f52",
          outlineOffset: 3,
          borderRadius: 4,
        }}
      >
        {children}
      </span>
      {open && (
        <EditDialog
          title={`Chcete změnit ${label}?`}
          onClose={() => setOpen(false)}
          onSave={save}
          saving={saving}
          error={error}
        >
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d6cdbd",
                background: "#fff",
                color: "#1c1c1c",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
              autoFocus
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d6cdbd",
                background: "#fff",
                color: "#1c1c1c",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
              autoFocus
            />
          )}
        </EditDialog>
      )}
    </>
  );
}
