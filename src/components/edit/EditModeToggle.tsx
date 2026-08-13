"use client";

import { useEditMode } from "./EditModeProvider";

/**
 * Plovoucí přepínač — zobrazuje se JEN v admin módu (na normální stránce
 * není nic). „Konec editace" vypne admin mód a vrátí uživatele do admin menu.
 */

export function EditModeToggle() {
  const { session, checked, enabled, toggle } = useEditMode();

  if (!checked || !session?.canEdit || !enabled) return null;

  const finish = () => {
    toggle();
    // návrat do admin menu (stejný origin → /admin → Nastavení)
    window.location.href = "/admin";
  };

  return (
    <button
      type="button"
      onClick={finish}
      title="Vypnout admin mód a vrátit se do admin menu"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 90,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        background: "#b42318",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.35)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#fff",
          opacity: 0.9,
        }}
      />
      Konec editace
    </button>
  );
}
