import Link from "next/link";
import { Badge, Card, tokens } from "@admin/ui";
import { isResetEnabled } from "@/lib/services/passwordResetService";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const enabled = isResetEnabled();

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
        <h1 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 6px", fontSize: 17, letterSpacing: "-0.02em" }}>
          Admin Layer
          <Badge>Obnova hesla</Badge>
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: tokens.colors.muted }}>
          Zadejte e-mail, na který přijde ověřovací kód.
        </p>
        {!enabled && (
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
            Obnova hesla není nastavená — chybí ADMIN_EMAIL v konfiguraci.
          </div>
        )}
        <ForgotPasswordForm />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="/login"
            style={{ fontSize: 13, color: tokens.colors.muted, textDecoration: "none" }}
          >
            ← Zpět na přihlášení
          </Link>
        </div>
      </Card>
    </div>
  );
}
