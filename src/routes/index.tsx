import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

} from "lucide-react";
import { Section } from "@/components/section";
import { Kicker, Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { Reveal } from "@/components/reveal";
import { Expandable } from "@/components/expandable";

const SITE_URL = "https://www.jezdecka-skola.cz";

const img = (name: string) => `/images/ponici/${name}`;

const FORMSPREE_ID = "mzdnkvwl";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "Jezdecká škola — pro děti i dospělé",
  description:
    "Jezdecká škola, individuální lekce, skokový výcvik, tábory a vyjížďky s koňmi na Císařském ostrově v Praze.",
  telephone: "+420721208118",
  email: "monika.zamrazilova@seznam.cz",
  url: SITE_URL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Císařský ostrov",
    addressLocality: "Praha",
    addressCountry: "CZ",
  },
  areaServed: "Praha",
  sport: "Horseback riding",
};

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Jezdecká škola | pro děti i dospělé" },
      {
        name: "description",
        content:
          "Jezdecká škola, individuální lekce, skokový výcvik, tábory a vyjížďky s koňmi na Císařském ostrově v Praze.",
      },
      { property: "og:title", content: "Jezdecká škola | pro děti i dospělé" },
      {
        property: "og:description",
        content:
          "Jezdecká škola, individuální lekce, skokový výcvik, tábory a vyjížďky s koňmi na Císařském ostrově v Praze.",
      },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
});

