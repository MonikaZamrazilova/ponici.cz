import type { CSSProperties, ReactNode } from "react";
import { badgeStyle, buttonStyle, cardStyle, inputStyle, tokens } from "./tokens";

/** Základní UI primitiva Admin Layeru — malé, bez stavu, bez závislostí. */

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  children,
  style,
  title,
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{ ...buttonStyle(variant, size), opacity: disabled ? 0.5 : 1, ...style }}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return <span style={badgeStyle(tone)}>{children}</span>;
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
}) {
  return <div style={{ ...cardStyle, padding: padded ? 20 : 0, ...style }}>{children}</div>;
}

export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
}: {
  label?: string;
  help?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.primary }}
        >
          {label}
        </label>
      )}
      {children}
      {error && <span style={{ fontSize: 12, color: tokens.colors.danger }}>{error}</span>}
      {!error && help && <span style={{ fontSize: 12, color: tokens.colors.muted }}>{help}</span>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        minHeight: 96,
        resize: "vertical",
        ...props.style,
      }}
    />
  );
}

export function Select({
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...rest} style={{ ...inputStyle, ...rest.style }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: tokens.colors.primary,
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ margin: "6px 0 0", fontSize: 14, color: tokens.colors.muted }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function Table({
  columns,
  children,
}: {
  columns: { label: string; width?: string }[];
  children: ReactNode;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                style={{
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tokens.colors.mutedSoft,
                  padding: "10px 12px",
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  width: c.width,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, colSpan }: { children?: ReactNode; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "12px",
        borderBottom: `1px solid ${tokens.colors.border}`,
        color: tokens.colors.primary,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        border: `1px dashed ${tokens.colors.borderHi}`,
        borderRadius: tokens.radius.lg,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.colors.secondary }}>
        {title}
      </p>
      {hint && (
        <p style={{ margin: "6px 0 0", fontSize: 13, color: tokens.colors.muted }}>{hint}</p>
      )}
    </div>
  );
}
