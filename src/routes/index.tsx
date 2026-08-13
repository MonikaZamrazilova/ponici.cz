import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Trees,
  ShieldCheck,
  Sun,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Menu,
  X,
  PartyPopper,
} from "lucide-react";
import { Section } from "@/components/section";
import { Kicker, Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { Reveal } from "@/components/reveal";
import { Expandable } from "@/components/expandable";
import { getSite, phoneHref, type PriceContent, type ServiceContent } from "@/lib/repository";
import { EditModeProvider, useEditMode } from "@/components/edit/EditModeProvider";
import { EditableText } from "@/components/edit/EditableText";
import { EditableImage } from "@/components/edit/EditableImage";
import { EditModeToggle } from "@/components/edit/EditModeToggle";

const img = (name: string) => `/images/ponici/${name}`;

/** build-time obsah (pro SSR/head); runtime změny přicházejí přes admin mód */
const staticSite = getSite();

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "shield-check": ShieldCheck,
  sun: Sun,
  trees: Trees,
  "map-pin": MapPin,
  "party-popper": PartyPopper,
};

const SERVICE_ICON = (service: ServiceContent): LucideIcon =>
  SERVICE_ICONS[service.icon] ?? GraduationCap;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: `${staticSite.siteName} — pro děti i dospělé`,
  description: staticSite.jsonLdDescription,
  telephone: staticSite.phone.replace(/[\s\-()]/g, ""),
  email: staticSite.email,
  url: staticSite.baseUrl,
  address: {
    "@type": "PostalAddress",
    streetAddress: staticSite.locality,
    addressLocality: staticSite.address,
    addressCountry: "CZ",
  },
  areaServed: staticSite.address,
  sport: "Horseback riding",
};

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: `${staticSite.siteName} | pro děti i dospělé` },
      { name: "description", content: staticSite.jsonLdDescription },
      { property: "og:title", content: `${staticSite.siteName} | pro děti i dospělé` },
      { property: "og:description", content: staticSite.jsonLdDescription },
      { property: "og:url", content: staticSite.baseUrl },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: staticSite.baseUrl }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
});

