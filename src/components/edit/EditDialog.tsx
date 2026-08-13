"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Dialog "Chcete změnit? Čím?" — zobrazí otázku + editační kontrolu.
 * Zavírá se Escape/klikem mimo; fokus na vstup.
 */

export function EditDialog({
  title,
  onClose,
  onSave,
  saving,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const focusable = ref.current?.querySelector<HTMLElement>("input, textarea, button");
    focusable?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(28,28,28,0.45)",
      }}
    >
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fffdf8",
          color: "#1c1c1c",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>{title}</h3>
        {children}
        {error && <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b42318" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 16px",
              borderRadius: 999,
              border: "1px solid #d6cdbd",
              background: "transparent",
              color: "#5c5244",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              background: "#3f6f52",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d6cdbd",
  background: "#fff",
  color: "#1c1c1c",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};
