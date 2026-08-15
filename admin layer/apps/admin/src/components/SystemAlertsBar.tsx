import Link from "next/link";
import { tokens } from "@admin/ui";
import type { SystemAlert } from "@/lib/services/alertsService";

const TONE = {
  success: { fg: tokens.colors.success, bg: tokens.colors.successSoft },
  warning: { fg: tokens.colors.warning, bg: tokens.colors.warningSoft },
  error: { fg: tokens.colors.danger, bg: tokens.colors.dangerSoft },
  info: { fg: tokens.colors.info, bg: tokens.colors.infoSoft },
} as const;

/**
 * Persistentní systémové alerty (A7.1) — banner pod topbarem.
 * Zobrazují se, dokud podmínka trvá; neblokují práci.
 */
export function SystemAlertsBar({ alerts }: { alerts: SystemAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Systémová oznámení"
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 20px 0" }}
    >
      {alerts.map((alert) => {
        const tone = TONE[alert.type];
        return (
          <div
            key={alert.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "8px 12px",
              borderRadius: 8,
              background: tone.bg,
              border: `1px solid ${tone.fg}`,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 700, color: tone.fg }}>{alert.title}</span>
            {alert.message && (
              <span style={{ color: tokens.colors.secondary }}>{alert.message}</span>
            )}
            {alert.link && (
              <Link
                href={alert.link.href}
                style={{
                  marginLeft: "auto",
                  color: tokens.colors.primary,
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {alert.link.label} →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
