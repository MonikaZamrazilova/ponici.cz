"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "./primitives";
import { tokens } from "./tokens";

/**
 * Reusable shell primitives (A2.1).
 * Prezentace bez stavu (kromě UserMenu dropdownu); data dodává app.
 */

/* ─────────────── ShellLayout ─────────────── */

export function ShellLayout({
  sidebar,
  children,
  sidebarWidth = 240,
  sidebarClassName,
  contentClassName,
}: {
  /** obsah sidebaru (logo, nav, footer) */
  sidebar: ReactNode;
  /** topbar + main */
  children: ReactNode;
  sidebarWidth?: number;
  /** responsive classy (např. "max-md:hidden") */
  sidebarClassName?: string;
  contentClassName?: string;
}) {
  return (
    <div style={{ minHeight: "100vh", background: tokens.colors.bg, display: "flex" }}>
      <div
        className={sidebarClassName}
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          position: "fixed",
          insetBlock: 0,
          insetInlineStart: 0,
          background: tokens.colors.surface,
          borderInlineEnd: `1px solid ${tokens.colors.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 30,
        }}
      >
        {sidebar}
      </div>
      <div
        className={contentClassName}
        style={{
          marginInlineStart: sidebarWidth,
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─────────────── Topbar ─────────────── */

export function Topbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 56,
        padding: "0 20px",
        background: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        {left}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </header>
  );
}

/* ─────────────── Breadcrumbs ─────────────── */

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span
            key={`${item.label}-${index}`}
            style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
          >
            {index > 0 && <span style={{ color: tokens.colors.mutedSoft, fontSize: 12 }}>/</span>}
            {item.href && !last ? (
              <a
                href={item.href}
                style={{
                  color: tokens.colors.secondary,
                  textDecoration: "none",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </a>
            ) : (
              <span
                style={{
                  color: last ? tokens.colors.primary : tokens.colors.secondary,
                  fontWeight: last ? 600 : 400,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ─────────────── UserMenu ─────────────── */

export interface UserMenuItem {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function UserMenu({
  trigger,
  header,
  items,
}: {
  trigger: ReactNode;
  header?: { title: string; caption?: string };
  items: UserMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 10,
          fontFamily: tokens.font.body,
        }}
      >
        {trigger}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.12s",
            color: tokens.colors.muted,
          }}
        >
          <path
            d="M1 3.5 5 7l4-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 6px)",
            minWidth: 220,
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(17,17,17,0.12)",
            padding: 6,
            zIndex: 40,
          }}
        >
          {header && (
            <div
              style={{
                padding: "8px 10px 6px",
                borderBottom: `1px solid ${tokens.colors.border}`,
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: tokens.colors.primary }}>
                {header.title}
              </div>
              {header.caption && (
                <div style={{ fontSize: 12, color: tokens.colors.muted }}>{header.caption}</div>
              )}
            </div>
          )}
          {items.map((item) => {
            const style: CSSProperties = {
              display: "block",
              width: "100%",
              textAlign: "start",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: item.danger ? tokens.colors.danger : tokens.colors.primary,
              textDecoration: "none",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: tokens.font.body,
            };
            if (item.href) {
              return (
                <a
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={style}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.key}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                style={style}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Skeleton / ErrorCard ─────────────── */

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "rgba(17,17,17,0.07)",
        animation: "admin-pulse 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function ErrorCard({
  title = "Něco se pokazilo",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 12,
        background: tokens.colors.dangerSoft,
        border: `1px solid ${tokens.colors.danger}`,
        color: tokens.colors.danger,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {message && <p style={{ margin: "8px 0 16px", fontSize: 13, opacity: 0.85 }}>{message}</p>}
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Zkusit znovu
        </Button>
      )}
    </div>
  );
}
