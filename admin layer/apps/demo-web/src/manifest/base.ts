import type { ContentItem } from "@admin/core";

/**
 * Business data demo aplikace — výchozí obsah.
 * Admin Layer tyto položky nikdy nekopíruje; dostává je pouze
 * jako baseItems uvnitř vyexportovaného manifestu.
 */

const now = "2026-01-01T00:00:00.000Z";

export const baseProjects: ContentItem[] = [
  {
    id: "barberman",
    slug: "barberman",
    status: "published",
    createdAt: now,
    updatedAt: now,
    name: { cs: "Barberman", en: "Barberman" },
    tagline: {
      cs: "Web pro barbershop — rezervace, profese, ceník.",
      en: "Barbershop website — booking, professions, pricing.",
    },
    badge: { cs: "Barber", en: "Barber" },
    poster: "",
    href: "https://barberman.cz",
    external: false,
  },
  {
    id: "tvoje-vyska",
    slug: "tvoje-vyska",
    status: "published",
    createdAt: now,
    updatedAt: now,
    name: { cs: "Tvoje výška", en: "Your Height" },
    tagline: {
      cs: "Kalkulačka výšky a růstové křivky pro rodiče.",
      en: "Height calculator and growth charts for parents.",
    },
    badge: { cs: "Health", en: "Health" },
    poster: "",
    href: "https://tvojevyska.cz",
    external: false,
  },
  {
    id: "recepce-tech",
    slug: "recepce-tech",
    status: "published",
    createdAt: now,
    updatedAt: now,
    name: { cs: "Recepce.tech", en: "Recepce.tech" },
    tagline: {
      cs: "AI hlasový asistent pro firmy — recepce na telefonu.",
      en: "AI voice assistant for businesses — reception on the phone.",
    },
    badge: { cs: "AI", en: "AI" },
    poster: "",
    href: "https://recepce.tech",
    external: false,
  },
];

export const baseProfessions: ContentItem[] = [
  {
    id: "barbar",
    slug: "barbar",
    status: "published",
    createdAt: now,
    updatedAt: now,
    name: "Barbar",
    desc: "Střihy, vousy a ošetření s řemeslným přístupem.",
    tags: ["střih", "vousy", "strojky"],
    colors: { accent: "#1C1C1C", glow1: "#4A4A4A", glow2: "#0E0E0E" },
  },
  {
    id: "kosmeticka",
    slug: "kosmeticka",
    status: "published",
    createdAt: now,
    updatedAt: now,
    name: "Kosmetička",
    desc: "Pleťové rituály a profesionální péče o obličej.",
    tags: ["plet", "ritualy", "pece"],
    colors: { accent: "#8A6B4F", glow1: "#C9A27E", glow2: "#5E4632" },
  },
];

export const basePages: ContentItem[] = [
  {
    id: "o-nas",
    slug: "o-nas",
    status: "published",
    createdAt: now,
    updatedAt: now,
    title: { cs: "O nás", en: "About" },
    body: {
      cs: "Malé studio, které staví weby a AI asistenty. Důraz na řemeslo a přímou komunikaci.",
      en: "A small studio building websites and AI assistants. Craft and direct communication first.",
    },
  },
  {
    id: "kontakt",
    slug: "kontakt",
    status: "published",
    createdAt: now,
    updatedAt: now,
    title: { cs: "Kontakt", en: "Contact" },
    body: {
      cs: "Napište nám na ahoj@demo-web.cz nebo zavolejte na +420 000 000 000.",
      en: "Write to ahoj@demo-web.cz or call +420 000 000 000.",
    },
  },
];

export const baseSite: ContentItem[] = [
  {
    id: "main",
    slug: "main",
    status: "published",
    createdAt: now,
    updatedAt: now,
    siteName: "Demo Web",
    baseUrl: "https://demo-web.example",
    description: {
      cs: "Ukázková aplikace napojená na Admin Layer.",
      en: "Demo application connected to the Admin Layer.",
    },
    keywords: ["demo", "admin layer"],
    contact: { phone: "+420 000 000 000", email: "ahoj@demo-web.cz" },
  },
];
