import Link from "next/link";
import { tokens } from "@admin/ui";
import { canPermission } from "@/lib/auth";
import { adminConfig } from "@/lib/config";
import { Forbidden } from "@/components/Forbidden";

export const dynamic = "force-dynamic";

/**
 * Admin Dashboard — rozcestník správy webu.
 *
 * Nejdůležitější akce (vstup do editoru) je největší a nejvýraznější;
 * Média a Nastavení jsou sekundární karty. Žádné technické informace
 * (GitHub/Vercel/env) — systémové věci patří do Nastavení.
 */
export default async function AdminDashboardPage() {
  if (!(await canPermission("content:read"))) {
    return <Forbidden />;
  }

  const webBase = adminConfig.webUrl.replace(/\/$/, "");
  const editorHref = webBase === "" ? "/?edit=1" : `${webBase}?edit=1`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
        maxWidth: 720,
        margin: "0 auto",
        paddingTop: 12,
      }}
    >
      {/* Hero */}
      <header>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: tokens.colors.primary,
            margin: 0,
          }}
        >
          Správa webu
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: tokens.colors.muted,
            margin: "10px 0 0",
            maxWidth: 480,
          }}
        >
          Upravujte obsah, fotografie a nastavení vašeho webu.
        </p>
      </header>

      {/* Hlavní karta — vstup do editoru */}
      <Link
        href={editorHref}
        target={webBase !== "" ? "_blank" : undefined}
        rel={webBase !== "" ? "noopener noreferrer" : undefined}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            border: `1px solid ${tokens.colors.borderHi}`,
            borderRadius: 16,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FA 100%)",
            padding: "32px 32px 30px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
          }}
          className="admin-gate"
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: tokens.colors.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tokens.colors.primary,
            }}
          >
            {/* ikona — stylizovaná stránka s tužkou */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
              <path d="M14 3v5h5" />
              <path d="M12 16l-2.5-1 .9-2.4 2.5 1z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: tokens.colors.mutedSoft,
              }}
            >
              Editace webu
            </div>
            <h2
              style={{
                fontSize: 21,
                fontWeight: 700,
                color: tokens.colors.primary,
                margin: "8px 0 6px",
              }}
            >
              Vstoupit do editoru
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: tokens.colors.muted,
                margin: 0,
                maxWidth: 460,
              }}
            >
              Upravujte texty, ceny, FAQ a obsah stránek. Změny se ukládají do draftu — zveřejníte
              je jedním kliknutím.
            </p>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: tokens.colors.primary,
              marginTop: 2,
            }}
          >
            Pokračovat
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10" />
              <path d="m9 4 4 4-4 4" />
            </svg>
          </div>
        </div>
      </Link>

      {/* Sekundární karty */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        <Link href="/admin/projects/ponici/media" style={{ textDecoration: "none" }}>
          <div
            style={{
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: 14,
              background: tokens.colors.surface,
              padding: "22px 22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
              height: "100%",
            }}
            className="admin-card"
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: tokens.colors.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: tokens.colors.primary,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.5-3.5a2 2 0 0 0-3 0L6 20" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: tokens.colors.primary }}>
                Média
              </div>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: tokens.colors.muted,
                  margin: "5px 0 0",
                }}
              >
                Správa fotografií a souborů.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/admin/settings" style={{ textDecoration: "none" }}>
          <div
            style={{
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: 14,
              background: tokens.colors.surface,
              padding: "22px 22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
              height: "100%",
            }}
            className="admin-card"
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: tokens.colors.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: tokens.colors.primary,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: tokens.colors.primary }}>
                Nastavení
              </div>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: tokens.colors.muted,
                  margin: "5px 0 0",
                }}
              >
                Účet, zabezpečení a systémové možnosti.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
