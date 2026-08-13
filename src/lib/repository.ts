import type { ContentItem } from "@admin/core";
import { manifest } from "../manifest/index";
import publishedJson from "../../../admin layer/content/projects/ponici/store/published.json";

/**
 * Repository webu ponici.cz — čistě business strana.
 *
 * Merges vlastní base obsah (manifest.baseItems) s overrides, které
 * vyprodukoval Admin Layer (admin layer/content/projects/ponici/store/
 * published.json). Web nemá žádný admin kód — jediné napojení je JSON
 * blob publikovaných změn, který si sám zabundluje při buildu.
 */

const overrides = publishedJson as unknown as Record<string, Record<string, ContentItem>>;

function kindDef(kind: string) {
  const def = manifest.kinds.find((k) => k.kind === kind);
  if (!def) throw new Error(`Neznámý druh obsahu: ${kind}`);
  return def;
}

function mergeKind(kind: string): ContentItem[] {
  const def = kindDef(kind);
  const map = overrides[kind] ?? {};
  const merged = new Map<string, ContentItem>();
  for (const base of def.baseItems ?? []) {
    merged.set(base.id, { ...base, ...map[base.id] });
  }
  for (const [id, item] of Object.entries(map)) {
    merged.set(id, item);
  }
  return [...merged.values()];
}

const isDev = process.env.NODE_ENV === "development";

function visible(item: ContentItem): boolean {
  if (item.status === "archived") return false;
  return isDev || item.status === "published";
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) =>
        str(
          typeof x === "object" && x
            ? ((x as { paragraph?: unknown; feature?: unknown }).paragraph ??
                (x as { feature?: unknown }).feature)
            : x,
        ),
      )
    : [];
const objArr = (v: unknown): Record<string, string>[] =>
  Array.isArray(v)
    ? v.map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, str(val)]));
      })
    : [];

export interface SiteContent {
  siteName: string;
  baseUrl: string;
  formspreeId: string;
  phone: string;
  email: string;
  locality: string;
  address: string;
  gps: string;
  mapQuery: string;
  heroKicker: string;
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroFeatures: string[];
  aboutKicker: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  stats: { value: string; label: string }[];
  setkaniKicker: string;
  setkaniImage: string;
  setkaniTitle: string;
  setkaniText: string;
  setkaniCta: string;
  programyKicker: string;
  programyTitle: string;
  programyIntro: string;
  programyParagraph: string;
  programyImage1: string;
  programyImage2: string;
  programyImage3: string;
  programyImage4: string;
  jizdyKicker: string;
  jizdyTitle: string;
  jizdyIntro: string;
  jizdyNote: string;
  serviceCta: string;
  vyletyKicker: string;
  vyletyTitle: string;
  vyletyIntro: string;
  vyletyParagraphs: string[];
  vyletyImageMain: string;
  vyletyImage1: string;
  vyletyImage2: string;
  stajKicker: string;
  stajTitle: string;
  stajParagraphs: string[];
  stajImage: string;
  oslavyKicker: string;
  oslavyTitle: string;
  oslavyText: string;
  oslavyNote: string;
  oslavyCta: string;
  oslavyImage: string;
  pricingKicker: string;
  pricingTitle: string;
  pricingNote: string;
  campKicker: string;
  campTitle: string;
  campParagraphs: string[];
  campCta: string;
  campFormSubject: string;
  galleryKicker: string;
  galleryTitle: string;
  galleryIntro: string;
  galleryImages: { image: string; alt: string }[];
  faqKicker: string;
  faqTitle: string;
  contactKicker: string;
  contactTitle: string;
  contactText: string;
  contactExpandable: string;
  footerDescription: string;
  footerCopyright: string;
  jsonLdDescription: string;
}

export interface ServiceContent {
  id: string;
  icon: string;
  layout: "wide" | "tall" | "split";
  title: string;
  body: string;
  image: string;
}

export interface PriceContent {
  id: string;
  type: "item" | "course";
  name: string;
  title: string;
  price: string;
  note: string;
}

export interface FaqContent {
  id: string;
  question: string;
  answer: string;
}

function firstByKind(kind: string): ContentItem | undefined {
  return mergeKind(kind).find((item) => visible(item));
}

