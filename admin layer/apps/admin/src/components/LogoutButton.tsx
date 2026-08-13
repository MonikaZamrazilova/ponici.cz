"use client";

import { useRouter } from "next/navigation";
import { tokens } from "@admin/ui";

/**
 * Odhlášení — vždy viditelné tlačítko dole v sidebaru.
 * Client pouze kvůli onClick; ochrana je server-side.
 */
export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: tokens.colors.danger,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      ← Odhlásit se
    </button>
  );
}