function Nav() {
  const { site } = useEditMode();
  const navItems = [
    { label: "O nás", href: "#about" },
    { label: "Jízdy", href: "#jizdy" },
    { label: "Ceník", href: "#cenik" },
    { label: "Tábory", href: "#tabor" },
    { label: "Kontakt", href: "#contact" },
  ];
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 24,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled || mobileOpen
          ? "bg-background border-b border-border/60"
          : "bg-background max-sm:bg-background/60"
      }`}
    >
      <div className="mx-auto grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 md:min-h-20 md:grid-cols-[1fr_auto_1fr] md:px-10 md:py-0">
        <a href="#top" className="flex min-w-0 items-center" aria-label={site.siteName}>
          <EditableText
            kind="site"
            id="main"
            field="siteName"
            label="název webu"
            value={site.siteName}
          >
            <span className="text-xl font-semibold text-foreground md:text-3xl">
              {site.siteName}
            </span>
          </EditableText>
        </a>

        <nav className="hidden items-center gap-10 text-[13px] text-foreground/90 md:flex md:justify-center">
          {navItems.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-4"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <a
            href={phoneHref(site.phone)}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2 md:px-4 md:py-2 md:text-[13px]"
          >
            <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />{" "}
            <EditableText kind="site" id="main" field="phone" label="telefon" value={site.phone}>
              {site.phone}
            </EditableText>
          </a>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Zavřít menu" : "Otevřít menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navItems.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-[15px] text-foreground/90 transition-colors hover:bg-cream hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function HeroLines({ text, className }: { text: string; className: string }) {
  return (
    <Heading as="h1" size="xl" className={className}>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </Heading>
  );
}

function Hero() {
  const { site } = useEditMode();
  return (
    <section id="top" className="relative w-full overflow-hidden">
      {/* Mobile — image then text */}
      <div className="md:hidden pt-14">
        <div className="overflow-hidden rounded-3xl">
          <EditableImage kind="site" id="main" field="heroImage" label="úvodní fotografii">
            <img
              src={site.heroImage}
              alt="Skupina dětí s koňmi na louce u řeky v Praze"
              fetchPriority="high"
              className="w-full object-contain rounded-3xl"
              style={{ height: "45dvh", objectPosition: "center" }}
            />
          </EditableImage>
        </div>
        <div className="px-6 pt-8 pb-8">
          <div className="mx-auto max-w-lg">
            <EditableText
              kind="site"
              id="main"
              field="heroKicker"
              label="hero text (Praha · Císařský ostrov)"
              value={site.heroKicker}
            >
              <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-foreground/70">
                <span className="inline-block h-px w-6 bg-foreground/30" />
                {site.heroKicker}
              </span>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="heroTitle"
              label="hero titulek"
              value={site.heroTitle}
              multiline
            >
              <HeroLines
                text={site.heroTitle}
                className="mt-2 text-[11vw] sm:text-[3.25rem] md:text-[4rem] lg:text-[5rem] leading-[1.05] font-black break-normal"
              />
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="heroSubtitle"
              label="hero podtitulek"
              value={site.heroSubtitle}
              multiline
            >
              <p className="mt-2 max-w-sm text-[15px] leading-[1.65] font-medium text-[#3C2D19]">
                {site.heroSubtitle}
              </p>
            </EditableText>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <EditableText
                kind="site"
                id="main"
                field="heroCtaPrimary"
                label="hlavní tlačítko v hero"
                value={site.heroCtaPrimary}
              >
                <Button href="#contact" variant="primary">
                  {site.heroCtaPrimary}
                </Button>
              </EditableText>
              <EditableText
                kind="site"
                id="main"
                field="heroCtaSecondary"
                label="vedlejší tlačítko v hero"
                value={site.heroCtaSecondary}
              >
                <Button
                  href="#jizdy"
                  variant="secondary"
                  className="bg-cream/75 border-foreground/50"
                >
                  {site.heroCtaSecondary}
                </Button>
              </EditableText>
            </div>
          </div>
        </div>
      </div>

      {/* Tablet — unchanged */}
      <div className="hidden md:block lg:hidden mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:items-center md:gap-12 md:min-h-screen md:py-24">
          <div className="md:col-span-5 pt-8 md:pt-0 pb-8 md:pb-0">
            <EditableText
              kind="site"
              id="main"
              field="heroKicker"
              label="hero text (Praha · Císařský ostrov)"
              value={site.heroKicker}
            >
              <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-foreground/70">
                <span className="inline-block h-px w-6 bg-foreground/30" />
                {site.heroKicker}
              </span>
            </EditableText>

            <EditableText
              kind="site"
              id="main"
              field="heroTitle"
              label="hero titulek"
              value={site.heroTitle}
              multiline
            >
              <HeroLines
                text={site.heroTitle}
                className="mt-8 text-[11vw] sm:text-[3.25rem] md:text-[4rem] lg:text-[5rem] leading-[1.05] font-black break-normal"
              />
            </EditableText>

            <EditableText
              kind="site"
              id="main"
              field="heroSubtitle"
              label="hero podtitulek"
              value={site.heroSubtitle}
              multiline
            >
              <p className="mt-7 max-w-sm text-[15px] leading-[1.65] font-medium text-[#3C2D19] md:text-[17px]">
                {site.heroSubtitle}
              </p>
            </EditableText>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <EditableText
                kind="site"
                id="main"
                field="heroCtaPrimary"
                label="hlavní tlačítko v hero"
                value={site.heroCtaPrimary}
              >
                <Button href="#contact" variant="primary">
                  {site.heroCtaPrimary}
                </Button>
              </EditableText>
              <EditableText
                kind="site"
                id="main"
                field="heroCtaSecondary"
                label="vedlejší tlačítko v hero"
                value={site.heroCtaSecondary}
              >
                <Button
                  href="#jizdy"
                  variant="secondary"
                  className="bg-cream/75 border-foreground/50"
                >
                  {site.heroCtaSecondary}
                </Button>
              </EditableText>
            </div>
          </div>

          <div className="md:col-span-7 pt-24 md:pt-0">
            <div className="overflow-hidden rounded-3xl shadow-[0_20px_50px_-30px_rgba(60,45,25,0.25)]">
              <EditableImage kind="site" id="main" field="heroImage" label="úvodní fotografii">
                <img
                  src={site.heroImage}
                  alt="Skupina dětí s koňmi na louce u řeky v Praze"
                  width={1920}
                  height={1280}
                  fetchPriority="high"
                  className="w-full object-contain rounded-3xl"
                  style={{ aspectRatio: "16/9", objectPosition: "center" }}
                />
              </EditableImage>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop — image then text */}
      <div className="hidden lg:block mx-auto max-w-7xl px-6 lg:px-10">
        <div className="overflow-hidden rounded-3xl shadow-[0_20px_50px_-30px_rgba(60,45,25,0.25)]">
          <EditableImage kind="site" id="main" field="heroImage" label="úvodní fotografii">
            <img
              src={site.heroImage}
              alt="Skupina dětí s koňmi na louce u řeky v Praze"
              width={1920}
              height={1280}
              fetchPriority="high"
              className="w-full object-contain rounded-3xl"
              style={{ aspectRatio: "16/9", objectPosition: "center" }}
            />
          </EditableImage>
        </div>
        <div className="mt-14 lg:mt-16">
          <div className="max-w-[42rem]">
            <EditableText
              kind="site"
              id="main"
              field="heroKicker"
              label="hero text (Praha · Císařský ostrov)"
              value={site.heroKicker}
            >
              <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-foreground/70">
                <span className="inline-block h-px w-6 bg-foreground/30" />
                {site.heroKicker}
              </span>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="heroTitle"
              label="hero titulek"
              value={site.heroTitle}
              multiline
            >
              <HeroLines
                text={site.heroTitle}
                className="mt-8 text-[11vw] sm:text-[3.25rem] md:text-[4rem] lg:text-[4.75rem] leading-[1.05] font-black break-normal"
              />
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="heroSubtitle"
              label="hero podtitulek"
              value={site.heroSubtitle}
              multiline
            >
              <p className="mt-7 max-w-sm text-[15px] leading-[1.65] font-medium text-[#3C2D19] md:text-[17px]">
                {site.heroSubtitle}
              </p>
            </EditableText>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <EditableText
                kind="site"
                id="main"
                field="heroCtaPrimary"
                label="hlavní tlačítko v hero"
                value={site.heroCtaPrimary}
              >
                <Button href="#contact" variant="primary">
                  {site.heroCtaPrimary}
                </Button>
              </EditableText>
              <EditableText
                kind="site"
                id="main"
                field="heroCtaSecondary"
                label="vedlejší tlačítko v hero"
                value={site.heroCtaSecondary}
              >
                <Button
                  href="#jizdy"
                  variant="secondary"
                  className="bg-cream/75 border-foreground/50"
                >
                  {site.heroCtaSecondary}
                </Button>
              </EditableText>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const HERO_FEATURE_ICONS = [Trees, ShieldCheck, Sun, GraduationCap];

function About() {
  const { site } = useEditMode();
  const patchParagraph = (oldValue: string) => (newValue: string) => ({
    aboutParagraphs: site.aboutParagraphs.map((p) => (p === oldValue ? newValue : p)),
  });
  return (
    <Section id="about">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <EditableText
            kind="site"
            id="main"
            field="aboutKicker"
            label="text: O nás"
            value={site.aboutKicker}
          >
            <Kicker>— {site.aboutKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="aboutTitle"
            label="titulek sekce O nás"
            value={site.aboutTitle}
            multiline
          >
            <Heading className="mt-8">
              {site.aboutTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>

          <div className="mt-10 space-y-6 text-[16px] leading-[1.85] text-foreground/75 md:text-[17px]">
            {site.aboutParagraphs.map((p) => (
              <EditableText
                key={p}
                kind="site"
                id="main"
                field="aboutParagraphs"
                label="odstavec textu O nás"
                value={p}
                multiline
                buildPatch={patchParagraph(p)}
              >
                <p>{p}</p>
              </EditableText>
            ))}
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="mt-16 border-t border-border pt-10">
          <div className="flex flex-wrap justify-center gap-x-14 gap-y-8">
            {site.stats.map((s, i) => (
              <div key={s.label} className="text-center">
                <EditableText
                  kind="site"
                  id="main"
                  field="stats"
                  label="hodnotu statistiky"
                  value={s.value}
                  buildPatch={(v) => ({
                    stats: site.stats.map((x, xi) => (xi === i ? { ...x, value: v } : x)),
                  })}
                >
                  <div className="text-[1.75rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.25rem]">
                    {s.value}
                  </div>
                </EditableText>
                <EditableText
                  kind="site"
                  id="main"
                  field="stats"
                  label="popisek statistiky"
                  value={s.label}
                  buildPatch={(v) => ({
                    stats: site.stats.map((x, xi) => (xi === i ? { ...x, label: v } : x)),
                  })}
                >
                  <div className="mt-1.5 text-[11px] uppercase tracking-caption text-foreground/40">
                    {s.label}
                  </div>
                </EditableText>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function PonyPortrait() {
  const { site } = useEditMode();
  return (
    <Section id="setkani">
      <div className="overflow-hidden rounded-3xl">
        <EditableImage kind="site" id="main" field="setkaniImage" label="fotografii sekce Setkání">
          <img
            src={site.setkaniImage}
            alt="Detailní portrét bílého koně — jeho měkký čumák a zvědavé oči"
            loading="lazy"
            className="w-full object-cover"
            style={{ aspectRatio: "3/4", objectPosition: "center 35%" }}
          />
        </EditableImage>
      </div>
      <div className="mt-14 md:mt-20">
        <Reveal>
          <EditableText
            kind="site"
            id="main"
            field="setkaniKicker"
            label="text: Setkání"
            value={site.setkaniKicker}
          >
            <Kicker>— {site.setkaniKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="setkaniTitle"
            label="titulek sekce Setkání"
            value={site.setkaniTitle}
            multiline
          >
            <Heading className="mt-6" size="md">
              {site.setkaniTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="setkaniText"
            label="text sekce Setkání"
            value={site.setkaniText}
            multiline
          >
            <p className="mt-6 max-w-2xl text-[15.5px] leading-[1.85] text-foreground/80">
              {site.setkaniText}
            </p>
          </EditableText>
          <div className="mt-8">
            <EditableText
              kind="site"
              id="main"
              field="setkaniCta"
              label="tlačítko sekce Setkání"
              value={site.setkaniCta}
            >
              <Button href="#contact" variant="primary">
                {site.setkaniCta}
              </Button>
            </EditableText>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Programy() {
  const { site } = useEditMode();
  return (
    <Section id="programy" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <EditableText
              kind="site"
              id="main"
              field="programyKicker"
              label="text: Programy"
              value={site.programyKicker}
            >
              <Kicker>— {site.programyKicker}</Kicker>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="programyTitle"
              label="titulek sekce Programy"
              value={site.programyTitle}
              multiline
            >
              <Heading className="mt-8">
                {site.programyTitle.split("\n").map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </Heading>
            </EditableText>
          </div>
          <EditableText
            kind="site"
            id="main"
            field="programyIntro"
            label="úvod sekce Programy"
            value={site.programyIntro}
            multiline
          >
            <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
              {site.programyIntro}
            </p>
          </EditableText>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Reveal className="col-span-2 row-span-2">
          <EditableImage
            kind="site"
            id="main"
            field="programyImage1"
            label="velkou fotografii sekce Programy"
          >
            <img
              src={site.programyImage1}
              alt="Skupina s koněm pod kvetoucím stromem na jaře"
              loading="lazy"
              className="h-full w-full rounded-xl object-cover"
              style={{ aspectRatio: "4/5", objectPosition: "center 35%" }}
            />
          </EditableImage>
        </Reveal>
        <Reveal delay={60} className="col-span-2">
          <EditableImage
            kind="site"
            id="main"
            field="programyImage2"
            label="fotografii sekce Programy (2)"
          >
            <img
              src={site.programyImage2}
              alt="Jezdec stojí vedle koně na jízdárně a hladí ho"
              loading="lazy"
              className="h-full w-full rounded-xl object-cover"
              style={{ aspectRatio: "16/9", objectPosition: "center 40%" }}
            />
          </EditableImage>
        </Reveal>
        <Reveal delay={120}>
          <EditableImage
            kind="site"
            id="main"
            field="programyImage3"
            label="fotografii sekce Programy (3)"
          >
            <img
              src={site.programyImage3}
              alt="Jezdec na koni při západu slunce"
              loading="lazy"
              className="h-full w-full rounded-xl object-cover"
              style={{ aspectRatio: "4/3", objectPosition: "center" }}
            />
          </EditableImage>
        </Reveal>
        <Reveal delay={180}>
          <EditableImage
            kind="site"
            id="main"
            field="programyImage4"
            label="fotografii sekce Programy (4)"
          >
            <img
              src={site.programyImage4}
              alt="Osoba objímá bílého koně ve stáji"
              loading="lazy"
              className="h-full w-full rounded-xl object-cover"
              style={{ aspectRatio: "4/3", objectPosition: "center" }}
            />
          </EditableImage>
        </Reveal>
      </div>

      <Reveal>
        <div className="mt-10">
          <EditableText
            kind="site"
            id="main"
            field="programyParagraph"
            label="závěrečný text sekce Programy"
            value={site.programyParagraph}
            multiline
          >
            <p className="max-w-2xl text-[15.5px] leading-[1.85] text-foreground/75">
              {site.programyParagraph}
            </p>
          </EditableText>
        </div>
      </Reveal>
    </Section>
  );
}

function Jezdeni() {
  const { site, services } = useEditMode();
  return (
    <Section id="jizdy">
      <div className="text-center">
        <Reveal>
          <EditableText
            kind="site"
            id="main"
            field="jizdyKicker"
            label="text: Jízdy a výcvik"
            value={site.jizdyKicker}
          >
            <Kicker>— {site.jizdyKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="jizdyTitle"
            label="titulek sekce Jízdy"
            value={site.jizdyTitle}
            multiline
          >
            <Heading className="mt-8">
              {site.jizdyTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="jizdyIntro"
            label="úvod sekce Jízdy"
            value={site.jizdyIntro}
            multiline
          >
            <p className="mx-auto mt-6 max-w-md text-[15px] leading-[1.75] text-foreground/70">
              {site.jizdyIntro}
            </p>
          </EditableText>
        </Reveal>
      </div>

      <div className="mt-20 space-y-16 md:space-y-24">
        {services.map((s, i) => {
          const Icon = SERVICE_ICON(s);
          return (
            <Reveal key={s.id}>
              <article
                className={`grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-10 ${
                  s.layout === "wide"
                    ? "md:grid-cols-[7fr_5fr]"
                    : s.layout === "tall"
                      ? "md:grid-cols-[5fr_7fr]"
                      : "md:grid-cols-12"
                }`}
              >
                {s.layout === "wide" && (
                  <>
                    <div className="md:col-span-7 overflow-hidden rounded-xl">
                      <EditableImage
                        kind="service"
                        id={s.id}
                        field="image"
                        label={`fotografii aktivity ${s.title}`}
                      >
                        <img
                          src={s.image}
                          alt={s.title}
                          loading="lazy"
                          className="w-full object-cover"
                          style={{ aspectRatio: "16/10", objectPosition: "center 40%" }}
                        />
                      </EditableImage>
                    </div>
                    <div className="md:col-span-5">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {String(i + 1).padStart(2, "0")}
                      </span>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="title"
                        label={`název aktivity ${s.title}`}
                        value={s.title}
                      >
                        <Heading as="h3" size="md" className="mt-6">
                          {s.title}
                        </Heading>
                      </EditableText>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="body"
                        label={`popis aktivity ${s.title}`}
                        value={s.body}
                        multiline
                      >
                        <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                          {s.body}
                        </p>
                      </EditableText>
                      <EditableText
                        kind="site"
                        id="main"
                        field="serviceCta"
                        label="tlačítko aktivit"
                        value={site.serviceCta}
                      >
                        <Button href="#contact" variant="link" className="mt-8">
                          {site.serviceCta}
                        </Button>
                      </EditableText>
                    </div>
                  </>
                )}

                {s.layout === "tall" && (
                  <>
                    <div className="md:col-span-5 md:order-2">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {String(i + 1).padStart(2, "0")}
                      </span>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="title"
                        label={`název aktivity ${s.title}`}
                        value={s.title}
                      >
                        <Heading as="h3" size="md" className="mt-6">
                          {s.title}
                        </Heading>
                      </EditableText>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="body"
                        label={`popis aktivity ${s.title}`}
                        value={s.body}
                        multiline
                      >
                        <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                          {s.body}
                        </p>
                      </EditableText>
                      <EditableText
                        kind="site"
                        id="main"
                        field="serviceCta"
                        label="tlačítko aktivit"
                        value={site.serviceCta}
                      >
                        <Button href="#contact" variant="link" className="mt-8">
                          {site.serviceCta}
                        </Button>
                      </EditableText>
                    </div>
                    <div className="md:col-span-7 md:order-1 overflow-hidden rounded-xl">
                      <EditableImage
                        kind="service"
                        id={s.id}
                        field="image"
                        label={`fotografii aktivity ${s.title}`}
                      >
                        <img
                          src={s.image}
                          alt={s.title}
                          loading="lazy"
                          className="w-full object-cover"
                          style={{ aspectRatio: "3/4", objectPosition: "center 45%" }}
                        />
                      </EditableImage>
                    </div>
                  </>
                )}

                {s.layout === "split" && (
                  <>
                    <div className="md:col-span-6">
                      <EditableImage
                        kind="service"
                        id={s.id}
                        field="image"
                        label={`fotografii aktivity ${s.title}`}
                      >
                        <img
                          src={s.image}
                          alt={s.title}
                          loading="lazy"
                          className="w-full rounded-xl object-cover"
                          style={{ aspectRatio: "4/3", objectPosition: "center" }}
                        />
                      </EditableImage>
                    </div>
                    <div className="md:col-span-6">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {String(i + 1).padStart(2, "0")}
                      </span>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="title"
                        label={`název aktivity ${s.title}`}
                        value={s.title}
                      >
                        <Heading as="h3" size="md" className="mt-6">
                          {s.title}
                        </Heading>
                      </EditableText>
                      <EditableText
                        kind="service"
                        id={s.id}
                        field="body"
                        label={`popis aktivity ${s.title}`}
                        value={s.body}
                        multiline
                      >
                        <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                          {s.body}
                        </p>
                      </EditableText>
                      <EditableText
                        kind="site"
                        id="main"
                        field="serviceCta"
                        label="tlačítko aktivit"
                        value={site.serviceCta}
                      >
                        <Button href="#contact" variant="link" className="mt-8">
                          {site.serviceCta}
                        </Button>
                      </EditableText>
                    </div>
                  </>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <EditableText
          kind="site"
          id="main"
          field="jizdyNote"
          label="rozbalovací text sekce Jízdy"
          value={site.jizdyNote}
          multiline
        >
          <Expandable className="mt-16">{site.jizdyNote}</Expandable>
        </EditableText>
      </Reveal>
    </Section>
  );
}

function Vylety() {
  const { site } = useEditMode();
  const patchParagraph = (oldValue: string) => (newValue: string) => ({
    vyletyParagraphs: site.vyletyParagraphs.map((p) => (p === oldValue ? newValue : p)),
  });
  return (
    <Section id="vylety" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <EditableText
              kind="site"
              id="main"
              field="vyletyKicker"
              label="text: Výlety a příroda"
              value={site.vyletyKicker}
            >
              <Kicker>— {site.vyletyKicker}</Kicker>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="vyletyTitle"
              label="titulek sekce Výlety"
              value={site.vyletyTitle}
              multiline
            >
              <Heading className="mt-8">
                {site.vyletyTitle.split("\n").map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </Heading>
            </EditableText>
          </div>
          <EditableText
            kind="site"
            id="main"
            field="vyletyIntro"
            label="úvod sekce Výlety"
            value={site.vyletyIntro}
            multiline
          >
            <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
              {site.vyletyIntro}
            </p>
          </EditableText>
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <EditableImage
          kind="site"
          id="main"
          field="vyletyImageMain"
          label="velkou fotografii sekce Výlety"
        >
          <img
            src={site.vyletyImageMain}
            alt="Skupina na koních na vyjížďce lesem"
            loading="lazy"
            className="w-full rounded-xl object-cover"
            style={{ aspectRatio: "21/9", objectPosition: "center 40%" }}
          />
        </EditableImage>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        <Reveal>
          {site.vyletyParagraphs.map((p) => (
            <EditableText
              key={p}
              kind="site"
              id="main"
              field="vyletyParagraphs"
              label="odstavec sekce Výlety"
              value={p}
              multiline
              buildPatch={patchParagraph(p)}
            >
              <p className="text-[15.5px] leading-[1.85] text-foreground/75">{p}</p>
            </EditableText>
          ))}
        </Reveal>
        <Reveal delay={60} className="hidden md:block">
          <EditableImage
            kind="site"
            id="main"
            field="vyletyImage1"
            label="fotografii sekce Výlety (2)"
          >
            <img
              src={site.vyletyImage1}
              alt="Podzimní vyjížďka s koňmi"
              loading="lazy"
              className="h-full w-full rounded-lg object-cover"
              style={{ aspectRatio: "4/3", objectPosition: "center" }}
            />
          </EditableImage>
        </Reveal>
        <Reveal delay={120} className="hidden md:block">
          <EditableImage
            kind="site"
            id="main"
            field="vyletyImage2"
            label="fotografii sekce Výlety (3)"
          >
            <img
              src={site.vyletyImage2}
              alt="Skupina s koněm u řeky"
              loading="lazy"
              className="h-full w-full rounded-lg object-cover"
              style={{ aspectRatio: "4/3", objectPosition: "center" }}
            />
          </EditableImage>
        </Reveal>
      </div>
    </Section>
  );
}

function Staj() {
  const { site } = useEditMode();
  const patchParagraph = (oldValue: string) => (newValue: string) => ({
    stajParagraphs: site.stajParagraphs.map((p) => (p === oldValue ? newValue : p)),
  });
  return (
    <Section id="staj">
      <div className="grid grid-cols-1 gap-0 md:grid-cols-12 md:items-center md:gap-0">
        <Reveal className="md:col-span-8 md:pr-12">
          <div className="overflow-hidden rounded-xl">
            <EditableImage kind="site" id="main" field="stajImage" label="fotografii sekce Stáj">
              <img
                src={site.stajImage}
                alt="Dva bílí koně vedle sebe ve stáji"
                loading="lazy"
                className="w-full object-cover"
                style={{ aspectRatio: "4/3", objectPosition: "center" }}
              />
            </EditableImage>
          </div>
        </Reveal>

        <Reveal delay={80} className="md:col-span-4 mt-8 md:mt-0">
          <EditableText
            kind="site"
            id="main"
            field="stajKicker"
            label="text: Stáj a péče"
            value={site.stajKicker}
          >
            <Kicker>— {site.stajKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="stajTitle"
            label="titulek sekce Stáj"
            value={site.stajTitle}
            multiline
          >
            <Heading className="mt-6">
              {site.stajTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          {site.stajParagraphs.map((p, i) => (
            <EditableText
              key={p}
              kind="site"
              id="main"
              field="stajParagraphs"
              label="odstavec sekce Stáj"
              value={p}
              multiline
              buildPatch={patchParagraph(p)}
            >
              <p
                className={
                  i === 0
                    ? "mt-5 text-[15.5px] leading-[1.85] text-foreground/75"
                    : "mt-4 text-[14px] leading-[1.7] text-foreground/60"
                }
              >
                {p}
              </p>
            </EditableText>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}

function Gallery() {
  const { site } = useEditMode();
  const patchGallery = (index: number) => (newUrl: string) => ({
    galleryImages: site.galleryImages.map((g, i) => (i === index ? { ...g, image: newUrl } : g)),
  });
  const gallery = site.galleryImages;
  return (
    <Section id="gallery" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <EditableText
              kind="site"
              id="main"
              field="galleryKicker"
              label="text: Galerie"
              value={site.galleryKicker}
            >
              <Kicker>— {site.galleryKicker}</Kicker>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="galleryTitle"
              label="titulek sekce Galerie"
              value={site.galleryTitle}
              multiline
            >
              <Heading className="mt-8">
                {site.galleryTitle.split("\n").map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </Heading>
            </EditableText>
          </div>
          <EditableText
            kind="site"
            id="main"
            field="galleryIntro"
            label="úvod sekce Galerie"
            value={site.galleryIntro}
            multiline
          >
            <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
              {site.galleryIntro}
            </p>
          </EditableText>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {gallery[0] && (
          <Reveal className="col-span-2">
            <div className="overflow-hidden rounded-xl">
              <EditableImage
                kind="site"
                id="main"
                field="galleryImages"
                label="fotografii v galerii (1)"
                buildPatch={patchGallery(0)}
              >
                <img
                  src={gallery[0].image}
                  alt={gallery[0].alt}
                  loading="lazy"
                  className="h-full w-full object-contain"
                  style={{ aspectRatio: "16/9", objectPosition: "center" }}
                />
              </EditableImage>
            </div>
          </Reveal>
        )}
        {gallery[1] && (
          <Reveal delay={60}>
            <EditableImage
              kind="site"
              id="main"
              field="galleryImages"
              label="fotografii v galerii (2)"
              buildPatch={patchGallery(1)}
            >
              <img
                src={gallery[1].image}
                alt={gallery[1].alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
                style={{ aspectRatio: "3/4", objectPosition: "center" }}
              />
            </EditableImage>
          </Reveal>
        )}
        {gallery[2] && (
          <Reveal delay={120}>
            <EditableImage
              kind="site"
              id="main"
              field="galleryImages"
              label="fotografii v galerii (3)"
              buildPatch={patchGallery(2)}
            >
              <img
                src={gallery[2].image}
                alt={gallery[2].alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
                style={{ aspectRatio: "3/4", objectPosition: "center" }}
              />
            </EditableImage>
          </Reveal>
        )}
        {gallery[3] && (
          <Reveal delay={180}>
            <EditableImage
              kind="site"
              id="main"
              field="galleryImages"
              label="fotografii v galerii (4)"
              buildPatch={patchGallery(3)}
            >
              <img
                src={gallery[3].image}
                alt={gallery[3].alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
                style={{ aspectRatio: "4/3", objectPosition: "center" }}
              />
            </EditableImage>
          </Reveal>
        )}
        {gallery[4] && (
          <Reveal delay={240}>
            <EditableImage
              kind="site"
              id="main"
              field="galleryImages"
              label="fotografii v galerii (5)"
              buildPatch={patchGallery(4)}
            >
              <img
                src={gallery[4].image}
                alt={gallery[4].alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
                style={{ aspectRatio: "4/3", objectPosition: "center" }}
              />
            </EditableImage>
          </Reveal>
        )}
        {gallery[5] && (
          <Reveal delay={300} className="col-span-2">
            <EditableImage
              kind="site"
              id="main"
              field="galleryImages"
              label="fotografii v galerii (6)"
              buildPatch={patchGallery(5)}
            >
              <img
                src={gallery[5].image}
                alt={gallery[5].alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
                style={{ aspectRatio: "21/9", objectPosition: "center 45%" }}
              />
            </EditableImage>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

function Parties() {
  const { site } = useEditMode();
  return (
    <Section id="oslavy">
      <div className="overflow-hidden rounded-3xl">
        <EditableImage kind="site" id="main" field="oslavyImage" label="fotografii sekce Oslavy">
          <img
            src={site.oslavyImage}
            alt="Děti s koněm pod kvetoucím stromem během oslavy"
            loading="lazy"
            className="w-full object-cover"
            style={{ aspectRatio: "3/4", objectPosition: "center 40%" }}
          />
        </EditableImage>
      </div>
      <div className="mt-14 md:mt-20">
        <Reveal>
          <EditableText
            kind="site"
            id="main"
            field="oslavyKicker"
            label="text: Oslavy"
            value={site.oslavyKicker}
          >
            <Kicker>— {site.oslavyKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="oslavyTitle"
            label="titulek sekce Oslavy"
            value={site.oslavyTitle}
            multiline
          >
            <Heading className="mt-6" size="md">
              {site.oslavyTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="oslavyText"
            label="text sekce Oslavy"
            value={site.oslavyText}
            multiline
          >
            <p className="mt-6 max-w-2xl text-[16px] leading-[1.85] text-foreground/80 md:text-[17px]">
              {site.oslavyText}
            </p>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="oslavyNote"
            label="poznámku sekce Oslavy"
            value={site.oslavyNote}
            multiline
          >
            <Expandable className="mt-6 text-foreground/70">{site.oslavyNote}</Expandable>
          </EditableText>
          <div className="mt-8">
            <EditableText
              kind="site"
              id="main"
              field="oslavyCta"
              label="tlačítko sekce Oslavy"
              value={site.oslavyCta}
            >
              <Button href={phoneHref(site.phone)} variant="primary">
                {site.oslavyCta}
              </Button>
            </EditableText>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

const priceItems = (prices: PriceContent[]) => prices.filter((p) => p.type === "item");
const courseItem = (prices: PriceContent[]) => prices.find((p) => p.type === "course");

function Pricing() {
  const { site, prices } = useEditMode();
  const items = priceItems(prices);
  const course = courseItem(prices);
  return (
    <Section id="cenik" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <EditableText
              kind="site"
              id="main"
              field="pricingKicker"
              label="text: Ceník"
              value={site.pricingKicker}
            >
              <Kicker>— {site.pricingKicker}</Kicker>
            </EditableText>
            <EditableText
              kind="site"
              id="main"
              field="pricingTitle"
              label="titulek sekce Ceník"
              value={site.pricingTitle}
              multiline
            >
              <Heading className="mt-8">
                {site.pricingTitle.split("\n").map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </Heading>
            </EditableText>
          </div>
          <EditableText
            kind="site"
            id="main"
            field="pricingNote"
            label="poznámku sekce Ceník"
            value={site.pricingNote}
            multiline
          >
            <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
              {site.pricingNote}
            </p>
          </EditableText>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item, i) => (
          <Reveal key={item.id} delay={i * 50}>
            <article className="h-full rounded-lg border border-border bg-background p-6 md:p-8">
              <div className="flex items-start justify-between gap-6">
                <EditableText
                  kind="price"
                  id={item.id}
                  field="name"
                  label={`název položky ${item.name}`}
                  value={item.name}
                >
                  <h3 className="text-xl font-semibold leading-tight text-foreground">
                    {item.name}
                  </h3>
                </EditableText>
                <EditableText
                  kind="price"
                  id={item.id}
                  field="price"
                  label={`cenu položky ${item.name}`}
                  value={item.price}
                >
                  <div className="shrink-0 text-xl font-semibold text-sage-deep">{item.price}</div>
                </EditableText>
              </div>
              <EditableText
                kind="price"
                id={item.id}
                field="note"
                label={`poznámku položky ${item.name}`}
                value={item.note}
                multiline
              >
                <p className="mt-4 text-[14.5px] leading-[1.7] text-foreground/70">{item.note}</p>
              </EditableText>
            </article>
          </Reveal>
        ))}
      </div>

      {course && (
        <Reveal>
          <article className="mt-6 rounded-lg border border-sage-deep/25 bg-background p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <EditableText
                  kind="price"
                  id={course.id}
                  field="name"
                  label="název kurzu"
                  value={course.name}
                >
                  <Kicker>— {course.name}</Kicker>
                </EditableText>
                <EditableText
                  kind="price"
                  id={course.id}
                  field="title"
                  label="titulek kurzu"
                  value={course.title}
                  multiline
                >
                  <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">
                    {course.title}
                  </h3>
                </EditableText>
                <EditableText
                  kind="price"
                  id={course.id}
                  field="note"
                  label="text kurzu"
                  value={course.note}
                  multiline
                >
                  <p className="mt-3 text-[15px] leading-[1.75] text-foreground/70">
                    {course.note}
                  </p>
                </EditableText>
              </div>
              <EditableText
                kind="price"
                id={course.id}
                field="price"
                label="cenu kurzu"
                value={course.price}
              >
                <div className="text-3xl font-semibold text-sage-deep">{course.price}</div>
              </EditableText>
            </div>
          </article>
        </Reveal>
      )}
    </Section>
  );
}

function useFormspree(id: string) {
  const [state, setState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ status: "submitting" });
    const form = e.currentTarget;
    try {
      const res = await fetch(`https://formspree.io/f/${id}`, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setState({ status: "success" });
        form.reset();
      } else {
        const json = await res.json().catch(() => null);
        setState({
          status: "error",
          message: json?.error ?? "Odeslání se nezdařilo.",
        });
      }
    } catch {
      setState({
        status: "error",
        message: "Chyba připojení. Zkuste to prosím později.",
      });
    }
  };

  return { state, handleSubmit };
}

