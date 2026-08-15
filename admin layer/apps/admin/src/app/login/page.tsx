import Link from "next/link";
import { isAdminEnabled } from "@admin/core";
import { Badge, Card, tokens } from "@admin/ui";
import { adminConfig } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { isResetEnabled } from "@/lib/services/passwordResetService";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string | string[]; reset?: string | string[] }>;
}) {
  const params = await searchParams;
  const expired = Array.isArray(params.expired) ? params.expired[0] : params.expired;
  const reset = Array.isArray(params.reset) ? params.reset[0] : params.reset;
  const disabled = !Object.values(adminConfig.passwords).some(isAdminEnabled);
  const resetEnabled = await isResetEnabled();

  const notice = disabled
    ? "Admin je vypnutý — chybí ADMIN_PASSWORD v konfiguraci."
    : expired
      ? "Session vypršela nebo byla odvolána — přihlaste se znovu."
      : reset
        ? "Heslo bylo změněno — přihlaste se novým heslem."
        : undefined;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 380, padding: 32 }}>
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "0 0 6px",
            fontSize: 17,
            letterSpacing: "-0.02em",
          }}
        >
          Admin Layer
          <Badge>Admin</Badge>
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: tokens.colors.muted }}>
          Přihlaste se heslem administrátora.
        </p>
        {notice && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: tokens.colors.warningSoft,
              color: tokens.colors.warning,
            }}
          >
            {notice}
          </div>
        )}
        <LoginForm disabled={disabled} />
        {resetEnabled && !disabled && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link
              href="/login/forgot"
              style={{ fontSize: 13, color: tokens.colors.muted, textDecoration: "none" }}
            >
              Zapomenuté heslo?
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