function Nav() {
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
          ? "backdrop-blur-md bg-background/75 border-b border-border/60"
          : "backdrop-blur-sm bg-background/10 max-sm:bg-background/60"
      }`}
    >
      <div className="mx-auto grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 md:min-h-20 md:grid-cols-[1fr_auto_1fr] md:px-10 md:py-0">
        <a href="#top" className="flex min-w-0 items-center" aria-label="Jezdecká škola">
          <span className="text-xl font-semibold text-foreground md:text-3xl">
            Jezdecká škola
          </span>
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
            href="tel:+420721208118"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2 md:px-4 md:py-2 md:text-[13px]"
          >
            <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" /> 721 208 118
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

function Hero() {
  return (
    <section id="top" className="relative w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:items-center md:gap-12 md:min-h-screen md:py-24">
          <div className="md:col-span-5 pt-8 md:pt-0 pb-8 md:pb-0">
            <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-foreground/70">
              <span className="inline-block h-px w-6 bg-foreground/30" />
              Praha · Císařský ostrov
            </span>

            <Heading as="h1" size="xl" className="mt-8">
              Jezdecká škola
              <br />
              pro děti
              <br />i&nbsp;dospělé.
            </Heading>

            <p className="mt-7 max-w-sm text-[15px] leading-[1.65] font-medium text-[#3C2D19] md:text-[17px]">
              Individuální lekce, skokový výcvik, vyjížďky do Stromovky
              a&nbsp;tábory s&nbsp;koňmi na&nbsp;Císařském ostrově v&nbsp;Praze.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="#contact" variant="primary">
                Domluvit jízdu
              </Button>
              <Button
                href="#jizdy"
                variant="secondary"
                className="bg-cream/75 border-foreground/50"
              >
                Prozkoumat aktivity
              </Button>
            </div>
          </div>

          <div className="md:col-span-7 pt-24 md:pt-0">
            <div className="overflow-hidden rounded-3xl shadow-[0_20px_50px_-30px_rgba(60,45,25,0.25)]">
              <img
                src={img("hero-skupina-deti-kone.jpg")}
                alt="Skupina dětí s koňmi na louce u řeky v Praze"
                width={1920}
                height={1280}
                fetchPriority="high"
                className="w-full object-cover"
                style={{ aspectRatio: "3/2", objectPosition: "center 48%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const heroFeatures = [
  { icon: Trees, text: "Císařský ostrov" },
  { icon: ShieldCheck, text: "Skokový výcvik" },
  { icon: Sun, text: "Tábory od 6 let" },
  { icon: GraduationCap, text: "Příprava na ZZVJ" },
];

function About() {
  return (
    <Section id="about">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <Kicker>— O nás</Kicker>
          <Heading className="mt-8">
            Jízdy, péče
            <br />a&nbsp;radost z&nbsp;pohybu.
          </Heading>

          <div className="mt-10 space-y-6 text-[16px] leading-[1.85] text-foreground/75 md:text-[17px]">
            <p>
              Jsme jezdecká škola, kde mohou děti i dospělí trávit čas
              venku, poznávat koně a získávat jistotu v sedle. Na
              Císařském ostrově v Praze nabízíme individuální lekce,
              pravidelný výcvik i vyjížďky do Stromovky.
            </p>
            <p>
              Jezdecké lekce vedeme už více než 20 let. Za tu dobu jsme
              pomohli stovkám dětí i dospělých najít jistotu v sedle
              a&nbsp;klidný vztah ke koním.
            </p>
            <p>
              Začít může každý, kdo má chuť poznat koně blíž. Někdo přijde
              za prvními kroky v sedle, jiný už míří ke skokovým lekcím nebo
              přípravě na ZZVJ. Společné ale zůstává radost z pohybu, pobyt
              venku a respekt ke koním.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="mt-16 border-t border-border pt-10">
          <div className="flex flex-wrap justify-center gap-x-14 gap-y-8">
            {[
              { n: "20+", l: "let zkušeností" },
              { n: "Císařský ostrov", l: "Praha" },
              { n: "Stromovka", l: "v okolí" },
              {
                n: "Příprava na ZZVJ",
                l: "Zkoušky základního výcviku jezdce",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-[1.75rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.25rem]">
                  {s.n}
                </div>
                <div className="mt-1.5 text-[11px] uppercase tracking-caption text-foreground/40">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function PonyPortrait() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={img("detail-tvar-ponika.jpg")}
          alt="Detailní portrét bílého koně — jeho měkký čumák a zvědavé oči"
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center 35%" }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 md:px-10 md:py-52">
        <div className="max-w-lg">
          <Reveal>
            <Kicker>— Setkání</Kicker>
            <Heading className="mt-8" size="md">
              Každý kůň má
              <br />
              svou povahu.
            </Heading>
            <p className="mt-6 text-[15.5px] leading-[1.85] text-foreground/80">
              Nejde jen o jízdy. Jde o vztah a o moment, kdy si člověk
              ke koni najde cestu sám. Poznává jeho povahu, učí se naslouchat
              a respektovat. Více než 20 let zkušeností nás naučilo, že každý
              kůň i&nbsp;každý jezdec potřebuje svůj čas.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}


function Programy() {
  return (
    <Section id="programy" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Kicker>— Programy</Kicker>
            <Heading className="mt-8">
              Blízkost, která
              <br />
              zůstává.
            </Heading>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
            Nejkrásnější okamžiky se dějí, když člověk a kůň najdou společnou
            řeč. Programy přizpůsobíme věku, zkušenostem i&nbsp;domluvě.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Reveal className="col-span-2 row-span-2">
          <img
            src={img("deti-kone-strom.jpg")}
            alt="Skupina s koněm pod kvetoucím stromem na jaře"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/5", objectPosition: "center 35%" }}
          />
        </Reveal>
        <Reveal delay={60} className="col-span-2">
          <img
            src={img("portret-dite-kun-jizdarna.jpg")}
            alt="Jezdec stojí vedle koně na jízdárně a hladí ho"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "16/9", objectPosition: "center 40%" }}
          />
        </Reveal>
        <Reveal delay={120}>
          <img
            src={img("zapad-slunce-dite.jpg")}
            alt="Jezdec na koni při západu slunce"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={180}>
          <img
            src={img("objimani-kun.jpg")}
            alt="Osoba objímá bílého koně ve stáji"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
      </div>

      <Reveal>
        <div className="mt-10">
          <p className="max-w-2xl text-[15.5px] leading-[1.85] text-foreground/75">
            Nabízíme individuální i skupinové lekce, skokový výcvik, přípravu
            na ZZVJ a narozeninové oslavy. Každý program přizpůsobíme věku,
            zkušenostem a cílům jezdce.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}

const jizdy = [
  {
    icon: GraduationCap,
    kicker: "01",
    title: "Individuální lekce",
    body: "První i\u00A0další kroky v\u00A0sedle. Začínáme v\u00A0klidném tempu, postupně budujeme jistotu, rovnováhu a\u00A0samostatnost. Vhodné pro děti i\u00A0dospělé.",
    img: img("jizdarna-pohyb.jpg"),
    layout: "wide",
  },
  {
    icon: ShieldCheck,
    kicker: "02",
    title: "Skokový výcvik",
    body: "Skokové lekce od jednoduchých překážek po náročnější práci na jízdárně pod vedením zkušených lektorů. Vždy podle věku, jistoty a\u00A0zkušeností jezdce.",
    img: img("jizda-ponik-zepredu.jpg"),
    layout: "tall",
  },
  {
    icon: Sun,
    kicker: "03",
    title: "Příprava na ZZVJ",
    body: "Pro jezdce, kteří se chtějí připravit na zkoušky základního výcviku jezdce. Systematická příprava na jízdárně i\u00A0v\u00A0teorii.",
    img: img("jizdarna-dve-jezdkyne.jpg"),
    layout: "split",
  },
];

function Jezdeni() {
  return (
    <Section id="jizdy">
      <div className="text-center">
        <Reveal>
          <Kicker>— Jízdy a výcvik</Kicker>
          <Heading className="mt-8">
            Jízdy na koních
            <br />a&nbsp;jezdecký výcvik.
          </Heading>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-[1.75] text-foreground/70">
            Od prvních krůčků v sedle po přípravu na zkoušky základního výcviku
            jezdce.
          </p>
        </Reveal>
      </div>

      <div className="mt-20 space-y-16 md:space-y-24">
        {jizdy.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title}>
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
                      <img
                        src={s.img}
                        alt={s.title}
                        loading="lazy"
                        className="w-full object-cover"
                        style={{ aspectRatio: "16/10", objectPosition: "center 40%" }}
                      />
                    </div>
                    <div className="md:col-span-5">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {s.kicker}
                      </span>
                      <Heading as="h3" size="md" className="mt-6">
                        {s.title}
                      </Heading>
                      <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                        {s.body}
                      </p>
                      <Button href="#contact" variant="link" className="mt-8">
                        Domluvit jízdy
                      </Button>
                    </div>
                  </>
                )}

                {s.layout === "tall" && (
                  <>
                    <div className="md:col-span-5 md:order-2">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {s.kicker}
                      </span>
                      <Heading as="h3" size="md" className="mt-6">
                        {s.title}
                      </Heading>
                      <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                        {s.body}
                      </p>
                      <Button href="#contact" variant="link" className="mt-8">
                        Domluvit jízdy
                      </Button>
                    </div>
                    <div className="md:col-span-7 md:order-1 overflow-hidden rounded-xl">
                      <img
                        src={s.img}
                        alt={s.title}
                        loading="lazy"
                        className="w-full object-cover"
                        style={{ aspectRatio: "3/4", objectPosition: "center 45%" }}
                      />
                    </div>
                  </>
                )}

                {s.layout === "split" && (
                  <>
                    <div className="md:col-span-6">
                      <img
                        src={s.img}
                        alt={s.title}
                        loading="lazy"
                        className="w-full rounded-xl object-cover"
                        style={{ aspectRatio: "4/3", objectPosition: "center" }}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <span className="inline-flex items-center gap-2 text-micro uppercase tracking-caption text-sage-deep">
                        <Icon className="h-3.5 w-3.5" /> {s.kicker}
                      </span>
                      <Heading as="h3" size="md" className="mt-6">
                        {s.title}
                      </Heading>
                      <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
                        {s.body}
                      </p>
                      <Button href="#contact" variant="link" className="mt-8">
                        Domluvit jízdy
                      </Button>
                    </div>
                  </>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <Expandable className="mt-16">
          Každý začíná jinak. Proto u nás najdou prostor jak ti, kteří se
          s koňmi teprve seznamují, tak jezdci, kteří chtějí rozvíjet
          techniku a jistotu v sedle.
        </Expandable>
      </Reveal>
    </Section>
  );
}

function Vylety() {
  return (
    <Section id="vylety" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Kicker>— Výlety a příroda</Kicker>
            <Heading className="mt-8">
              Vyjížďky
              <br />do&nbsp;Stromovky.
            </Heading>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
            Klidné vyjížďky do Stromovky a okolí Císařského ostrova podle
            domluvy a zkušeností jezdce.
          </p>
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <img
          src={img("vyjizdka-les-skupina.jpg")}
          alt="Skupina na koních na vyjížďce lesem"
          loading="lazy"
          className="w-full rounded-xl object-cover"
          style={{ aspectRatio: "21/9", objectPosition: "center 40%" }}
        />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        <Reveal>
          <p className="text-[15.5px] leading-[1.85] text-foreground/75">
            Vyjížďky do Stromovky a okolí Císařského ostrova jsou ideální
            pro jezdce, kteří si chtějí užít jízdu v terénu. Trasy
            přizpůsobíme zkušenostem a náladě.
          </p>
        </Reveal>
        <Reveal delay={60} className="hidden md:block">
          <img
            src={img("vyjizdka-podzim.jpg")}
            alt="Podzimní vyjížďka s koňmi"
            loading="lazy"
            className="h-full w-full rounded-lg object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={120} className="hidden md:block">
          <img
            src={img("reka-skupina-kone.jpg")}
            alt="Skupina s koněm u řeky"
            loading="lazy"
            className="h-full w-full rounded-lg object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
      </div>
    </Section>
  );
}

function Staj() {
  return (
    <Section id="staj">
      <div className="grid grid-cols-1 gap-0 md:grid-cols-12 md:items-center md:gap-0">
        <Reveal className="md:col-span-8 md:pr-12">
          <div className="overflow-hidden rounded-xl">
            <img
              src={img("staj-dva-ponici.jpg")}
              alt="Dva bílí koně vedle sebe ve stáji"
              loading="lazy"
              className="w-full object-cover"
              style={{ aspectRatio: "4/3", objectPosition: "center" }}
            />
          </div>
        </Reveal>

        <Reveal delay={80} className="md:col-span-4 mt-8 md:mt-0">
          <Kicker>— Stáj a péče</Kicker>
          <Heading className="mt-6">
            Vztah ke koním
            <br />
            začíná ve stáji.
          </Heading>
          <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/75">
            Péče o koně je stejně důležitá jako samotné jízdy. Učíme se
            starat se o zvíře, poznáváme jeho potřeby a získáváme zodpovědnost.
            Právě tady se rodí ten nejupřímnější vztah.
          </p>
          <p className="mt-4 text-[14px] leading-[1.7] text-foreground/60">
            Nejen jízdy, ale i péče, naslouchání a trpělivost.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

function Gallery() {
  return (
    <Section id="gallery" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Kicker>— Galerie</Kicker>
            <Heading className="mt-8">
              Malé momenty,
              <br />
              které zůstávají.
            </Heading>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
            Vybrané okamžiky z&nbsp;našich dní. Bez filtrů, bez inscenace.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Reveal className="col-span-2">
          <img
            src={img("jizdarna-skupina.jpg")}
            alt="Skupina jezdců na koních na jízdárně"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "16/9", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={60}>
          <img
            src={img("staj-ponik-dvere.jpg")}
            alt="Kůň ve dveřích stáje"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "3/4", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={120}>
          <img
            src={img("vyjizdka-podzim.jpg")}
            alt="Podzimní vyjížďka lesní cestou"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "3/4", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={180}>
          <img
            src={img("reka-skupina-kone.jpg")}
            alt="Skupina s koněm u řeky"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={240}>
          <img
            src={img("vecerni-jizda.jpg")}
            alt="Večerní jízda na koni"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/3", objectPosition: "center" }}
          />
        </Reveal>
        <Reveal delay={300} className="col-span-2">
          <img
            src={img("deti-reka-ponici.jpg")}
            alt="Skupina s koňmi v řece"
            loading="lazy"
            className="h-full w-full rounded-xl object-cover"
            style={{ aspectRatio: "21/9", objectPosition: "center 30%" }}
          />
        </Reveal>
      </div>
    </Section>
  );
}

function Parties() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={img("deti-kone-strom.jpg")}
          alt="Děti s koněm pod kvetoucím stromem během oslavy"
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-background/10" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-28 text-center md:px-10 md:py-44">
        <Reveal>
          <Kicker>— Oslavy</Kicker>
          <Heading className="mt-6" size="md">
            Narozeninové
            <br />
            oslavy s&nbsp;koňmi.
          </Heading>
          <p className="mx-auto mt-6 max-w-md text-[16px] leading-[1.85] text-foreground/80 md:text-[17px]">
            Uspořádejte oslavu s koňmi v krásném
            prostředí Stromovky.
          </p>
          <Expandable className="mt-6 text-foreground/70">
            Ozvěte se nám a společně domluvíme možnosti oslavy.
          </Expandable>
          <div className="mt-8">
            <Button href="tel:+420721208118" variant="primary">
              Zavolat a domluvit oslavu
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const priceItems = [
  { name: "Individuální lekce děti", price: "1 000 Kč", note: "Jezdecká lekce podle věku a zkušeností dítěte." },
  { name: "Individuální lekce dospělí", price: "1 200 Kč", note: "Výcvik pro začátečníky i pokročilejší jezdce." },
  { name: "30minutová procházka", price: "600 Kč", note: "Klidná procházka s koněm pro první seznámení." },
  { name: "Vyjížďka do Stromovky", price: "1 500 Kč", note: "Terénní vyjížďka do Stromovky po předchozí domluvě." },
];

function Pricing() {
  return (
    <Section id="cenik" background="cream">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Kicker>— Ceník</Kicker>
            <Heading className="mt-8">
              Lekce, kurzy
              <br />a&nbsp;vyjížďky.
            </Heading>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.75] text-foreground/70">
            Lekci je potřeba omluvit nejpozději 24 hodin předem. Permanentka
            platí 3 měsíce od zakoupení.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
        {priceItems.map((item, i) => (
          <Reveal key={item.name} delay={i * 50}>
            <article className="h-full rounded-lg border border-border bg-background p-6 md:p-8">
              <div className="flex items-start justify-between gap-6">
                <h3 className="text-xl font-semibold leading-tight text-foreground">
                  {item.name}
                </h3>
                <div className="shrink-0 text-xl font-semibold text-sage-deep">
                  {item.price}
                </div>
              </div>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-foreground/70">
                {item.note}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <article className="mt-6 rounded-lg border border-sage-deep/25 bg-background p-6 md:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Kicker>— 3 měsíční kurz</Kicker>
              <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">
                Středa od 9. 9., 16:30-18:00
              </h3>
              <p className="mt-3 text-[15px] leading-[1.75] text-foreground/70">
                Pravidelný kurz v malé skupině, celkem 12 lekcí.
              </p>
            </div>
            <div className="text-3xl font-semibold text-sage-deep">
              8 500 Kč
            </div>
          </div>
        </article>
      </Reveal>
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
  const { state: campState, handleSubmit: handleCampSubmit } = useFormspree(FORMSPREE_ID);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
    const get = (n: string) => (data.get(n) as string || "").trim();

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
    } else if (!/^[\d\s\-\+\(\)]{6,20}$/.test(telefon)) {
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
          <Kicker>— Přihláška na tábor</Kicker>
          <Heading className="mt-8">
            Letní tábor
            <br />s&nbsp;koňmi.
          </Heading>
          <div className="mt-8 space-y-4 text-[15.5px] leading-[1.8] text-foreground/75">
            <p>
              Příměstské tábory jsou pro děti od 6 let. Během týdne se děti
              věnují jízdě, péči o koně, hrám a společnému programu u stáje.
            </p>
            <p>
              Program probíhá v malých skupinách na Císařském ostrově.
              Orientační cena tábora je 6 500 Kč za turnus.
            </p>
            <p className="text-[14px] leading-[1.7] text-foreground/70">
              Termíny 2026: červenec 6.–10., 13.–17., 20.–24., 27.–31. · srpen
              10.–14., 17.–21., 24.–28.
            </p>
          </div>
          <Button href="tel:+420721208118" variant="primary" className="mt-8">
            Zavolat kvůli táboru
          </Button>
        </Reveal>

        <Reveal delay={80} className="md:col-span-7 md:h-full">
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="flex h-full flex-col rounded-lg border border-border bg-cream p-5 md:p-8"
          >
            <input type="hidden" name="_subject" value="Přihláška na tábor - Jezdecká škola" />
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
              <p className="mt-4 text-sm font-medium text-red-600">
                {campState.message}
              </p>
            )}
          </form>
        </Reveal>
      </div>
    </Section>
  );
}

function Faq() {
  return (
    <Section id="faq" background="cream">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-4">
          <Kicker>— FAQ</Kicker>
          <Heading className="mt-8" size="sm">
            Často kladené otázky.
          </Heading>
        </Reveal>

        <Reveal delay={80} className="md:col-span-8">
          <dl className="divide-y divide-border">
            {[
              {
                q: "Kde vás najdeme?",
                a: "Na Císařském ostrově v Praze, v blízkosti Stromovky.",
              },
              {
                q: "Pro jaký věk jsou vaše programy?",
                a: "Lekce jsou pro děti i dospělé. Tábory jsou pro děti od 6 let.",
              },
              {
                q: "Kdy začíná 3 měsíční kurz?",
                a: "Kurz začíná 9. 9. a probíhá ve středu od 16:30 do 18:00. Cena je 8 500 Kč.",
              },
              {
                q: "Jak dlouho platí permanentka?",
                a: "Permanentka platí 3 měsíce od zakoupení.",
              },
              {
                q: "Do kdy je možné omluvit lekci?",
                a: "Lekci je potřeba omluvit nejpozději 24 hodin předem.",
              },
              {
                q: "Jak domluvit narozeninovou oslavu?",
                a: "Zavolejte na +420 721 208 118.",
              },
              {
                q: "Jak se přihlásit nebo získat více informací?",
                a: "Zavolejte nebo napište na uvedené kontakty.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="grid grid-cols-1 gap-2 py-6 md:grid-cols-[10rem_1fr] md:gap-8 md:py-8"
              >
                <dt className="text-xl font-semibold text-foreground md:text-2xl">
                  {q}
                </dt>
                <dd className="text-[15px] leading-[1.75] text-foreground/75">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}

function Contact() {
  return (
    <Section id="contact">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-6">
          <Kicker>— Kontakt</Kicker>
          <Heading className="mt-8">
            Kontaktujte
            <br />
            nás.
          </Heading>
          <p className="mt-8 max-w-md text-[15px] leading-[1.8] text-foreground/75">
            Pro informace o jízdách, táborech nebo narozeninových oslavách nám
            zavolejte nebo napište.
          </p>

          <dl className="mt-14 space-y-10">
            {[
              {
                icon: Phone,
                dt: "Telefon",
                dd: (
                  <dd className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
                    <a
                      href="tel:+420721208118"
                      className="transition-colors hover:text-sage-deep focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                    >
                      +420 721 208 118
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
                      href="mailto:monika.zamrazilova@seznam.cz"
                      className="transition-colors hover:text-sage-deep focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                    >
                      monika.zamrazilova@seznam.cz
                    </a>
                  </dd>
                ),
              },
              {
                icon: MapPin,
                dt: "Lokalita",
                dd: (
                  <dd className="mt-2 text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                    Císařský ostrov
                    <br />
                    <span className="text-lg text-foreground/70 md:text-xl">
                      Praha
                    </span>
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
            <Button href="tel:+420721208118" variant="primary">
              Zavolat
            </Button>
            <Button
              href="mailto:monika.zamrazilova@seznam.cz"
              variant="secondary"
            >
              Napsat e-mail
            </Button>
          </div>

          <Expandable className="mt-10">
            Máte otázku k jízdám, táborům nebo narozeninové oslavě? Zavolejte
            nám nebo napište. Rádi vám řekneme, jak to u nás funguje, a
            domluvíme další krok.
          </Expandable>

        </Reveal>

        <Reveal delay={80} className="md:col-span-6">
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Mapa — Císařský ostrov, Praha"
              src="https://www.google.com/maps?q=4C68%2BWF+Praha+7&output=embed"
              className="h-64 w-full grayscale-[15%] contrast-[0.95] md:h-full md:min-h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 text-micro uppercase tracking-caption text-muted-foreground">
            GPS: 4C68+WF Praha 7 (Císařský ostrov)
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center">
              <span className="text-3xl font-semibold text-foreground">Jezdecká škola</span>
            </div>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              Jezdecká škola pro děti i dospělé. Císařský ostrov, Praha.
            </p>
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
                  href="tel:+420721208118"
                  className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2"
                >
                  +420 721 208 118
                </a>
              </li>
              <li>
                <a
                  href="mailto:monika.zamrazilova@seznam.cz"
                  className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2 break-all"
                >
                  monika.zamrazilova@seznam.cz
                </a>
              </li>
              <li>Císařský ostrov, Praha</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-micro uppercase tracking-caption text-muted-foreground md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()} Jezdecká škola · Císařský ostrov, Praha
          </div>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <div>
        <Hero />
        <div className="border-t border-foreground/8 bg-cream/80">
          <div className="mx-auto max-w-7xl px-6 py-5 md:px-10">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[10.5px] uppercase tracking-caption text-foreground sm:grid-cols-4">
              {heroFeatures.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
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
  );
}
