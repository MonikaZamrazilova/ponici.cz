import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Skrytý vstup do adminu — na webu na něj není žádný odkaz.
 * URL admin aplikace: env ADMIN_URL (výchozí localhost:3000 = dev admin).
 * Na stránce se majitel přihlásí (login je součástí admin aplikace).
 */
const adminUrl = (process.env.ADMIN_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const Route = createFileRoute("/admin")({
  component: AdminRedirect,
  server: {
    handlers: {
      GET: async () => {
        return new Response(null, {
          status: 307,
          headers: { Location: `${adminUrl}/login` },
        });
      },
    },
  },
});

function AdminRedirect() {
  useEffect(() => {
    window.location.replace(`${adminUrl}/login`);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <p className="text-sm text-muted-foreground">Přesměrování do administrace…</p>
    </main>
  );
}
