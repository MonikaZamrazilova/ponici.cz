import Link from "next/link";
import { Badge, Card, tokens } from "@admin/ui";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; devCode?: string | string[] }>;
}) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email ?? "";
  const devCode = Array.isArray(params.devCode) ? params.devCode[0] : params.devCode;

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
          <Badge>Nové heslo</Badge>
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: tokens.colors.muted }}>
          Zadejte kód z e-mailu a nové heslo{email ? ` pro ${email}` : ""}.
        </p>
        <ResetPasswordForm email={email} devCode={devCode} />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="/login/forgot"
            style={{ fontSize: 13, color: tokens.colors.muted, textDecoration: "none" }}
          >
            ← Kód nepřišel? Vyžádat znovu
          </Link>
        </div>
      </Card>
    </div>
  );
}
