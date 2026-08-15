import type { CSSProperties } from "react";

/**
 * Design tokeny — jediný zdroj barev/radicí/fontů pro celé Admin UI.
 * Komponenty používají inline styly, aby balíček nezávisel na Tailwindu
 * a fungoval v jakémkoli hostitelském Next.js app.
 */
export const tokens = {
  colors: {
    bg: "#F7F8FA",
    surface: "#FFFFFF",
    card: "#FCFCFD",
    primary: "#111111",
    secondary: "#5F6368",
    // kontrastní odstíny — splňují WCAG AA 4.5:1 na bílém pozadí
    muted: "rgba(17,17,17,0.72)",
    mutedSoft: "rgba(17,17,17,0.62)",
    border: "rgba(17,17,17,0.08)",
    borderHi: "rgba(17,17,17,0.14)",
    accentSoft: "rgba(17,17,17,0.06)",
    danger: "#B42318",
    dangerSoft: "rgba(180,35,24,0.08)",
    success: "#027A48",
    successSoft: "rgba(2,122,72,0.08)",
    warning: "#B54708",
    warningSoft: "rgba(181,71,8,0.08)",
    info: "#175CD3",
    infoSoft: "rgba(23,92,211,0.08)",
  },
  radius: { sm: 6, md: 8, lg: 12 },
  font: {
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', monospace",
  },
} as const;

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: tokens.font.body,
  color: tokens.colors.primary,
  background: tokens.colors.surface,
  border: `1px solid ${tokens.colors.borderHi}`,
  borderRadius: tokens.radius.md,
  boxSizing: "border-box",
};

export const cardStyle: CSSProperties = {
  background: tokens.colors.surface,
  border: `1px solid ${tokens.colors.border}`,
  borderRadius: tokens.radius.lg,
};

export function buttonStyle(
  variant: "primary" | "secondary" | "ghost" | "danger" = "primary",
  size: "sm" | "md" = "md",
): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: tokens.font.body,
    fontWeight: 600,
    fontSize: size === "sm" ? 13 : 14,
    padding: size === "sm" ? "6px 12px" : "9px 16px",
    borderRadius: tokens.radius.md,
    border: "1px solid transparent",
    cursor: "pointer",
    textDecoration: "none",
    lineHeight: 1.2,
  };
  switch (variant) {
    case "primary":
      return { ...base, background: tokens.colors.primary, color: "#FFFFFF" };
    case "secondary":
      return {
        ...base,
        background: tokens.colors.surface,
        color: tokens.colors.primary,
        borderColor: tokens.colors.borderHi,
      };
    case "danger":
      return {
        ...base,
        background: tokens.colors.surface,
        color: tokens.colors.danger,
        borderColor: tokens.colors.borderHi,
      };
    case "ghost":
      return {
        ...base,
        background: "transparent",
        color: tokens.colors.secondary,
        padding: size === "sm" ? "4px 8px" : "6px 12px",
      };
  }
}

export function badgeStyle(
  tone: "neutral" | "success" | "warning" | "danger" | "info",
): CSSProperties {
  const bg = {
    neutral: tokens.colors.accentSoft,
    success: tokens.colors.successSoft,
    warning: tokens.colors.warningSoft,
    danger: tokens.colors.dangerSoft,
    info: tokens.colors.infoSoft,
  }[tone];
  const fg = {
    neutral: tokens.colors.secondary,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    danger: tokens.colors.danger,
    info: tokens.colors.info,
  }[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontFamily: tokens.font.mono,
    whiteSpace: "nowrap",
  };
}
