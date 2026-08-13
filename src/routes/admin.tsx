import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Skrytý vstup do adminu — na webu na něj není žádný odkaz.
 *
 * Přednostně /admin obsluhuje admin-proxy middleware (ADMIN_TARGET).
 * Tato routa je fallback pro samostatný web: přesměruje na ADMIN_URL
 * (produkční admin). Bez ADMIN_URL NEPŘESMĚRUJE na localhost — ukáže
 * jasnou hlášku, že admin není pro tento deploy nakonfigurovaný.
 */
const adminUrl = (process.env.ADMIN_URL ?? "").replace(/\/$/, "");

export const Route = createFileRoute("/admin")({
  component: AdminRedirect,
  server: {
    handlers: {
      GET: async () => {
        if (adminUrl) {
          return new Response(null, {
            status: 307,
            headers: { Location: `${adminUrl}/login` },
          });
        }
        return new Response(
          `<!doctype html><html lang="cs"><head><meta charset="utf-8"/><title>Admin není nakonfigurován</title></head>` +
            `<body style="margin:0;font-family:system-ui,sans-serif;background:#faf9f6;color:#1c1c1c;display:grid;place-items:center;min-height:100vh">` +
            `<div style="text-align:center;max-width:28rem;padding:2rem">` +
            `<h1 style="font-size:1.4rem;margin:0 0 .75rem">Administrace není nakonfigurovaná</h1>` +
            `<p style="font-size:.9rem;line-height:1.6;color:#5c5244">Pro tento web zatím není nasazený admin server. ` +
            `Nastavte environment proměnné ADMIN_TARGET a ADMIN_URL (viz DEPLOY.md).</p>` +
            `<p style="margin-top:1.2rem"><a href="/" style="color:#3f6f52">← Zpět na web</a></p>` +
            `</div></body></html>`,
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
        );
      },
    },
  },
});

function AdminRedirect() {
  useEffect(() => {
    if (adminUrl) window.location.replace(`${adminUrl}/login`);
  }, []);

  if (!adminUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Administrace není nakonfigurovaná</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pro tento web zatím není nasazený admin server. Nastavte ADMIN_TARGET a ADMIN_URL.
          </p>
          <p className="mt-5">
            <a href="/" className="text-sm font-medium text-sage-deep hover:underline">
              ← Zpět na web
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <p className="text-sm text-muted-foreground">Přesměrování do administrace…</p>
    </main>
  );
}
