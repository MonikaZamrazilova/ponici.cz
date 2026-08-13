import { Kicker, Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { getSite } from "@/lib/repository";

/**
 * Custom 404 — vizuálně součást webu, vždy s cestou zpět.
 * Sdílená mezi splat routou (/$) a root fallbackem (notFoundComponent).
 */

const QUICK_LINKS = [
  { label: "O nás", href: "/#about" },
  { label: "Jízdy", href: "/#jizdy" },
  { label: "Ceník", href: "/#cenik" },
  { label: "Tábory", href: "/#tabor" },
  { label: "Kontakt", href: "/#contact" },
];

export function NotFoundPage() {
  const site = getSite();
  const phoneHref = `tel:${site.phone.replace(/[\s\-()]/g, "")}`;

  return (
    <>
      {/* React 19 hoisting — metadata se dostanou do <head> i na SSR 404 */}
      <title>Stránka nenalezena | Jezdecká škola</title>
      <meta
        name="description"
        content="Požadovaná stránka neexistuje nebo byla přesunuta. Vraťte se na úvodní stránku jezdecké školy na Císařském ostrově v Praze."
      />
      <meta name="robots" content="noindex, nofollow" />
      <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <a href="/" className="text-xl font-semibold text-foreground md:text-3xl" aria-label={`${site.siteName} — úvod`}>
          {site.siteName}
        </a>
        <a
          href={phoneHref}
          className="rounded-full border border-foreground/20 px-4 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground hover:text-background md:px-4 md:py-2 md:text-[13px]"
        >
          {site.phone}
        </a>
      </header>

      <section className="flex flex-1 items-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-2xl text-center">
          <p
            aria-hidden
            className="text-[18vw] leading-none font-black tracking-tight text-foreground/10 select-none sm:text-[9rem]"
          >
            404
          </p>
          <Kicker>— Stránka nenalezena</Kicker>
          <Heading as="h1" size="md" className="mt-4">
            Tato stránka neexistuje.
          </Heading>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.75] text-foreground/70">
            Stránka byla přesunuta nebo nikdy neexistovala. Vraťte se na úvod a pokračujte na hlavní
            nabídku webu.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/">Zpět na úvod</Button>
            <Button href="/#jizdy" variant="secondary">
              Prozkoumat jízdy
            </Button>
          </div>
          <nav aria-label="Hlavní nabídka webu" className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-micro uppercase tracking-kicker text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <footer className="border-t border-border bg-cream">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-[12px] text-foreground/60 md:flex-row md:px-10">
          <span>
            {site.siteName} · {site.locality}, {site.address}
          </span>
          <a href={phoneHref} className="transition-colors hover:text-foreground">
            {site.phone}
          </a>
        </div>
      </footer>
      </main>
    </>
  );
}
