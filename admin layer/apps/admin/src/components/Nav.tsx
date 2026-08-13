"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tokens } from "@admin/ui";

export interface NavItem {
  href: string;
  label: string;
  section?: string;
  /** externí odkaz (otevře se v novém okně, není aktivní stav) */
  external?: boolean;
}

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  let lastSection: string | undefined;

  return (
      <nav aria-label="Hlavní navigace" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item) => {
        const sectionHeader =
          item.section && item.section !== lastSection
            ? (lastSection = item.section,
              (
                <span
                  key={`section-${item.section}`}
                  style={{
                    fontFamily: tokens.font.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: tokens.colors.mutedSoft,
                    padding: "14px 10px 4px",
                  }}
                >
                  {item.section}
                </span>
              ))
            : null;
        const active = item.external
          ? false
          : item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const linkStyle: React.CSSProperties = {
          display: "block",
          padding: "7px 10px",
          borderRadius: 8,
          fontSize: 14,
          textDecoration: "none",
          color: active ? tokens.colors.primary : tokens.colors.muted,
          background: active ? tokens.colors.accentSoft : "transparent",
          fontWeight: active ? 600 : 400,
        };
        return (
          <span key={item.href} style={{ display: "flex", flexDirection: "column" }}>
            {sectionHeader}
            {item.external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={linkStyle}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
