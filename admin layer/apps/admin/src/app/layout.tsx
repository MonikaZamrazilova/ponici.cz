import type { Metadata } from "next";
import { tokens } from "@admin/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Layer",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          background: tokens.colors.bg,
          color: tokens.colors.primary,
          fontFamily: tokens.font.body,
          fontSize: 14,
        }}
      >
        {children}
      </body>
    </html>
  );
}
