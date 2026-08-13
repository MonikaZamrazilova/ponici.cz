import type { Metadata } from "next";
import { getSite } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Demo Web",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const site = getSite();
  const email =
    site?.contact && typeof site.contact === "object"
      ? String((site.contact as { email?: string }).email ?? "")
      : "";
  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          background: "#FFFFFF",
          color: "#111111",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px clamp(20px, 5vw, 48px)",
            borderBottom: "1px solid rgba(17,17,17,0.08)",
          }}
        >
          <strong>{String(site?.siteName ?? "") || "Demo Web"}</strong>
          <span style={{ fontSize: 13, color: "rgba(17,17,17,0.5)" }}>{email}</span>
        </header>
        {children}
      </body>
    </html>
  );
}
