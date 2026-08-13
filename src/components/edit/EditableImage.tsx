"use client";

import { useRef, useState, type ReactNode } from "react";
import { useEditMode } from "./EditModeProvider";
import { EditDialog } from "./EditDialog";
import { uploadImage } from "@/lib/editApi";

/**
 * Editovatelná fotografie — v admin módu klik → "Chcete změnit fotografii?"
 * → výběr souboru → nahrání do media knihovny → uložení URL.
 */

export function EditableImage({
  kind,
  id,
  field,
  label,
  buildPatch,
  children,
}: {
  kind: string;
  id: string;
  field: string;
  label: string;
  /** vlastní patch (např. fotografie uvnitř pole typu seznam) */
  buildPatch?: (newUrl: string) => Record<string, unknown>;
  children?: ReactNode;
}) {
  const { enabled, saveField } = useEditMode();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!enabled) return <>{children}</>;

  const openDialog = () => {
    setFile(null);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!file) {
      setError("Vyberte prosím fotografii");
      return;
    }
    setSaving(true);
    setError(null);
    const url = await uploadImage(file);
    if (!url) {
      setSaving(false);
      setError("Nahrání fotografie se nezdařilo");
      return;
    }
    const err = await saveField(kind, id, buildPatch ? buildPatch(url) : { [field]: url }, label);
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
          display: "block",
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
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#5c5244" }}>
            Vyberte novou fotografii z počítače:
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ marginTop: 10, fontSize: 13 }}
          />
          {file && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#3f6f52" }}>
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </EditDialog>
      )}
    </>
  );
}
