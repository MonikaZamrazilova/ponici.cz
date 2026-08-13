import { createFileRoute } from "@tanstack/react-router";

/**
 * Skrytý vstup do adminu — na webu na něj není žádný odkaz.
 *
 * Přednostně /admin obsluhuje admin-proxy middleware (ADMIN_TARGET)
 * ve serveru webu — tato routa je jen fallback pro samostatný web
 * bez middleware (např. čistý statický deploy).
 *
 * NIKDY nepřesměrovává na jinou doménu (žádný ADMIN_URL redirect) —
 * vrací 503, takže URL v prohlížeči zůstává na www.ponici.cz.
 */
export const Route = createFileRoute("/admin")({
  component: AdminUnavailable,
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          `<!doctype html><html lang="cs"><head><meta charset="utf-8"/><title>Admin není dostupný</title></head>` +
            `<body style="margin:0;font-family:system-ui,sans-serif;background:#faf9f6;color:#1c1c1c;display:grid;place-items:center;min-height:100vh">` +
            `<div style="text-align:center;max-width:28rem;padding:2rem">` +
            `<h1 style="font-size:1.5rem;margin:0 0 .75rem">Admin není dostupný</h1>` +
            `<p style="font-size:.9rem;line-height:1.6;color:#5c5244">Administrace je momentálně nedostupná. ` +
            `Zkuste to prosím za chvíli.</p>` +
            `<p style="margin-top:1.2rem"><a href="/" style="color:#3f6f52">← Zpět na web</a></p>` +
            `</div></body></html>`,
          { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
        );
      },
    },
  },
});

function AdminUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Admin není dostupný</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrace je momentálně nedostupná. Zkuste to prosím za chvíli.
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
