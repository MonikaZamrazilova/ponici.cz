import { tokens } from "@admin/ui";

/**
 * Indikátor aktuálního projektu (top bar).
 * active=false → globální kontext ("Všechny projekty").
 */
export function ProjectIndicator({ name, active }: { name: string; active: boolean }) {
  return (
    <div
      title={active ? `Aktuální projekt: ${name}` : "Globální kontext"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: 999,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: tokens.colors.secondary,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? tokens.colors.success : tokens.colors.mutedSoft,
        }}
      />
      {name}
    </div>
  );
}
