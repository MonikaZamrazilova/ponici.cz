"use client";

import { useEffect, useRef, useState } from "react";
import { tokens } from "@admin/ui";
import { Nav, type NavItem } from "./Nav";

/**
 * Mobilní navigace — hamburger + drawer s overlay.
 * Desktop (md+) skrývá tlačítko; drawer používá stejný Nav jako sidebar.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // focus management: Escape zavře, focus se přesune do draweru
  useEffect(() => {
    if (!open) return;
    const closeButton = drawerRef.current?.querySelector<HTMLButtonElement>("[data-close]");
    closeButton?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Otevřít menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        // display v className (inline-flex) — aby md:hidden mohl přebít
        className="inline-flex md:hidden"
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          background: "transparent",
          border: `1px solid ${tokens.colors.borderHi}`,
          borderRadius: 8,
          cursor: "pointer",
          color: tokens.colors.primary,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h8" />
        </svg>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.45)", zIndex: 45 }}
            onClick={() => setOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigace"
            style={{
              position: "fixed",
              insetBlock: 0,
              insetInlineStart: 0,
              width: 264,
              background: tokens.colors.surface,
              zIndex: 46,
              display: "flex",
              flexDirection: "column",
              padding: "16px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px 12px",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: tokens.colors.primary }}>
                Admin Layer
              </span>
              <button
                type="button"
                data-close
                aria-label="Zavřít menu"
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: tokens.colors.secondary,
                  fontSize: 16,
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }} onClick={() => setOpen(false)}>
              <Nav items={items} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