function CampApplication() {
  const { site } = useEditMode();
  const { state: campState, handleSubmit: handleCampSubmit } = useFormspree(site.formspreeId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const patchParagraph = (oldValue: string) => (newValue: string) => ({
    campParagraphs: site.campParagraphs.map((p) => (p === oldValue ? newValue : p)),
  });

  const fieldLabels: Record<string, string> = {
    jmeno_ditete: "Jméno dítěte",
    jmeno_rodice: "Jméno rodiče",
    email: "E-mail",
    telefon: "Telefon",
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const form = formRef.current;
    if (!form) return errs;
    const data = new FormData(form);
    const get = (n: string) => ((data.get(n) as string) || "").trim();

    const jmeno_ditete = get("jmeno_ditete");
    const jmeno_rodice = get("jmeno_rodice");
    const email = get("email");
    const telefon = get("telefon");

    if (!jmeno_ditete) errs.jmeno_ditete = "Vyplňte jméno dítěte";
    if (!jmeno_rodice) errs.jmeno_rodice = "Vyplňte jméno rodiče";

    if (!email) {
      errs.email = "Vyplňte e-mail";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Neplatný formát e-mailu";
    }

    if (!telefon) {
      errs.telefon = "Vyplňte telefon";
    } else if (!/^[\d\s-+()]{6,20}$/.test(telefon)) {
      errs.telefon = "Neplatný formát telefonu";
    }

    return errs;
  };

  const focusFirst = (errs: Record<string, string>) => {
    const key = Object.keys(errs)[0];
    if (!key || !formRef.current) return;
    const el = formRef.current.elements.namedItem(key) as HTMLElement | null;
    if (el) el.focus();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirst(errs);
      return;
    }
    await handleCampSubmit(e);
  };

  return (
    <Section id="tabor">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:items-stretch">
        <Reveal className="md:col-span-5">
          <EditableText
            kind="site"
            id="main"
            field="campKicker"
            label="text: Přihláška na tábor"
            value={site.campKicker}
          >
            <Kicker>— {site.campKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="campTitle"
            label="titulek sekce Tábor"
            value={site.campTitle}
            multiline
          >
            <Heading className="mt-8">
              {site.campTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          <div className="mt-8 space-y-4 text-[15.5px] leading-[1.8] text-foreground/75">
            {site.campParagraphs.map((p, i) => (
              <EditableText
                key={p}
                kind="site"
                id="main"
                field="campParagraphs"
                label="odstavec sekce Tábor"
                value={p}
                multiline
                buildPatch={patchParagraph(p)}
              >
                <p
                  className={
                    i === site.campParagraphs.length - 1
                      ? "text-[14px] leading-[1.7] text-foreground/70"
                      : undefined
                  }
                >
                  {p}
                </p>
              </EditableText>
            ))}
          </div>
          <EditableText
            kind="site"
            id="main"
            field="campCta"
            label="tlačítko sekce Tábor"
            value={site.campCta}
          >
            <Button href={phoneHref(site.phone)} variant="primary" className="mt-8">
              {site.campCta}
            </Button>
          </EditableText>
        </Reveal>

        <Reveal delay={80} className="md:col-span-7 md:h-full">
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="flex h-full flex-col rounded-lg border border-border bg-cream p-5 md:p-8"
          >
            <input type="hidden" name="_subject" value={site.campFormSubject} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Jméno dítěte", name: "jmeno_ditete", required: true },
                { label: "Věk dítěte", name: "vek_ditete" },
                { label: "Jméno rodiče", name: "jmeno_rodice", required: true },
                { label: "Telefon", name: "telefon", type: "tel", required: true },
                { label: "E-mail", name: "email", type: "email", required: true },
                { label: "Preferovaný termín", name: "termin" },
              ].map((field) => (
                <label key={field.name} className="block text-sm text-foreground/75">
                  <span>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </span>
                  <input
                    name={field.name}
                    type={field.type ?? "text"}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground outline-none focus:border-sage-deep"
                  />
                  {tried && errors[field.name] && (
                    <span className="mt-1 block text-[12px] leading-snug text-red-600">
                      {errors[field.name]}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm text-foreground/75">
              <span>Poznámka</span>
              <textarea
                name="poznamka"
                rows={4}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground outline-none focus:border-sage-deep"
              />
            </label>
            <button
              type="submit"
              disabled={campState.status === "submitting"}
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-50"
            >
              {campState.status === "submitting" ? "Odesílám…" : "Odeslat přihlášku"}
            </button>
            {campState.status === "success" && (
              <p className="mt-4 text-sm font-medium text-green-700">
                Děkujeme! Vaše přihláška byla úspěšně odeslána.
              </p>
            )}
            {campState.status === "error" && (
              <p className="mt-4 text-sm font-medium text-red-600">{campState.message}</p>
            )}
          </form>
        </Reveal>
      </div>
    </Section>
  );
}

function Faq() {
  const { site, faqs } = useEditMode();
  return (
    <Section id="faq" background="cream">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-4">
          <EditableText
            kind="site"
            id="main"
            field="faqKicker"
            label="text: FAQ"
            value={site.faqKicker}
          >
            <Kicker>— {site.faqKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="faqTitle"
            label="titulek sekce FAQ"
            value={site.faqTitle}
            multiline
          >
            <Heading className="mt-8" size="sm">
              {site.faqTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
        </Reveal>

        <Reveal delay={80} className="md:col-span-8">
          <dl className="divide-y divide-border">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="grid grid-cols-1 gap-2 py-6 md:grid-cols-[10rem_1fr] md:gap-8 md:py-8"
              >
                <EditableText
                  kind="faq"
                  id={faq.id}
                  field="question"
                  label="otázku v FAQ"
                  value={faq.question}
                >
                  <dt className="text-xl font-semibold text-foreground md:text-2xl">
                    {faq.question}
                  </dt>
                </EditableText>
                <EditableText
                  kind="faq"
                  id={faq.id}
                  field="answer"
                  label="odpověď v FAQ"
                  value={faq.answer}
                  multiline
                >
                  <dd className="text-[15px] leading-[1.75] text-foreground/75">{faq.answer}</dd>
                </EditableText>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}

function Contact() {
  const { site } = useEditMode();
  return (
    <Section id="contact">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-6">
          <EditableText
            kind="site"
            id="main"
            field="contactKicker"
            label="text: Kontakt"
            value={site.contactKicker}
          >
            <Kicker>— {site.contactKicker}</Kicker>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="contactTitle"
            label="titulek sekce Kontakt"
            value={site.contactTitle}
            multiline
          >
            <Heading className="mt-8">
              {site.contactTitle.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </Heading>
          </EditableText>
          <EditableText
            kind="site"
            id="main"
            field="contactText"
            label="text sekce Kontakt"
            value={site.contactText}
            multiline
          >
            <p className="mt-8 max-w-md text-[15px] leading-[1.8] text-foreground/75">
              {site.contactText}
            </p>
          </EditableText>

          <dl className="mt-14 space-y-10">
            {[
              {
                icon: Phone,
                dt: "Telefon",
                dd: (
                  <dd className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
                    <a
                      href={phoneHref(site.phone)}
                      className="transition-colors hover:text-sage-deep focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                    >
                      {site.phone}
                    </a>
                  </dd>
                ),
              },
              {
                icon: Mail,
                dt: "E-mail",
                dd: (
                  <dd className="mt-2 text-2xl font-semibold text-foreground md:text-[1.75rem] break-all">
                    <a
                      href={`mailto:${site.email}`}
                      className="transition-colors hover:text-sage-deep focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                    >
                      {site.email}
                    </a>
                  </dd>
                ),
              },
              {
                icon: MapPin,
                dt: "Lokalita",
                dd: (
                  <dd className="mt-2 text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                    {site.locality}
                    <br />
                    <span className="text-lg text-foreground/70 md:text-xl">{site.address}</span>
                  </dd>
                ),
              },
            ].map(({ icon: Icon, dt, dd }) => (
              <div key={dt} className="flex items-start gap-5">
                <Icon className="mt-2 h-4 w-4 text-sage-deep" />
                <div>
                  <dt className="text-micro uppercase tracking-caption text-muted-foreground">
                    {dt}
                  </dt>
                  {dd}
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button href={phoneHref(site.phone)} variant="primary">
              Zavolat
            </Button>
            <Button href={`mailto:${site.email}`} variant="secondary">
              Napsat e-mail
            </Button>
          </div>

          <EditableText
            kind="site"
            id="main"
            field="contactExpandable"
            label="rozbalovací text v Kontaktu"
            value={site.contactExpandable}
            multiline
          >
            <Expandable className="mt-10">{site.contactExpandable}</Expandable>
          </EditableText>
        </Reveal>

        <Reveal delay={80} className="md:col-span-6">
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Mapa — Císařský ostrov, Praha"
              src={`https://www.google.com/maps?q=${site.mapQuery}&output=embed`}
              className="h-64 w-full grayscale-[15%] contrast-[0.95] md:h-full md:min-h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 text-micro uppercase tracking-caption text-muted-foreground">
            GPS: {site.gps}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Footer() {
  const { site } = useEditMode();
  return (
    <footer className="border-t border-border bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center">
              <EditableText
                kind="site"
                id="main"
                field="siteName"
                label="název webu"
                value={site.siteName}
              >
                <span className="text-3xl font-semibold text-foreground">{site.siteName}</span>
              </EditableText>
            </div>
            <EditableText
              kind="site"
              id="main"
              field="footerDescription"
              label="popis v patičce"
              value={site.footerDescription}
              multiline
            >
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                {site.footerDescription}
              </p>
            </EditableText>
          </div>

          <div className="md:col-span-4">
            <div className="text-micro uppercase tracking-caption text-muted-foreground">
              Rozcestník
            </div>
            <ul className="mt-5 space-y-2 text-[14px] text-foreground/75">
              {[
                { label: "O nás", href: "#about" },
                { label: "Programy", href: "#programy" },
                { label: "Jízdy", href: "#jizdy" },
                { label: "Ceník", href: "#cenik" },
                { label: "Tábory", href: "#tabor" },
                { label: "Výlety", href: "#vylety" },
                { label: "Stáj", href: "#staj" },
                { label: "Galerie", href: "#gallery" },
                { label: "Kontakt", href: "#contact" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-4"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="text-micro uppercase tracking-caption text-muted-foreground">
              Kontakt
            </div>
            <ul className="mt-5 space-y-2 text-[14px] text-foreground/75">
              <li>
                <a
                  href={phoneHref(site.phone)}
                  className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                >
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2 break-all"
                >
                  {site.email}
                </a>
              </li>
              <li>
                {site.locality}, {site.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-micro uppercase tracking-caption text-muted-foreground md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()}{" "}
            <EditableText
              kind="site"
              id="main"
              field="footerCopyright"
              label="copyright v patičce"
              value={site.footerCopyright}
            >
              {site.footerCopyright}
            </EditableText>
          </div>
        </div>
      </div>
    </footer>
  );
}

function HeroFeatures() {
  const { site } = useEditMode();
  const patchFeature = (index: number) => (newValue: string) => ({
    heroFeatures: site.heroFeatures.map((f, i) => (i === index ? newValue : f)),
  });
  return (
    <div className="border-t border-foreground/8 bg-cream/80">
      <div className="mx-auto max-w-7xl px-6 py-5 md:px-10">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[10.5px] uppercase tracking-caption text-foreground sm:grid-cols-4">
          {site.heroFeatures.map((text, i) => {
            const Icon = HERO_FEATURE_ICONS[i % HERO_FEATURE_ICONS.length];
            return (
              <EditableText
                key={text}
                kind="site"
                id="main"
                field="heroFeatures"
                label="vlastnost v hero"
                value={text}
                buildPatch={patchFeature(i)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" /> {text}
                </div>
              </EditableText>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Index() {
  return (
    <EditModeProvider>
      <main className="min-h-screen bg-background text-foreground">
        <Nav />
        <div>
          <Hero />
          <HeroFeatures />
          <About />
          <PonyPortrait />
          <Programy />
          <Jezdeni />
          <Vylety />
          <Staj />
          <Parties />
          <Pricing />
          <CampApplication />
          <Gallery />
          <Faq />
          <Contact />
        </div>
        <Footer />
      </main>
      <EditModeToggle />
    </EditModeProvider>
  );
}
