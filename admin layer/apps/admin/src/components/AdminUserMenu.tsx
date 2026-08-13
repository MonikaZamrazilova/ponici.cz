"use client";

import { useRouter } from "next/navigation";
import { UserMenu, tokens } from "@admin/ui";

/**
 * Uživatelské menu v topbaru — role + odkazy + odhlášení.
 * Client pouze kvůli onClick odhlášení; samotná ochrana je server-side.
 */
export function AdminUserMenu({ role, roleLabel }: { role: string; roleLabel: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = [
    ...(role === "admin"
      ? [{ key: "settings", label: "Nastavení", href: "/admin/settings" as string }]
      : []),
    { key: "logout", label: "Odhlásit se", danger: true, onClick: logout },
  ];

  return (
    <UserMenu
      trigger={
        <>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: tokens.colors.primary,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            A
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tokens.colors.primary,
              display: "none",
            }}
            className="max-sm:inline"
          >
            Admin
          </span>
        </>
      }
      header={{ title: "Admin", caption: `role: ${roleLabel}` }}
      items={items}
    />
  );
}