/** Čistý mapper — sdílený s runtime obsahem (admin mód). */
export function siteFromItem(
  item: (Partial<Record<keyof SiteContent, unknown>> & ContentItem) | undefined,
): SiteContent {
  const get = (key: keyof SiteContent): unknown => item?.[key] ?? "";
  return {
    siteName: str(get("siteName")),
    baseUrl: str(get("baseUrl")),
    formspreeId: str(get("formspreeId")),
    phone: str(get("phone")),
    email: str(get("email")),
    locality: str(get("locality")),
    address: str(get("address")),
    gps: str(get("gps")),
    mapQuery: str(get("mapQuery")),
    heroKicker: str(get("heroKicker")),
    heroImage: str(get("heroImage")),
    heroTitle: str(get("heroTitle")),
    heroSubtitle: str(get("heroSubtitle")),
    heroCtaPrimary: str(get("heroCtaPrimary")),
    heroCtaSecondary: str(get("heroCtaSecondary")),
    heroFeatures: strArr(get("heroFeatures")),
    aboutKicker: str(get("aboutKicker")),
    aboutTitle: str(get("aboutTitle")),
    aboutParagraphs: strArr(get("aboutParagraphs")),
    stats: objArr(get("stats")) as { value: string; label: string }[],
    setkaniKicker: str(get("setkaniKicker")),
    setkaniImage: str(get("setkaniImage")),
    setkaniTitle: str(get("setkaniTitle")),
    setkaniText: str(get("setkaniText")),
    setkaniCta: str(get("setkaniCta")),
    programyKicker: str(get("programyKicker")),
    programyTitle: str(get("programyTitle")),
    programyIntro: str(get("programyIntro")),
    programyParagraph: str(get("programyParagraph")),
    programyImage1: str(get("programyImage1")),
    programyImage2: str(get("programyImage2")),
    programyImage3: str(get("programyImage3")),
    programyImage4: str(get("programyImage4")),
    jizdyKicker: str(get("jizdyKicker")),
    jizdyTitle: str(get("jizdyTitle")),
    jizdyIntro: str(get("jizdyIntro")),
    jizdyNote: str(get("jizdyNote")),
    serviceCta: str(get("serviceCta")),
    vyletyKicker: str(get("vyletyKicker")),
    vyletyTitle: str(get("vyletyTitle")),
    vyletyIntro: str(get("vyletyIntro")),
    vyletyParagraphs: strArr(get("vyletyParagraphs")),
    vyletyImageMain: str(get("vyletyImageMain")),
    vyletyImage1: str(get("vyletyImage1")),
    vyletyImage2: str(get("vyletyImage2")),
    stajKicker: str(get("stajKicker")),
    stajTitle: str(get("stajTitle")),
    stajParagraphs: strArr(get("stajParagraphs")),
    stajImage: str(get("stajImage")),
    oslavyKicker: str(get("oslavyKicker")),
    oslavyTitle: str(get("oslavyTitle")),
    oslavyText: str(get("oslavyText")),
    oslavyNote: str(get("oslavyNote")),
    oslavyCta: str(get("oslavyCta")),
    oslavyImage: str(get("oslavyImage")),
    pricingKicker: str(get("pricingKicker")),
    pricingTitle: str(get("pricingTitle")),
    pricingNote: str(get("pricingNote")),
    campKicker: str(get("campKicker")),
    campTitle: str(get("campTitle")),
    campParagraphs: strArr(get("campParagraphs")),
    campCta: str(get("campCta")),
    campFormSubject: str(get("campFormSubject")),
    galleryKicker: str(get("galleryKicker")),
    galleryTitle: str(get("galleryTitle")),
    galleryIntro: str(get("galleryIntro")),
    galleryImages: objArr(get("galleryImages")) as { image: string; alt: string }[],
    faqKicker: str(get("faqKicker")),
    faqTitle: str(get("faqTitle")),
    contactKicker: str(get("contactKicker")),
    contactTitle: str(get("contactTitle")),
    contactText: str(get("contactText")),
    contactExpandable: str(get("contactExpandable")),
    footerDescription: str(get("footerDescription")),
    footerCopyright: str(get("footerCopyright")),
    jsonLdDescription: str(get("jsonLdDescription")),
  };
}

export function serviceFromItem(item: ContentItem): ServiceContent {
  return {
    id: item.id,
    icon: str(item.icon),
    layout: (item.layout === "tall" || item.layout === "split"
      ? item.layout
      : "wide") as ServiceContent["layout"],
    title: str(item.title),
    body: str(item.body),
    image: str(item.image),
  };
}

export function priceFromItem(item: ContentItem): PriceContent {
  return {
    id: item.id,
    type: (item.type === "course" ? "course" : "item") as PriceContent["type"],
    name: str(item.name),
    title: str(item.title),
    price: str(item.price),
    note: str(item.note),
  };
}

export function faqFromItem(item: ContentItem): FaqContent {
  return {
    id: item.id,
    question: str(item.question),
    answer: str(item.answer),
  };
}

export function getSite(): SiteContent {
  return siteFromItem(firstByKind("site"));
}

export function listServices(): ServiceContent[] {
  return mergeKind("service")
    .filter(visible)
    .map((item) => serviceFromItem(item));
}

export function listPrices(): PriceContent[] {
  return mergeKind("price")
    .filter(visible)
    .map((item) => priceFromItem(item));
}

export function listFaqs(): FaqContent[] {
  return mergeKind("faq")
    .filter(visible)
    .map((item) => faqFromItem(item));
}

/** Tel href odvozený z telefonního čísla. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[\s\-()]/g, "")}`;
}
